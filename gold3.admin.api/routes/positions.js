'use strict';

const express = require('express');
const { QueryTypes } = require('sequelize');

const { sequelize } = require('../model');
const { paging } = require('../utils/paging');
const { validAddress } = require('../utils/address');
const { requirePermission } = require('../middleware/permission');
const { wrap } = require('../utils/asyncRoute');

const router = express.Router();

const MAX_LIMIT = 200;

/**
 * The power positions (gold3_position_records, method PositionCreated),
 * newest first, with the running totals by asset. `amount` is the power
 * (1e18 = 1 USDT of power), `input_amount` the asset paid or burnt in its
 * own decimals, `usdt_value` the TWAP value it was priced at.
 */
router.get('/', requirePermission('positions.read'), wrap(async function (req, res) {
    const { limit, offset } = paging(req, { defaultLimit: 50, maxLimit: MAX_LIMIT });

    const conditions = ["method = 'PositionCreated'"];
    const replacements = { limit, offset };
    if (req.query.address) {
        const address = validAddress(req.query.address);
        if (!address) return res.status(400).json({ error: 'not a valid address' });
        conditions.push('address = :address');
        replacements.address = address;
    }
    if (req.query.asset) {
        const asset = validAddress(req.query.asset);
        if (!asset) return res.status(400).json({ error: 'not a valid asset address' });
        conditions.push('asset = :asset');
        replacements.asset = asset;
    }
    const clause = `WHERE ${conditions.join(' AND ')}`;

    const [byAsset, rows, [counted]] = await Promise.all([
        sequelize.query(
            `SELECT asset, COUNT(*)::int AS count, COUNT(DISTINCT address)::int AS owners,
                    COALESCE(SUM(amount), 0) AS power, COALESCE(SUM(input_amount), 0) AS input, COALESCE(SUM(usdt_value), 0) AS usdt_value
             FROM gold3_position_records WHERE method = 'PositionCreated'
             GROUP BY asset ORDER BY asset`,
            { type: QueryTypes.SELECT }
        ),
        sequelize.query(
            `SELECT id, position_id, address, asset, input_amount, usdt_value, amount AS power, block, tx, ts
             FROM gold3_position_records ${clause}
             ORDER BY block DESC, log_index DESC
             LIMIT :limit OFFSET :offset`,
            { replacements, type: QueryTypes.SELECT }
        ),
        sequelize.query(`SELECT COUNT(*)::int AS total FROM gold3_position_records ${clause}`, {
            replacements,
            type: QueryTypes.SELECT,
        }),
    ]);

    return res.json({ byAsset, positions: { total: counted.total, limit, offset, rows } });
}));

/**
 * The holding reward side: what each day distributed (gold3_holding_days)
 * and the claims (HoldingRewardClaimed), newest first.
 */
router.get('/holding', requirePermission('positions.read'), wrap(async function (req, res) {
    const { limit, offset } = paging(req, { defaultLimit: 50, maxLimit: MAX_LIMIT });

    const [days, claims, [counted]] = await Promise.all([
        sequelize.query(
            `SELECT day, amount, block, tx, ts FROM gold3_holding_days WHERE method = 'HoldingRewardNotified'
             ORDER BY day DESC LIMIT 60`,
            { type: QueryTypes.SELECT }
        ),
        sequelize.query(
            `SELECT id, address, amount, block, tx, ts FROM gold3_position_records WHERE method = 'HoldingRewardClaimed'
             ORDER BY block DESC, log_index DESC LIMIT :limit OFFSET :offset`,
            { replacements: { limit, offset }, type: QueryTypes.SELECT }
        ),
        sequelize.query(`SELECT COUNT(*)::int AS total FROM gold3_position_records WHERE method = 'HoldingRewardClaimed'`, {
            type: QueryTypes.SELECT,
        }),
    ]);

    return res.json({ days, claims: { total: counted.total, limit, offset, rows: claims } });
}));

module.exports = router;
