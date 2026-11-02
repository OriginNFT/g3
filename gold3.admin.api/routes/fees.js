'use strict';

const express = require('express');
const { QueryTypes } = require('sequelize');

const { sequelize } = require('../model');
const { paging } = require('../utils/paging');
const { requirePermission } = require('../middleware/permission');
const { wrap } = require('../utils/asyncRoute');

const router = express.Router();

const MAX_LIMIT = 200;

/**
 * Where the fees went (FeeRouter.FeeRouted, by source and purpose) and what
 * the buybacks did (BuybackExecutor: funded, executed, burnt), newest first.
 * Totals are per token and never summed across tokens.
 */
router.get('/', requirePermission('fees.read'), wrap(async function (req, res) {
    const { limit, offset } = paging(req, { defaultLimit: 50, maxLimit: MAX_LIMIT });

    const method = req.query.method === undefined || String(req.query.method) === '' ? null : String(req.query.method);
    const purpose = req.query.purpose === undefined || String(req.query.purpose) === '' ? null : String(req.query.purpose);

    const conditions = [];
    const replacements = { limit, offset };
    if (method !== null) {
        conditions.push('method = :method');
        replacements.method = method;
    }
    if (purpose !== null) {
        conditions.push('purpose_name = :purpose');
        replacements.purpose = purpose;
    }
    const clause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [routed, buybacks, rows, [counted]] = await Promise.all([
        sequelize.query(
            `SELECT source_name, purpose_name, token, COUNT(*)::int AS count, COALESCE(SUM(amount), 0) AS total
             FROM gold3_fee_records WHERE method = 'FeeRouted'
             GROUP BY source_name, purpose_name, token
             ORDER BY source_name NULLS LAST, purpose_name NULLS LAST, token`,
            { type: QueryTypes.SELECT }
        ),
        sequelize.query(
            `SELECT method, token, token_out, COUNT(*)::int AS count, COALESCE(SUM(amount), 0) AS total, COALESCE(SUM(amount_out), 0) AS total_out
             FROM gold3_fee_records WHERE method IN ('BuybackFunded', 'BuybackExecuted', 'TokensBurned')
             GROUP BY method, token, token_out
             ORDER BY method, token, token_out NULLS LAST`,
            { type: QueryTypes.SELECT }
        ),
        sequelize.query(
            `SELECT id, method, source_name, purpose_name, token, to_address, amount, token_out, amount_out, block, tx, ts
             FROM gold3_fee_records ${clause}
             ORDER BY block DESC, log_index DESC
             LIMIT :limit OFFSET :offset`,
            { replacements, type: QueryTypes.SELECT }
        ),
        sequelize.query(`SELECT COUNT(*)::int AS total FROM gold3_fee_records ${clause}`, { replacements, type: QueryTypes.SELECT }),
    ]);

    return res.json({ routed, buybacks, records: { total: counted.total, limit, offset, method, purpose, rows } });
}));

module.exports = router;
