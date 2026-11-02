'use strict';
require('dotenv').config();

/**
 * Community accountant keeper.
 *
 * Drains the community payout queue (gold3_community_queue, filled by the
 * off-chain assessment - spec §13 - never by this module), pushing each batch
 * into the engine:
 *
 *   gold3_community_queue -> COMMUNITY_ENGINE_ADDRESS
 *                   CommunityEngine.credit(day, bucket, accounts[], amounts[])
 *
 * and, once every row of a day is on chain, closes the day with closeDay(day)
 * so the uncredited leftover leaves for the InsuranceTreasury
 * (UNUSED_COMMUNITY).
 *
 * credit() is additive. The chain caps a bucket's total against its budget
 * but cannot tell a retry from a second credit - sending a batch twice
 * silently doubles it (until the budget is exhausted). The guard is the
 * queue itself: a batch is marked `sending` together with the nonce it will
 * use BEFORE the transaction goes out, so a crash always leaves an
 * answerable question ("did that nonce land?") rather than an unrecorded
 * send. A batch left `sending` with a hash is resolved automatically from its
 * receipt; one left without a hash blocks the queue until a human says what
 * happened.
 *
 * Batches are homogeneous per (day, bucket), oldest day first, because one
 * transaction carries one bucket. Before the nonce is reserved the batch is
 * checked against the chain - the day is settled, not closed, and credited +
 * batch total fits the bucket's budget - and estimated against the node, so
 * it must fit KEEPER_GAS_LIMIT - so a batch the contract would refuse, or one
 * that would run out of gas, never leaves a `sending` row behind.
 *
 * Closing: a gold3_community_queue_days row is `queued` while its rows are
 * pending or in flight. When no row of the day is left unsent (a day with
 * nothing allocated has no rows at all) the day is marked `sent`, closeDay(day)
 * goes out, and on its receipt the day is `closed` with the hash. A `sent` day
 * found already closed on chain (crash between receipt and status write, or
 * closed by hand) is recorded as closed with the CommunityDayClosed hash from
 * gold3_community_days when the listener has it. A day with a `failed` row is
 * never closed: closing would forfeit that row's budget to the treasury.
 *
 * Cadence gate:  every tick; straight on to the next tick after a send or a
 *                close, idle otherwise.
 * Idempotency:   gold3_community_queue.status (+ nonce) per row,
 *                gold3_community_queue_days.status per day, both backed by
 *                the contract's isClosed(day).
 *
 * Usage:
 *   node keepers/community-accountant.js              run
 *   node keepers/community-accountant.js --dry-run    pick the batch, send nothing
 *
 * Env: ACCOUNTANT_PK (the wallet holding ACCOUNTANT_ROLE on CommunityEngine),
 *      COMMUNITY_BATCH_SIZE (rows per credit(), default 40), plus the shared
 *      KEEPER_* variables (utils/keeper.js).
 */

const { Contract, parseUnits, formatUnits } = require('ethers');
const { Op } = require('sequelize');

const config = require('../config');
const { ready, sequelize, CommunityQueue, CommunityQueueDay, CommunityDay } = require('../model');
const { bucketId } = require('../utils/tags');
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

const SERVICE_NAME = 'community-accountant';

const DRY_RUN = isDryRun();

const ENGINE_ABI = [
    'function credit(uint256 dayId, uint8 bucket, address[] accounts, uint256[] amounts)',
    'function closeDay(uint256 dayId)',
    'function lastSettledDay() view returns (uint256)',
    'function communityBudgetOf(uint256) view returns (uint256)',
    'function bucketBudgetOf(uint256 dayId, uint8 bucket) view returns (uint256)',
    'function bucketCreditedOf(uint256 dayId, uint8 bucket) view returns (uint256)',
    'function isClosed(uint256) view returns (bool)',
    'function hasRole(bytes32 role, address account) view returns (bool)',
    'event CommunityDayClosed(uint256 indexed dayId, uint256 credited, uint256 leftover)',
];

function num(name, fallback) {
    const raw = process.env[name];
    if (raw === undefined || raw === '') return fallback;
    const value = Number(raw);
    if (!Number.isFinite(value)) throw new Error(`env ${name} is not a number: ${raw}`);
    return value;
}

const BATCH_SIZE = num('COMMUNITY_BATCH_SIZE', 40);

