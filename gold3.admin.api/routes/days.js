'use strict';

const express = require('express');
const { QueryTypes } = require('sequelize');

const { sequelize } = require('../model');
const { paging } = require('../utils/paging');
const { requirePermission } = require('../middleware/permission');
const { wrap } = require('../utils/asyncRoute');

const router = express.Router();

// A settled day is the smallest complete unit of this protocol: one
// DailySettled row (EmissionController), one CommunityBudgetAllocated row
// (CommunityEngine), one HoldingRewardNotified row (ComputingVault), and the
// community payout queue that spends the three 30% buckets. This file answers
// "what happened on day N" by putting those next to each other.
//
// Nothing here is computed: every figure is a column gold3.sync wrote from an
// event. DECIMAL columns come back from pg as strings and stay strings; only
// days, blocks and counts become numbers.

function dec(value) {
    return value === null || value === undefined ? null : String(value);
}

function int(value) {
    return value === null || value === undefined ? null : Number(value);
}

// The `:day` path parameter as a positive integer, or null. Day 0 is the
// pre-genesis sentinel and never settles.
function dayParam(raw) {
    const day = Number(raw);
    if (!Number.isInteger(day) || day <= 0) return null;
    return day;
}

/**
 * The settled days, newest first.
 *
 * Driven by gold3_emission_days (method DailySettled): that row is what makes
 * a day settled at all. Everything else is a LEFT JOIN and may be missing
 * while the other listeners catch up.
 */
router.get('/', requirePermission('days.read'), wrap(async function (req, res) {
    const { limit, offset } = paging(req, { defaultLimit: 30, maxLimit: 200 });

    const [{ total }] = await sequelize.query(
        `SELECT COUNT(*)::int AS total FROM gold3_emission_days WHERE method = 'DailySettled'`,
        { type: QueryTypes.SELECT }
    );

    const rows = await sequelize.query(
        `SELECT ed.day, ed.ts, ed.block, ed.tx,
                ed.day_budget, ed.holding_amount, ed.community_amount, ed.unused_amount,
                hd.amount         AS holding_distributed,
                cd.expansion, cd.collaboration, cd.contribution, cd.dao_building, cd.platform,
                cc.credited       AS community_credited,
                cc.leftover       AS community_leftover,
                qd.status         AS queue_status
         FROM gold3_emission_days ed
         LEFT JOIN LATERAL (
             SELECT amount FROM gold3_holding_days h
             WHERE h.day = ed.day AND h.method = 'HoldingRewardNotified'
             ORDER BY h.block DESC, h.log_index DESC LIMIT 1
         ) hd ON TRUE
         LEFT JOIN LATERAL (
             SELECT expansion, collaboration, contribution, dao_building, platform FROM gold3_community_days c
             WHERE c.day = ed.day AND c.method = 'CommunityBudgetAllocated'
             ORDER BY c.block DESC, c.log_index DESC LIMIT 1
         ) cd ON TRUE
         LEFT JOIN LATERAL (
             SELECT credited, leftover FROM gold3_community_days c
             WHERE c.day = ed.day AND c.method = 'CommunityDayClosed'
             ORDER BY c.block DESC, c.log_index DESC LIMIT 1
         ) cc ON TRUE
         LEFT JOIN gold3_community_queue_days qd ON qd.day = ed.day
         WHERE ed.method = 'DailySettled'
         ORDER BY ed.day DESC
         LIMIT :limit OFFSET :offset`,
        { replacements: { limit, offset }, type: QueryTypes.SELECT }
    );

    res.json({
        total,
        limit,
        offset,
        rows: rows.map((row) => ({
            day: int(row.day),
            ts: row.ts,
            block: int(row.block),
            tx: row.tx,
            dayBudget: dec(row.day_budget),
            holdingAmount: dec(row.holding_amount),
            communityAmount: dec(row.community_amount),
            unusedAmount: dec(row.unused_amount),
            holdingDistributed: dec(row.holding_distributed),
            buckets: {
                expansion: dec(row.expansion),
                collaboration: dec(row.collaboration),
                contribution: dec(row.contribution),
                daoBuilding: dec(row.dao_building),
                platform: dec(row.platform),
            },
            communityCredited: dec(row.community_credited),
            communityLeftover: dec(row.community_leftover),
            closed: row.community_credited !== null,
            queueStatus: row.queue_status || null,
        })),
    });
}));

