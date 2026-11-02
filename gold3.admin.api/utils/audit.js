'use strict';

const { AdminAuditLog } = require('../model');

/**
 * Record a change. Called AFTER the write succeeds, with both sides of it.
 *
 * A failure to write the audit row is logged and swallowed: the change has
 * already happened, and throwing here would report a successful edit as an
 * error and invite the operator to repeat it. The log line is the backstop.
 */
async function audit(req, { action, entity, entityId, before = null, after = null }) {
    try {
        await AdminAuditLog.create({
            admin_user_id: req.admin ? req.admin.userId : null,
            username: req.admin ? req.admin.username : 'unknown',
            action,
            entity,
            entity_id: entityId === undefined || entityId === null ? null : String(entityId),
            before,
            after,
            ip: req.ip || null,
        });
    } catch (err) {
        console.error(
            `[AUDIT] failed to record ${action} ${entity}/${entityId} by ${req.admin && req.admin.username}:`,
            err.message,
            err
        );
    }
}

// Sequelize instances carry a lot of machinery; the audit row wants the values.
function plain(row) {
    return row ? JSON.parse(JSON.stringify(row.get ? row.get({ plain: true }) : row)) : null;
}

module.exports = { audit, plain };
