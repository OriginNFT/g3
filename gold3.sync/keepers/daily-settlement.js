'use strict';
require('dotenv').config();

/**
 * Daily settlement keeper.
 *
 * Closes protocol days on chain. EmissionController.settleUpTo(maxDays)
 * settles day lastSettledDay + 1 onwards, strictly in order and only for a
 * day that has fully elapsed: it computes the day's budget from the phase
 * curve, hands the holding half to ComputingVault and the community half to
 * CommunityEngine, and routes what no position could receive to the
 * InsuranceTreasury, in one transaction per day. The chain itself is the
 * idempotency key: a second settlement of the same day cannot exist and an
 * early call settles nothing. No Redis state.
 *
 * Genesis. Nothing can be settled while EmissionController.genesisTimestamp()
 * is 0: the keeper re-reads it every tick until setGenesis() has run, then
 * mirrors the day model off chain (utils/protocolTime.js).
 *
 * Cadence gate:  protocolTime.dayEnded(lastSettledDay + 1) against the chain
 *                head timestamp; up to SETTLE_MAX_DAYS_PER_TICK days per
 *                settleUpTo() call, then straight on to the next tick while
 *                more are due.
 * Idempotency:   on chain (EmissionController.lastSettledDay). Nothing in Redis.
 *
 * Usage:
 *   node keepers/daily-settlement.js              run
 *   node keepers/daily-settlement.js --dry-run    read + decide, send nothing
 *
 * Env: SETTLEMENT_PK (the wallet holding KEEPER_ROLE on EmissionController),
 *      SETTLE_MAX_DAYS_PER_TICK (default 3), plus the shared KEEPER_*
 *      variables (utils/keeper.js).
 */

const { Contract, formatUnits } = require('ethers');

const config = require('../config');
const { ready } = require('../model');
const protocolTime = require('../utils/protocolTime');
const {
    TICK_INTERVAL_SECONDS,
    isDryRun,
    createProvider,
    createWallet,
    resolveGasOverrides,
    assertRole,
    eventsOf,
    runTickLoop,
} = require('../utils/keeper');

const SERVICE_NAME = 'daily-settlement';

const DRY_RUN = isDryRun();

const EMISSION_ABI = [
    'function genesisTimestamp() view returns (uint256)',
    'function lastSettledDay() view returns (uint256)',
    'function currentDay() view returns (uint256)',
    'function hasRole(bytes32 role, address account) view returns (bool)',
    'function settleUpTo(uint256 maxDays) returns (uint256 settled)',
    'event DailySettled(uint256 indexed dayId, uint256 dayBudget, uint256 holdingAmount, uint256 communityAmount, uint256 unusedAmount)',
];

function num(name, fallback) {
    const raw = process.env[name];
    if (raw === undefined || raw === '') return fallback;
    const value = Number(raw);
    if (!Number.isFinite(value)) throw new Error(`env ${name} is not a number: ${raw}`);
    return value;
}

const MAX_DAYS_PER_TICK = num('SETTLE_MAX_DAYS_PER_TICK', 3);
if (!Number.isInteger(MAX_DAYS_PER_TICK) || MAX_DAYS_PER_TICK < 1) {
    throw new Error(`env SETTLE_MAX_DAYS_PER_TICK must be an integer >= 1, got ${MAX_DAYS_PER_TICK}`);
}

let provider = null;
let wallet = null;
let emission = null;
let genesisReady = false;

function log(message) {
    console.log(`[${SERVICE_NAME}]${DRY_RUN ? ' [DRY-RUN]' : ''} ${message}`);
}

function warn(message) {
    console.warn(`[${SERVICE_NAME}]${DRY_RUN ? ' [DRY-RUN]' : ''} ${message}`);
}

function gg(raw) {
    return `${formatUnits(raw, config.GG_DECIMALS)} GG`;
}

// Reads the genesis from the chain once it is set and initialises the day
// model. Returns false while setGenesis() has not run.
async function ensureGenesis(status) {
    if (genesisReady) return true;
    const genesis = await emission.genesisTimestamp();
    status.customStatus.genesisTimestamp = genesis.toString();
    if (genesis === 0n) {
        warn('EmissionController.genesisTimestamp() is 0 - setGenesis() has not run, nothing to settle');
        return false;
    }
    protocolTime.init(genesis);
    genesisReady = true;
    log(`genesis=${protocolTime.formatSgt(genesis)} (day 1 starts there, days end at SGT 12:00)`);
    return true;
}

