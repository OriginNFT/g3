'use strict';
require('dotenv').config();

/**
 * Oracle updater keeper.
 *
 * Keeps the OracleAdapter TWAPs fresh. OracleAdapter.update() is
 * permissionless and walks every registered token: a token whose last
 * observation is at least twapWindowSeconds old gets a new TWAP
 * (PriceUpdated) and a new observation; the others are skipped. Nothing else
 * calls it, so without this keeper every priceUSDT() consumer (power,
 * NFT rights, tiers, claims, buyback quotes) would read a stale window.
 *
 * Cadence gate:  chain head timestamp >= observations(token).lastTimestamp +
 *                twapWindowSeconds for at least one registered token.
 * Idempotency:   on chain - update() inside the window is a no-op per token,
 *                so a duplicate call only costs gas. Nothing in Redis.
 *
 * Usage:
 *   node keepers/oracle-updater.js              run
 *   node keepers/oracle-updater.js --dry-run    read + decide, send nothing
 *
 * Env: ORACLE_UPDATER_PK (any funded wallet - the call is permissionless, the
 *      key only pays gas), plus the shared KEEPER_* variables (utils/keeper.js).
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
    eventsOf,
    runTickLoop,
} = require('../utils/keeper');

const SERVICE_NAME = 'oracle-updater';

const DRY_RUN = isDryRun();

const ORACLE_ABI = [
    'function twapWindowSeconds() view returns (uint256)',
    'function pricedTokenCount() view returns (uint256)',
    'function pricedTokens(uint256) view returns (address)',
    'function observations(address) view returns (address pair, address quote, bool baseIsToken0, uint256 lastCumulative, uint256 lastTimestamp, uint256 lastTwap, bool lastLive)',
    'function update()',
    'event PriceUpdated(address indexed token, uint256 price, uint256 timestamp)',
];

let provider = null;
let wallet = null;
let oracle = null;

function log(message) {
    console.log(`[${SERVICE_NAME}]${DRY_RUN ? ' [DRY-RUN]' : ''} ${message}`);
}

function warn(message) {
    console.warn(`[${SERVICE_NAME}]${DRY_RUN ? ' [DRY-RUN]' : ''} ${message}`);
}

function value(raw) {
    return `${formatUnits(raw, config.VALUE_DECIMALS)} (${raw.toString()})`;
}

// Every registered token with its observation, in registration order.
async function readTokens() {
    const count = Number(await oracle.pricedTokenCount());
    const tokens = [];
    for (let i = 0; i < count; i++) {
        const token = await oracle.pricedTokens(i);
        const o = await oracle.observations(token);
        tokens.push({ token, lastTimestamp: o.lastTimestamp, lastTwap: o.lastTwap, lastLive: o.lastLive });
    }
    return tokens;
}

async function tick(status) {
    const head = await provider.getBlock('latest');
    if (!head) throw new Error('provider returned no latest block');
    // Chain time, not the wall clock: the contract measures the window on
    // block.timestamp.
    const now = BigInt(head.timestamp);
    status.latestChainBlock = head.number;
    status.currentBlock = head.number;
    status.lastBlock = head.number;

    const window = await oracle.twapWindowSeconds();
    const tokens = await readTokens();
    status.customStatus.twapWindowSeconds = window.toString();
    status.customStatus.tokens = tokens.map((t) => ({
        token: t.token,
        lastTimestamp: t.lastTimestamp.toString(),
        lastTwap: t.lastTwap.toString(),
        lastTwapReadable: formatUnits(t.lastTwap, config.VALUE_DECIMALS),
        lastLive: t.lastLive,
    }));

    if (tokens.length === 0) {
        warn('no token registered on the OracleAdapter (setPair has not run) - nothing to update');
        return false;
    }

    const due = tokens.filter((t) => now >= t.lastTimestamp + window);
    if (due.length === 0) {
        const soonest = tokens.reduce((a, b) => (a.lastTimestamp < b.lastTimestamp ? a : b));
        const remaining = soonest.lastTimestamp + window - now;
        status.customStatus.dueInSeconds = remaining.toString();
        log(
            `window not elapsed - ${remaining}s remaining (earliest observation ${protocolTime.formatSgt(soonest.lastTimestamp)}, ` +
                `window ${window}s, ${tokens.length} token(s))`
        );
        return false;
    }
    status.customStatus.dueInSeconds = '0';

    if (DRY_RUN) {
        for (const t of due) {
            log(`would update() - ${t.token}: ${now - t.lastTimestamp}s since the last observation (window ${window}s, lastTwap=${value(t.lastTwap)})`);
        }
        return false;
    }

    const overrides = await resolveGasOverrides(provider);
    const tx = await oracle.update(overrides);
    log(`OracleAdapter.update() for ${due.length} due token(s) tx=${tx.hash}, waiting`);
    const receipt = await tx.wait();
    if (receipt.status !== 1) throw new Error(`update(): ${tx.hash} reverted`);

    const updated = eventsOf(oracle, receipt, 'PriceUpdated');
    for (const ev of updated) {
        log(`TWAP updated: token=${ev.args.token} price=${value(ev.args.price)} at ${protocolTime.formatSgt(ev.args.timestamp)} tx=${tx.hash}`);
    }
    for (const t of due) {
        if (!updated.some((ev) => ev.args.token === t.token)) {
            // The observation moved but no price was recorded: the previous
            // observation was taken on an empty pair (no TWAP yet), or another
            // caller updated first and this call landed inside the fresh window.
            warn(`update() landed in ${tx.hash} without a PriceUpdated event for ${t.token} (previous observation live=${t.lastLive})`);
        }
    }

    status.customStatus.lastUpdateTx = tx.hash;
    status.customStatus.lastUpdatedAt = new Date().toISOString();
    status.customStatus.lastUpdatedTokens = updated.map((ev) => ev.args.token);
    return false;
}

async function start() {
    await ready;

    provider = await createProvider();
    // A dry run needs no key: reads go through the provider and nothing is sent.
    wallet = createWallet('ORACLE_UPDATER_PK', { provider });
    const runner = wallet || provider;

    const oracleAddress = config.addressOf('ORACLE_ADAPTER_ADDRESS');
    oracle = new Contract(oracleAddress, ORACLE_ABI, runner);

    log(
        `network=${config.NETWORK} rpc=${config.rpcUrl} signer=${wallet ? wallet.address : 'none (dry-run)'} ` +
            `oracle=${oracleAddress} tick=${TICK_INTERVAL_SECONDS}s`
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