let provider = null;
let wallet = null;
let engine = null;

function log(message) {
    console.log(`[${SERVICE_NAME}]${DRY_RUN ? ' [DRY-RUN]' : ''} ${message}`);
}

function warn(message) {
    console.warn(`[${SERVICE_NAME}]${DRY_RUN ? ' [DRY-RUN]' : ''} ${message}`);
}

function gg(raw) {
    return formatUnits(raw, config.GG_DECIMALS);
}

// ============ recovery ============
// A batch that was mid-flight when the process died. With a hash the chain has
// the answer; without one it does not, and guessing would risk crediting twice.
async function resolveInFlight() {
    const inFlight = await CommunityQueue.findAll({ where: { status: 'sending' }, order: [['id', 'ASC']] });
    if (inFlight.length === 0) return true;

    const withoutHash = inFlight.filter((row) => !row.tx);
    if (withoutHash.length > 0) {
        const sample = withoutHash[0];
        console.error(
            `[${SERVICE_NAME}] ${withoutHash.length} row(s) are marked sending with no transaction hash ` +
                `(day ${sample.day}, bucket ${sample.bucket}, nonce ${sample.nonce}). The queue is blocked. Check whether ` +
                `nonce ${sample.nonce} for the accountant wallet ${wallet ? wallet.address : '(ACCOUNTANT_PK)'} landed ` +
                "on chain: if it did, set those rows to 'sent' with its hash; if it did not, set them back to " +
                "'pending'. Do not guess - credit() is additive."
        );
        return false;
    }

    const byTx = new Map();
    for (const row of inFlight) {
        byTx.set(row.tx, [...(byTx.get(row.tx) || []), row]);
    }

    for (const [hash, rows] of byTx) {
        const receipt = await provider.getTransactionReceipt(hash);
        if (!receipt) {
            log(`${hash} is still unconfirmed, waiting`);
            return false;
        }
        if (receipt.status === 1) {
            await CommunityQueue.update({ status: 'sent', sent_at: new Date() }, { where: { id: rows.map((row) => row.id) } });
            log(`recovered ${rows.length} row(s) from ${hash} as sent`);
        } else {
            await CommunityQueue.update(
                { status: 'failed', error: `transaction ${hash} reverted` },
                { where: { id: rows.map((row) => row.id) } }
            );
            log(`${hash} reverted, ${rows.length} row(s) marked failed`);
        }
    }
    return true;
}

// ============ send ============
// One (day, bucket) per batch, oldest day first.
async function nextBatch() {
    const oldest = await CommunityQueue.findOne({
        where: { status: 'pending' },
        order: [
            ['day', 'ASC'],
            ['id', 'ASC'],
        ],
    });
    if (!oldest) return [];

    return CommunityQueue.findAll({
        where: { status: 'pending', day: oldest.day, bucket: oldest.bucket },
        order: [['id', 'ASC']],
        limit: BATCH_SIZE,
    });
}

// Marks rows failed with `error` (or only says so in a dry run).
async function failRows(rows, error) {
    if (DRY_RUN) {
        warn(`${error} - would mark ${rows.length} row(s) failed`);
        return;
    }
    await CommunityQueue.update({ status: 'failed', error }, { where: { id: rows.map((row) => row.id) } });
    console.error(`[${SERVICE_NAME}] ${error} - ${rows.length} row(s) marked failed (nothing was sent)`);
}

// On-chain preconditions of a batch, checked before the nonce is reserved.
// Returns true when the batch may go out. A transient condition (day not
// settled yet) leaves the rows pending for the next tick; a permanent one
// (day closed, budget exceeded) marks them failed so a human looks instead
// of the keeper retrying the same revert forever.
async function batchAllowed(rows, day, bucket, bucketName, total) {
    const [lastSettledDay, closed, budget, credited] = await Promise.all([
        engine.lastSettledDay(),
        engine.isClosed(day),
        engine.bucketBudgetOf(day, bucket),
        engine.bucketCreditedOf(day, bucket),
    ]);

    if (lastSettledDay < day) {
        warn(`day ${day} is not settled on chain yet (lastSettledDay=${lastSettledDay}) - batch held`);
        return false;
    }
    if (closed) {
        await failRows(rows, `day ${day} is already closed on chain`);
        return false;
    }
    if (credited + total > budget) {
        await failRows(
            rows,
            `batch total ${gg(total)} exceeds the remaining ${bucketName} budget of day ${day} ` +
                `(budget ${gg(budget)}, credited ${gg(credited)})`
        );
        return false;
    }
    log(`day ${day} ${bucketName} on chain: budget=${gg(budget)} credited=${gg(credited)} remaining=${gg(budget - credited)}`);
    return true;
}