// Settle from day `next` on, up to MAX_DAYS_PER_TICK days. Returns the number
// of days the receipt reports settled.
async function settleFrom(next, status) {
    if (DRY_RUN) {
        log(`would settleUpTo(${MAX_DAYS_PER_TICK}) from day ${next} (ended ${protocolTime.formatSgt(protocolTime.dayEnd(next))})`);
        return 0;
    }

    const overrides = await resolveGasOverrides(provider);
    const tx = await emission.settleUpTo(MAX_DAYS_PER_TICK, overrides);
    log(`EmissionController.settleUpTo(${MAX_DAYS_PER_TICK}) from day ${next} tx=${tx.hash}, waiting`);
    const receipt = await tx.wait();
    if (receipt.status !== 1) throw new Error(`settleUpTo(${MAX_DAYS_PER_TICK}) from day ${next}: ${tx.hash} reverted`);

    const settled = eventsOf(emission, receipt, 'DailySettled');
    for (const ev of settled) {
        const day = Number(ev.args.dayId);
        log(
            `day ${day} settled (${protocolTime.formatSgt(protocolTime.dayStart(day))} .. ${protocolTime.formatSgt(protocolTime.dayEnd(day))}) ` +
                `budget=${gg(ev.args.dayBudget)} holding=${gg(ev.args.holdingAmount)} community=${gg(ev.args.communityAmount)} ` +
                `unused=${gg(ev.args.unusedAmount)} tx=${tx.hash}`
        );
    }
    if (settled.length === 0) {
        warn(`settleUpTo landed in ${tx.hash} but settled no day (another caller settled first?)`);
    }

    // Read back rather than trusted: the counter is the on-chain truth.
    const lastSettledDay = Number(await emission.lastSettledDay());
    if (settled.length > 0 && lastSettledDay < next + settled.length - 1) {
        throw new Error(`lastSettledDay reads ${lastSettledDay} after ${tx.hash}, expected >= ${next + settled.length - 1}`);
    }

    status.customStatus.lastSettledDay = lastSettledDay;
    status.customStatus.lastSettleTx = tx.hash;
    status.customStatus.lastSettledAt = new Date().toISOString();
    return settled.length;
}

async function tick(status) {
    const head = await provider.getBlock('latest');
    if (!head) throw new Error('provider returned no latest block');
    // Chain time, not the wall clock: the contract judges "day ended" on
    // block.timestamp, and a send a few seconds ahead of the chain settles nothing.
    const now = Number(head.timestamp);
    status.latestChainBlock = head.number;
    status.currentBlock = head.number;
    status.lastBlock = head.number;

    if (!(await ensureGenesis(status))) return false;

    const lastSettledDay = Number(await emission.lastSettledDay());
    const next = lastSettledDay + 1;
    status.customStatus.lastSettledDay = lastSettledDay;
    status.customStatus.nextDay = next;
    status.customStatus.currentDay = protocolTime.currentDay(now);

    if (!protocolTime.dayEnded(next, now)) {
        const remaining = protocolTime.dayEnd(next) - now;
        status.customStatus.nextDayDueInSeconds = remaining;
        log(
            `day ${next} ends at ${protocolTime.formatSgt(protocolTime.dayEnd(next))} - ${remaining}s remaining, ` +
                `nothing to settle (lastSettledDay=${lastSettledDay})`
        );
        return false;
    }
    status.customStatus.nextDayDueInSeconds = 0;

    const settledCount = await settleFrom(next, status);
    if (settledCount === 0) return false;

    // Straight on to the next tick when another day is already due.
    const more = protocolTime.dayEnded(next + settledCount, now);
    if (more) {
        log(`settled ${settledCount} day(s) this tick (cap ${MAX_DAYS_PER_TICK}), day ${next + settledCount} is also due - continuing`);
    }
    return more;
}

async function start() {
    await ready;

    provider = await createProvider();
    // A dry run needs no key: reads go through the provider and nothing is sent.
    wallet = createWallet('SETTLEMENT_PK', { provider });
    const runner = wallet || provider;

    const emissionAddress = config.addressOf('EMISSION_CONTROLLER_ADDRESS');
    emission = new Contract(emissionAddress, EMISSION_ABI, runner);

    await assertRole(emission, 'KEEPER_ROLE', wallet ? wallet.address : null, 'the EmissionController KEEPER_ROLE grant script');

    log(
        `network=${config.NETWORK} rpc=${config.rpcUrl} signer=${wallet ? wallet.address : 'none (dry-run)'} ` +
            `emission=${emissionAddress} maxDaysPerTick=${MAX_DAYS_PER_TICK} tick=${TICK_INTERVAL_SECONDS}s`
    );

    await runTickLoop({ serviceName: SERVICE_NAME, tick });
}

if (require.main === module) {
    start().catch((err) => {
        console.error(`[FATAL] ${SERVICE_NAME}:`, err.message, err);
        process.exit(1);
    });
}

module.exports = { start };
