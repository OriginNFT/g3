'use strict';

const express = require('express');
const { Op, QueryTypes } = require('sequelize');

const { sequelize, CommunityQueue, CommunityQueueDay } = require('../model');
const { audit } = require('../utils/audit');
const { validAddress } = require('../utils/address');
const { paging } = require('../utils/paging');
const { requirePermission } = require('../middleware/permission');
const { wrap } = require('../utils/asyncRoute');

const router = express.Router();

const MAX_LIMIT = 200;
const MAX_ROWS_PER_ENQUEUE = 500;

// The buckets the accountant may credit. DAO_BUILDING and PLATFORM are paid
// to their fixed accounts at settlement and never go through the queue.
const BUCKETS = ['EXPANSION', 'COLLABORATION', 'CONTRIBUTION'];

// One queue, keyed by (day, address, bucket): a row is one member's share of
// one bucket out of one settled day's community budget, `amount` GG at 18
// decimals. keepers/community-accountant.js (gold3.sync) sends it as
// CommunityEngine.credit(day, bucket, accounts[], amounts[]).
const TABLE = 'gold3_community_queue';

// A protocol day as the queue stores it, or null when the input is not one.
// Day 0 is the pre-genesis sentinel and never settles.
function dayOf(value) {
    const day = Number(value);
    if (!Number.isInteger(day) || day < 1) return null;
    return day;
}

// A GG amount as DECIMAL(78,18) text: digits with at most 18 decimals, > 0.
function amountOf(value) {
    const text = typeof value === 'number' ? String(value) : typeof value === 'string' ? value.trim() : '';
    if (!/^\d+(\.\d{1,18})?$/.test(text)) return null;
    if (/^0+(\.0+)?$/.test(text)) return null;
    return text;
}

router.get('/community', requirePermission('queues.read'), wrap(async function (req, res) {
    const { limit, offset } = paging(req, { defaultLimit: 50, maxLimit: MAX_LIMIT });

    const where = {};
    if (req.query.status) where.status = String(req.query.status);
    if (req.query.bucket) where.bucket = String(req.query.bucket);
    // An empty `day` is the panel's "no day filter", not day 0.
    if (req.query.day !== undefined && String(req.query.day).trim() !== '') {
        const day = dayOf(req.query.day);
        if (day === null) return res.status(400).json({ error: 'day must be a positive integer' });
        where.day = day;
    }
    // Case-insensitive on purpose: this is a filter box. The rows themselves
    // hold the checksummed address.
    if (req.query.address) where.address = { [Op.iLike]: String(req.query.address).trim() };

    const { rows, count } = await CommunityQueue.findAndCountAll({
        where,
        order: [['id', 'DESC']],
        limit,
        offset,
    });

    return res.json({ total: count, limit, offset, rows });
}));

// Status counts and the total each status is carrying, plus the days the
// accountant still has to close. `sending` is the one that matters: a batch
// went out and nobody has confirmed what happened to it.
router.get('/community/summary', requirePermission('queues.read'), wrap(async function (req, res) {
    const [byStatus, stuck, days] = await Promise.all([
        sequelize.query(
            `SELECT status, COUNT(*)::int AS count, COALESCE(SUM(amount), 0) AS total
             FROM ${TABLE} GROUP BY status ORDER BY status`,
            { type: QueryTypes.SELECT }
        ),
        sequelize.query(
            `SELECT nonce, tx, MIN(day)::int AS day, COUNT(*)::int AS count, COALESCE(SUM(amount), 0) AS total
             FROM ${TABLE} WHERE status = 'sending'
             GROUP BY nonce, tx ORDER BY nonce`,
            { type: QueryTypes.SELECT }
        ),
        sequelize.query(
            `SELECT day, status, tx, created_at, closed_at FROM gold3_community_queue_days
             ORDER BY day DESC LIMIT 60`,
            { type: QueryTypes.SELECT }
        ),
    ]);

    return res.json({ buckets: BUCKETS, byStatus, stuck, days });
}));

/**
 * Enqueue a settled day's payout rows.
 *
 * The community assessment that produces the amounts is off chain (spec §13);
 * this route is where its result enters the system. Each row is one member's
 * share of one bucket; the bucket's on-chain budget for the day caps the sum
 * the accountant will ever send, and the accountant checks that before every
 * batch - a day whose rows exceed it stalls as `failed`, it never pays more.
 *
 * Body: { day, rows: [{ address, bucket, amount }], note }. The day must be
 * settled (a CommunityBudgetAllocated row exists), not closed on chain, and
 * must not already have a queue header. All rows land together with the
 * header, so a day is either fully decided or absent.
 */