async function sendBatch(rows, status) {
    const day = BigInt(rows[0].day);
    const bucketName = rows[0].bucket;
    const bucket = bucketId(bucketName);
    if (bucket > 2) {
        await failRows(rows, `bucket ${bucketName} is credited at settlement, not by the accountant`);
        return false;
    }
    const accounts = rows.map((row) => row.address);
    const amounts = rows.map((row) => parseUnits(String(row.amount), config.GG_DECIMALS));
    const total = amounts.reduce((sum, amount) => sum + amount, 0n);

    log(`day=${day} bucket=${bucketName} batch=${rows.length} total=${gg(total)} GG`);

    if (!(await batchAllowed(rows, day, bucket, bucketName, total))) return false;

    if (DRY_RUN) {
        log('dry run, nothing sent');
        return false;
    }

    // Gas first: a node that returns no fee data must fail here, before any
    // row is marked sending.
    const gas = await resolveGasOverrides(provider);
    // Pre-flight: a batch that would revert or need more than KEEPER_GAS_LIMIT
    // must fail here, before any row is marked sending.
    const estimate = await engine.credit.estimateGas(day, bucket, accounts, amounts);
    if (estimate > BigInt(gas.gasLimit)) {
        throw new Error(
            `credit(day ${day}, ${rows.length} accounts) needs ~${estimate} gas, above KEEPER_GAS_LIMIT ` +
                `${gas.gasLimit} - lower COMMUNITY_BATCH_SIZE (nothing sent, rows stay pending)`
        );
    }

    // Reserved before the send: this is the record that survives a crash.
    const nonce = await provider.getTransactionCount(wallet.address, 'pending');
    const ids = rows.map((row) => row.id);
    await CommunityQueue.update({ status: 'sending', nonce, error: null }, { where: { id: ids } });

    const overrides = { ...gas, nonce };

    let tx;
    try {
        tx = await engine.credit(day, bucket, accounts, amounts, overrides);
    } catch (err) {
        // Nothing went out, so these are safe to retry.
        await CommunityQueue.update(
            { status: 'pending', error: err.message, retry_count: sequelize.literal('retry_count + 1') },
            { where: { id: ids } }
        );
        throw err;
    }

    await CommunityQueue.update({ tx: tx.hash }, { where: { id: ids } });
    log(`tx ${tx.hash} (nonce ${nonce}), waiting`);

    // ethers v6 throws on a reverted transaction; the rows then stay
    // `sending` with the hash and resolveInFlight settles them from the
    // receipt on the next tick.
    const receipt = await tx.wait();
    if (receipt.status !== 1) {
        await CommunityQueue.update({ status: 'failed', error: `transaction ${tx.hash} reverted` }, { where: { id: ids } });
        throw new Error(`${tx.hash} reverted`);
    }

    await CommunityQueue.update({ status: 'sent', sent_at: new Date() }, { where: { id: ids } });
    status.processedEvents += rows.length;
    status.customStatus.lastCreditTx = tx.hash;
    status.customStatus.lastCreditDay = day.toString();
    log(`${rows.length} row(s) of day ${day} ${bucketName} sent in ${tx.hash}`);
    return true;
}

