'use strict';

const express = require('express');
const { QueryTypes } = require('sequelize');

const { sequelize } = require('../model');
const { paging } = require('../utils/paging');
const { requirePermission } = require('../middleware/permission');
const { wrap } = require('../utils/asyncRoute');

const router = express.Router();

const MAX_LIMIT = 200;

// Four contracts, one table (gold3_treasury_flows), keyed by `contract`:
//   INSURANCE_TREASURY  GG credited under a tag (TreasuryCredited) and paid out
//                       (TreasuryPaid, LP_AIRDROP)
//   RESERVE_VAULT       the 95% USDT of every participation (ReserveDeposited)
//                       and the admin's withdrawals (ReserveWithdrawn, memo)
//   PROTECTION_VAULT    the 5% USDT (ProtectionDeposited), the whitelist's
//                       market buys (ProtectionBuyExecuted) and the admin's
//                       withdrawals (ProtectionWithdrawn, memo)
//   ALLOCATION_VAULT    the three once-only releases of the 84M (AllocationReleased)
const CONTRACTS = ['INSURANCE_TREASURY', 'RESERVE_VAULT', 'PROTECTION_VAULT', 'ALLOCATION_VAULT'];

/**
 * What each contract took in and paid out, and the flows behind it.
 *
 * Totals are grouped by contract, method and token, never summed across
 * tokens: every total is DECIMAL(78,18) in its own token's units. They
 * attribute what ARRIVED under a tag, never what remains - the live balances
 * are read from the chain by the panel's contract pages, not here.
 *
 * `contract` and `tag` filter the flow list only; the totals always describe
 * the whole table.
 */
router.get('/', requirePermission('treasury.read'), wrap(async function (req, res) {
    const { limit, offset } = paging(req, { defaultLimit: 50, maxLimit: MAX_LIMIT });

    const contract = req.query.contract === undefined || String(req.query.contract) === '' ? null : String(req.query.contract);
    if (contract !== null && !CONTRACTS.includes(contract)) {
        return res.status(400).json({ error: `unknown contract, expected one of: ${CONTRACTS.join(', ')}` });
    }
    const tag = req.query.tag === undefined || String(req.query.tag) === '' ? null : String(req.query.tag);

    const conditions = [];
    const replacements = { limit, offset };
    if (contract !== null) {
        conditions.push('contract = :contract');
        replacements.contract = contract;
    }
    if (tag !== null) {
        conditions.push('tag_name = :tag');
        replacements.tag = tag;
    }
    const clause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [totals, byTag, rows, [counted]] = await Promise.all([
        sequelize.query(
            `SELECT contract, method, token, COUNT(*)::int AS count, COALESCE(SUM(amount), 0) AS total
             FROM gold3_treasury_flows
             GROUP BY contract, method, token
             ORDER BY contract ASC, method ASC, token ASC`,
            { type: QueryTypes.SELECT }
        ),
        sequelize.query(
            `SELECT contract, method, token, tag_name, COUNT(*)::int AS count, COALESCE(SUM(amount), 0) AS total
             FROM gold3_treasury_flows
             GROUP BY contract, method, token, tag_name
             ORDER BY contract ASC, method ASC, token ASC, tag_name ASC NULLS LAST`,
            { type: QueryTypes.SELECT }
        ),
        sequelize.query(
            `SELECT id, contract, method, token, address, amount, amount_raw, source_tag, tag_name, memo,
                    path, token_out, amount_out, block, tx, log_index, ts
             FROM gold3_treasury_flows
             ${clause}
             ORDER BY block DESC, log_index DESC
             LIMIT :limit OFFSET :offset`,
            { replacements, type: QueryTypes.SELECT }
        ),
        sequelize.query(`SELECT COUNT(*)::int AS total FROM gold3_treasury_flows ${clause}`, {
            replacements,
            type: QueryTypes.SELECT,
        }),
    ]);

    return res.json({
        contracts: CONTRACTS,
        totals,
        byTag,
        flows: { total: counted.total, limit, offset, contract, tag, rows },
    });
}));

module.exports = router;