router.post('/community/enqueue', requirePermission('queues.write'), wrap(async function (req, res) {
    const body = req.body || {};
    const day = dayOf(body.day);
    if (day === null) return res.status(400).json({ error: 'day must be a positive integer' });
    if (!Array.isArray(body.rows)) return res.status(400).json({ error: 'rows must be an array' });
    if (body.rows.length > MAX_ROWS_PER_ENQUEUE) {
        return res.status(400).json({ error: `at most ${MAX_ROWS_PER_ENQUEUE} rows per call` });
    }
    const note = typeof body.note === 'string' ? body.note.trim() : '';
    if (note.length < 10) return res.status(400).json({ error: 'note is required - say where the amounts come from (10 characters or more)' });

    const rows = [];
    const seen = new Set();
    for (let i = 0; i < body.rows.length; i++) {
        const entry = body.rows[i] || {};
        const address = validAddress(entry.address);
        if (!address) return res.status(400).json({ error: `rows[${i}]: not a valid address` });
        const bucket = String(entry.bucket || '').toUpperCase();
        if (!BUCKETS.includes(bucket)) return res.status(400).json({ error: `rows[${i}]: bucket must be one of ${BUCKETS.join(', ')}` });
        const amount = amountOf(entry.amount);
        if (amount === null) return res.status(400).json({ error: `rows[${i}]: amount must be a positive GG amount with at most 18 decimals` });
        const key = `${address}:${bucket}`;
        if (seen.has(key)) return res.status(400).json({ error: `rows[${i}]: ${address} ${bucket} appears twice` });
        seen.add(key);
        rows.push({ day, address, bucket, amount, status: 'pending' });
    }

    const [allocated] = await sequelize.query(
        `SELECT expansion, collaboration, contribution FROM gold3_community_days
         WHERE method = 'CommunityBudgetAllocated' AND day = :day LIMIT 1`,
        { replacements: { day }, type: QueryTypes.SELECT }
    );
    if (!allocated) return res.status(409).json({ error: `day ${day} is not settled yet (no CommunityBudgetAllocated row)` });

    const [closed] = await sequelize.query(
        `SELECT 1 FROM gold3_community_days WHERE method = 'CommunityDayClosed' AND day = :day LIMIT 1`,
        { replacements: { day }, type: QueryTypes.SELECT }
    );
    if (closed) return res.status(409).json({ error: `day ${day} is already closed on chain` });

    if (await CommunityQueueDay.findByPk(day)) {
        return res.status(409).json({ error: `day ${day} is already queued - delete its pending rows first, or retry its failed ones` });
    }

    // Budget check in SQL so the DECIMAL arithmetic never touches a JS float.
    const budgets = { EXPANSION: allocated.expansion, COLLABORATION: allocated.collaboration, CONTRIBUTION: allocated.contribution };
    for (const bucket of BUCKETS) {
        const [{ over }] = await sequelize.query(
            `SELECT (SUM(CAST(v AS DECIMAL(78,18))) > CAST(:budget AS DECIMAL(78,18))) AS over
             FROM UNNEST(CAST(:amounts AS TEXT[])) AS v`,
            {
                replacements: { budget: String(budgets[bucket]), amounts: rows.filter((r) => r.bucket === bucket).map((r) => r.amount) },
                type: QueryTypes.SELECT,
            }
        );
        if (over === true) return res.status(400).json({ error: `${bucket} rows exceed the day's ${bucket} budget of ${budgets[bucket]} GG` });
    }

    await sequelize.transaction(async (transaction) => {
        await CommunityQueueDay.create({ day, status: 'queued' }, { transaction });
        if (rows.length > 0) await CommunityQueue.bulkCreate(rows, { transaction });
    });

    await audit(req, {
        action: 'create',
        entity: `${TABLE}_enqueue`,
        entityId: String(day),
        before: null,
        after: { day, count: rows.length, note, rows },
    });
    console.log(`[QUEUE] ${req.admin.username} enqueued ${rows.length} row(s) for day ${day} - ${note}`);

    return res.json({ day, enqueued: rows.length });
}));

/**
 * Drop a day's pending rows (and its header when nothing else is left). Only
 * `pending` rows can go: a sent row is on chain, a sending one is undecided
 * and a failed one is retried or left for the record.
 */
router.delete('/community/day/:day', requirePermission('queues.write'), wrap(async function (req, res) {
    const day = dayOf(req.params.day);
    if (day === null) return res.status(400).json({ error: 'day must be a positive integer' });

    const header = await CommunityQueueDay.findByPk(day);
    if (!header) return res.status(404).json({ error: `day ${day} is not queued` });
    if (header.status !== 'queued') return res.status(409).json({ error: `day ${day} is ${header.status}` });

    const pending = await CommunityQueue.findAll({ where: { day, status: 'pending' } });
    const others = await CommunityQueue.count({ where: { day, status: { [Op.ne]: 'pending' } } });

    await sequelize.transaction(async (transaction) => {
        await CommunityQueue.destroy({ where: { day, status: 'pending' }, transaction });
        if (others === 0) await header.destroy({ transaction });
    });

    await audit(req, {
        action: 'delete',
        entity: `${TABLE}_day`,
        entityId: String(day),
        before: { count: pending.length, rows: pending.map((r) => ({ address: r.address, bucket: r.bucket, amount: String(r.amount) })), headerRemoved: others === 0 },
        after: null,
    });
    console.warn(`[QUEUE] ${req.admin.username} deleted ${pending.length} pending row(s) of day ${day}${others === 0 ? ' and its header' : ''}`);

    return res.json({ day, deleted: pending.length, headerRemoved: others === 0 });
}));