/**
 * One day in full: the settlement rows, the per-bucket credited totals and
 * the queue's state for it.
 */
router.get('/:day', requirePermission('days.read'), wrap(async function (req, res) {
    const day = dayParam(req.params.day);
    if (day === null) return res.status(400).json({ error: 'day must be a positive integer' });

    const [settled] = await sequelize.query(
        `SELECT day, ts, block, tx, day_budget, holding_amount, community_amount, unused_amount
         FROM gold3_emission_days WHERE method = 'DailySettled' AND day = :day
         ORDER BY block DESC, log_index DESC LIMIT 1`,
        { replacements: { day }, type: QueryTypes.SELECT }
    );
    if (!settled) return res.status(404).json({ error: `day ${day} is not settled` });

    const [holding, allocated, closed, credited, queue, queueDay] = await Promise.all([
        sequelize.query(
            `SELECT amount, tx FROM gold3_holding_days WHERE method = 'HoldingRewardNotified' AND day = :day
             ORDER BY block DESC, log_index DESC LIMIT 1`,
            { replacements: { day }, type: QueryTypes.SELECT }
        ),
        sequelize.query(
            `SELECT expansion, collaboration, contribution, dao_building, platform, tx
             FROM gold3_community_days WHERE method = 'CommunityBudgetAllocated' AND day = :day
             ORDER BY block DESC, log_index DESC LIMIT 1`,
            { replacements: { day }, type: QueryTypes.SELECT }
        ),
        sequelize.query(
            `SELECT credited, leftover, tx, ts FROM gold3_community_days WHERE method = 'CommunityDayClosed' AND day = :day
             ORDER BY block DESC, log_index DESC LIMIT 1`,
            { replacements: { day }, type: QueryTypes.SELECT }
        ),
        sequelize.query(
            `SELECT bucket, bucket_name, COUNT(*)::int AS count, COALESCE(SUM(amount), 0) AS total
             FROM gold3_community_credits WHERE method = 'CommunityCredited' AND day = :day
             GROUP BY bucket, bucket_name ORDER BY bucket`,
            { replacements: { day }, type: QueryTypes.SELECT }
        ),
        sequelize.query(
            `SELECT bucket, status, COUNT(*)::int AS count, COALESCE(SUM(amount), 0) AS total
             FROM gold3_community_queue WHERE day = :day
             GROUP BY bucket, status ORDER BY bucket, status`,
            { replacements: { day }, type: QueryTypes.SELECT }
        ),
        sequelize.query(`SELECT day, status, tx, created_at, closed_at FROM gold3_community_queue_days WHERE day = :day`, {
            replacements: { day },
            type: QueryTypes.SELECT,
        }),
    ]);

    res.json({
        day,
        settlement: {
            ts: settled.ts,
            block: int(settled.block),
            tx: settled.tx,
            dayBudget: dec(settled.day_budget),
            holdingAmount: dec(settled.holding_amount),
            communityAmount: dec(settled.community_amount),
            unusedAmount: dec(settled.unused_amount),
        },
        holding: holding[0] ? { distributed: dec(holding[0].amount), tx: holding[0].tx } : null,
        buckets: allocated[0]
            ? {
                  expansion: dec(allocated[0].expansion),
                  collaboration: dec(allocated[0].collaboration),
                  contribution: dec(allocated[0].contribution),
                  daoBuilding: dec(allocated[0].dao_building),
                  platform: dec(allocated[0].platform),
                  tx: allocated[0].tx,
              }
            : null,
        closed: closed[0] ? { credited: dec(closed[0].credited), leftover: dec(closed[0].leftover), tx: closed[0].tx, ts: closed[0].ts } : null,
        credited: credited.map((row) => ({ bucket: int(row.bucket), bucketName: row.bucket_name, count: row.count, total: dec(row.total) })),
        queue: queue.map((row) => ({ bucket: row.bucket, status: row.status, count: row.count, total: dec(row.total) })),
        queueDay: queueDay[0] ? { status: queueDay[0].status, tx: queueDay[0].tx, createdAt: queueDay[0].created_at, closedAt: queueDay[0].closed_at } : null,
    });
}));

module.exports = router;
