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
 * One member across every table that names them: power, holding claims,
 * tier, NFT rights, community credits and claims. Every figure is a SUM of
 * what gold3.sync indexed - the live balances (rightsOf, creditsOf,
 * pendingHoldingReward) are read from the chain by the panel.
 */
router.get('/:address', requirePermission('members.read'), wrap(async function (req, res) {
    const address = validAddress(req.params.address);
    if (!address) return res.status(400).json({ error: 'not a valid address' });
    const replacements = { address };

    const [positions, holdingClaimed, tier, tierLocked, rights, community, recentPositions, recentCredits] = await Promise.all([
        sequelize.query(
            `SELECT COUNT(*)::int AS count, COALESCE(SUM(amount), 0) AS power, COALESCE(SUM(usdt_value), 0) AS usdt_value
             FROM gold3_position_records WHERE method = 'PositionCreated' AND address = :address`,
            { replacements, type: QueryTypes.SELECT }
        ),
        sequelize.query(
            `SELECT COUNT(*)::int AS count, COALESCE(SUM(amount), 0) AS total
             FROM gold3_position_records WHERE method = 'HoldingRewardClaimed' AND address = :address`,
            { replacements, type: QueryTypes.SELECT }
        ),
        sequelize.query(
            `SELECT tier_from, tier_to, block, tx, ts FROM gold3_tier_records
             WHERE method = 'TierChanged' AND address = :address ORDER BY block DESC, log_index DESC LIMIT 1`,
            { replacements, type: QueryTypes.SELECT }
        ),
        sequelize.query(
            `SELECT COALESCE(SUM(CASE WHEN method = 'TierStaked' THEN amount ELSE -amount END), 0) AS locked
             FROM gold3_tier_records WHERE method IN ('TierStaked', 'TierUnstaked') AND address = :address`,
            { replacements, type: QueryTypes.SELECT }
        ),
        sequelize.query(
            `SELECT COALESCE(SUM(CASE WHEN method = 'RightsCreated' THEN amount ELSE 0 END), 0) AS created,
                    COALESCE(SUM(CASE WHEN method = 'RightsConsumed' THEN amount ELSE 0 END), 0) AS consumed,
                    COALESCE(SUM(CASE WHEN method = 'CommunityGGClaimed' THEN amount ELSE 0 END), 0) AS gg_claimed
             FROM gold3_rights_records WHERE address = :address`,
            { replacements, type: QueryTypes.SELECT }
        ),
        sequelize.query(
            `SELECT COALESCE(SUM(CASE WHEN method = 'CommunityCredited' THEN amount ELSE 0 END), 0) AS credited,
                    COALESCE(SUM(CASE WHEN method = 'CommunityPaid' THEN amount ELSE 0 END), 0) AS paid
             FROM gold3_community_credits WHERE address = :address`,
            { replacements, type: QueryTypes.SELECT }
        ),
        sequelize.query(
            `SELECT position_id, asset, input_amount, usdt_value, amount AS power, block, tx, ts
             FROM gold3_position_records WHERE method = 'PositionCreated' AND address = :address
             ORDER BY block DESC, log_index DESC LIMIT 20`,
            { replacements, type: QueryTypes.SELECT }
        ),
        sequelize.query(
            `SELECT method, day, bucket_name, amount, block, tx, ts
             FROM gold3_community_credits WHERE address = :address
             ORDER BY block DESC, log_index DESC LIMIT 20`,
            { replacements, type: QueryTypes.SELECT }
        ),
    ]);

    return res.json({
        address,
        power: positions[0],
        holdingClaimed: holdingClaimed[0],
        tier: tier[0] ? { current: Number(tier[0].tier_to), previous: Number(tier[0].tier_from), tx: tier[0].tx, ts: tier[0].ts } : null,
        tierLocked: String(tierLocked[0].locked),
        rights: rights[0],
        community: community[0],
        recentPositions,
        recentCredits,
    });
}));

/**
 * Members by indexed power, highest first - the one list that needs a GROUP
 * BY over the whole positions table, so it is paged and never joined.
 */
router.get('/', requirePermission('members.read'), wrap(async function (req, res) {
    const { limit, offset } = paging(req, { defaultLimit: 50, maxLimit: MAX_LIMIT });

    const [rows, [counted]] = await Promise.all([
        sequelize.query(
            `SELECT address, COUNT(*)::int AS positions, COALESCE(SUM(amount), 0) AS power, MIN(ts) AS first_at, MAX(ts) AS last_at
             FROM gold3_position_records WHERE method = 'PositionCreated'
             GROUP BY address ORDER BY power DESC, address ASC
             LIMIT :limit OFFSET :offset`,
            { replacements: { limit, offset }, type: QueryTypes.SELECT }
        ),
        sequelize.query(`SELECT COUNT(DISTINCT address)::int AS total FROM gold3_position_records WHERE method = 'PositionCreated'`, {
            type: QueryTypes.SELECT,
        }),
    ]);

    return res.json({ total: counted.total, limit, offset, rows });
}));

module.exports = router;