// ============ close ============
// A day is closed once no queue row of it is left unsent (a day with no rows
// closes straight away). closeDay(day) routes the uncredited leftover to the
// InsuranceTreasury and blocks further credits, so it must never run while a
// row is still pending, sending or failed.
async function closeDays(status) {
    const days = await CommunityQueueDay.findAll({
        where: { status: { [Op.in]: ['queued', 'sent'] } },
        order: [['day', 'ASC']],
    });

    let closedSomething = false;
    for (const queueDay of days) {
        const day = BigInt(queueDay.day);

        if (queueDay.status === 'queued') {
            const unsent = await CommunityQueue.count({ where: { day: queueDay.day, status: { [Op.ne]: 'sent' } } });
            if (unsent > 0) continue;
            if (DRY_RUN) {
                log(`would mark day ${day} sent and closeDay(${day})`);
                continue;
            }
            await queueDay.update({ status: 'sent' });
            log(`day ${day}: every queue row sent - closing`);
        }

        if ((await engine.lastSettledDay()) < day) {
            warn(`day ${day} is not settled on chain yet - not closing`);
            continue;
        }

        if (await engine.isClosed(day)) {
            // Closed on chain already: a crash between the closeDay receipt
            // and the status write, or a close by hand. The hash, if the
            // community listener has recorded it, is in gold3_community_days.
            const closedRow = await CommunityDay.findOne({ where: { method: 'CommunityDayClosed', day: queueDay.day } });
            if (DRY_RUN) {
                log(`would record day ${day} as closed (already closed on chain, tx ${closedRow ? closedRow.tx : 'unknown'})`);
                continue;
            }
            await queueDay.update({ status: 'closed', tx: closedRow ? closedRow.tx : null, closed_at: new Date() });
            warn(
                `day ${day} was already closed on chain - recorded as closed ` +
                    `(tx ${closedRow ? closedRow.tx : 'unknown: the community listener has no CommunityDayClosed row for it yet'})`
            );
            closedSomething = true;
            continue;
        }

        const budget = await engine.communityBudgetOf(day);
        if (DRY_RUN) {
            log(`would closeDay(${day}): budget=${gg(budget)}`);
            continue;
        }

        const overrides = await resolveGasOverrides(provider);
        const tx = await engine.closeDay(day, overrides);
        log(`closeDay(${day}) budget=${gg(budget)} tx=${tx.hash}, waiting`);
        const receipt = await tx.wait();
        if (receipt.status !== 1) throw new Error(`closeDay(${day}): ${tx.hash} reverted`);

        await queueDay.update({ status: 'closed', tx: tx.hash, closed_at: new Date() });
        const [closed] = eventsOf(engine, receipt, 'CommunityDayClosed');
        log(
            `day ${day} closed: credited=${closed ? gg(closed.args.credited) : 'n/a'} ` +
                `leftover=${closed ? gg(closed.args.leftover) : 'n/a'} tx=${tx.hash}`
        );
        status.customStatus.lastCloseTx = tx.hash;
        status.customStatus.lastClosedDay = day.toString();
        closedSomething = true;
    }
    return closedSomething;
}

async function tick(status) {
    let more = false;

    if (await resolveInFlight()) {
        const rows = await nextBatch();
        if (rows.length > 0) {
            more = (await sendBatch(rows, status)) || more;
        }
        more = (await closeDays(status)) || more;
    }

    status.customStatus.pending = await CommunityQueue.count({ where: { status: 'pending' } });
    status.customStatus.sending = await CommunityQueue.count({ where: { status: 'sending' } });
    status.customStatus.failed = await CommunityQueue.count({ where: { status: 'failed' } });
    status.customStatus.openDays = await CommunityQueueDay.count({ where: { status: { [Op.in]: ['queued', 'sent'] } } });

    // Straight on to the next batch while there is work; idle otherwise.
    return more;
}

async function start() {
    await ready;

    provider = await createProvider();
    // A dry run needs no key: reads go through the provider and nothing is sent.
    wallet = createWallet('ACCOUNTANT_PK', { provider });
    const runner = wallet || provider;

    const engineAddress = config.addressOf('COMMUNITY_ENGINE_ADDRESS');
    engine = new Contract(engineAddress, ENGINE_ABI, runner);

    log(
        `network=${config.NETWORK} rpc=${config.rpcUrl} accountant=${wallet ? wallet.address : 'none (dry-run)'} ` +
            `engine=${engineAddress} batch=${BATCH_SIZE} tick=${TICK_INTERVAL_SECONDS}s`
    );

    // Fail now rather than one revert per batch forever.
    await assertRole(engine, 'ACCOUNTANT_ROLE', wallet ? wallet.address : null, 'the CommunityEngine ACCOUNTANT_ROLE grant script');
    if (wallet) log(`${wallet.address} holds ACCOUNTANT_ROLE on ${engineAddress}`);

    await runTickLoop({ serviceName: SERVICE_NAME, tick });
}

if (require.main === module) {
    start().catch((err) => {
        console.error(`[FATAL] ${SERVICE_NAME}:`, err.message, err);
        process.exit(1);
    });
}

module.exports = { start };
