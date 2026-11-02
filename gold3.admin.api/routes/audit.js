'use strict';

const express = require('express');
const { Op } = require('sequelize');

const { AdminAuditLog } = require('../model');
const { requirePermission } = require('../middleware/permission');
const { wrap } = require('../utils/asyncRoute');

const router = express.Router();

const MAX_LIMIT = 200;

// Read-only, and there is no delete route on purpose: an audit trail somebody
// can tidy up is not an audit trail.
router.get('/', requirePermission('audit.read'), wrap(async function (req, res) {
    const limit = Math.min(Number(req.query.limit) || 50, MAX_LIMIT);
    const offset = Math.max(Number(req.query.offset) || 0, 0);

    const where = {};
    if (req.query.entity) where.entity = String(req.query.entity);
    if (req.query.entityId) where.entity_id = String(req.query.entityId);
    if (req.query.username) where.username = String(req.query.username);
    if (req.query.since) {
        const since = new Date(String(req.query.since));
        if (Number.isNaN(since.getTime())) return res.status(400).json({ error: 'since is not a date' });
        where.created_at = { [Op.gte]: since };
    }

    const { rows, count } = await AdminAuditLog.findAndCountAll({
        where,
        order: [['id', 'DESC']],
        limit,
        offset,
    });

    res.json({ total: count, limit, offset, rows });
}));

module.exports = router;