/**
 * Resolve a batch left in `sending`.
 *
 * This is the write that can cost money. CommunityEngine.credit() is purely
 * additive and carries no idempotency key, so the chain cannot tell a retry
 * from a second credit:
 *
 *   outcome=sent     the transaction landed. Rows are closed, nothing is resent.
 *   outcome=pending  the transaction never landed. Rows go back in the queue and
 *                    WILL be sent again - if it actually did land, everyone in
 *                    the batch is credited twice.
 *
 * So the nonce has to be checked on chain first, and the reason is recorded
 * with the change.
 */
router.post('/community/resolve', requirePermission('queues.write'), wrap(async function (req, res) {
    const { nonce, outcome, tx, note } = req.body || {};

    // Number(null), Number('') and Number(false) are all 0, and 0 is a real
    // nonce, so only a number or a non-empty string is a nonce here.
    const nonceValue = typeof nonce === 'number' || (typeof nonce === 'string' && nonce.trim() !== '') ? Number(nonce) : NaN;
    if (!Number.isInteger(nonceValue) || nonceValue < 0) return res.status(400).json({ error: 'nonce is required' });
    if (outcome !== 'sent' && outcome !== 'pending') {
        return res.status(400).json({ error: "outcome must be 'sent' or 'pending'" });
    }
    if (typeof note !== 'string' || note.trim().length < 10) {
        return res.status(400).json({ error: 'note is required - say what you checked on chain (10 characters or more)' });
    }
    if (outcome === 'sent' && !/^0x[0-9a-fA-F]{64}$/.test(String(tx || ''))) {
        return res.status(400).json({ error: 'tx hash is required when marking a batch as sent' });
    }

    const rows = await CommunityQueue.findAll({ where: { status: 'sending', nonce: nonceValue }, order: [['id', 'ASC']] });
    if (rows.length === 0) {
        return res.status(404).json({ error: 'no batch is in flight on that nonce' });
    }

    const [totals] = await sequelize.query(
        `SELECT COUNT(*)::int AS count, COALESCE(SUM(amount), 0) AS total
         FROM ${TABLE} WHERE status = 'sending' AND nonce = :nonce`,
        { replacements: { nonce: nonceValue }, type: QueryTypes.SELECT }
    );

    const before = {
        count: rows.length,
        days: [...new Set(rows.map((row) => String(row.day)))],
        buckets: [...new Set(rows.map((row) => String(row.bucket)))],
        total: String(totals.total),
        tx: rows[0].tx,
    };

    const patch =
        outcome === 'sent'
            ? { status: 'sent', tx: String(tx), sent_at: new Date(), error: null }
            : { status: 'pending', tx: null, nonce: null, error: `resolved back to pending: ${note.trim()}` };

    await CommunityQueue.update(patch, { where: { status: 'sending', nonce: nonceValue } });

    await audit(req, {
        action: 'update',
        entity: `${TABLE}_resolve`,
        entityId: String(nonceValue),
        before,
        after: { outcome, tx: patch.tx || null, note: note.trim() },
    });

    console.warn(
        `[QUEUE] ${req.admin.username} resolved ${TABLE} nonce ${nonceValue} as ${outcome}: ` +
            `${rows.length} row(s), ${before.total} GG, day(s) ${before.days.join(', ')} - ${note.trim()}`
    );

    return res.json({ resolved: rows.length, outcome });
}));

/**
 * Put failed rows back in the queue.
 *
 * Safe in a way resolving is not: a transaction that reverted credited nothing,
 * so resending it cannot pay twice. The accountant picks the rows up on its
 * next tick and re-checks the day on chain before it sends.
 */
router.post('/community/retry', requirePermission('queues.write'), wrap(async function (req, res) {
    const body = req.body || {};
    const where = { status: 'failed' };

    if (body.day !== undefined && String(body.day).trim() !== '') {
        const day = dayOf(body.day);
        if (day === null) return res.status(400).json({ error: 'day must be a positive integer' });
        where.day = day;
    }
    if (body.bucket) where.bucket = String(body.bucket);
    if (body.address) {
        const address = validAddress(body.address);
        if (!address) return res.status(400).json({ error: 'not a valid address' });
        where.address = address;
    }

    const rows = await CommunityQueue.findAll({ where });
    if (rows.length === 0) return res.status(404).json({ error: 'nothing failed matches that' });

    await CommunityQueue.update(
        { status: 'pending', tx: null, nonce: null, error: null, retry_count: sequelize.literal('retry_count + 1') },
        { where }
    );

    await audit(req, {
        action: 'update',
        entity: `${TABLE}_retry`,
        entityId: where.day === undefined ? 'all' : String(where.day),
        before: { count: rows.length, status: 'failed', day: where.day, bucket: where.bucket, address: where.address },
        after: { status: 'pending' },
    });
    console.log(`[QUEUE] ${req.admin.username} requeued ${rows.length} failed row(s) in ${TABLE}`);

    return res.json({ requeued: rows.length });
}));

module.exports = router;
