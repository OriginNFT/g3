'use strict';

const config = require('../config');
const { AdminUser, AdminRole } = require('../model');
const { KEYS, SUPERADMIN_ROLE, isKnown, isDangerous } = require('../permissions');
const { verifyCode } = require('../utils/totp');

/**
 * The permission keys a role grants, or null when the role no longer exists.
 *
 * Read fresh on every request rather than taken from the session: a permission
 * removed from a role has to take effect now, not when that operator's session
 * happens to expire. It is one primary-key lookup on a table with a handful of
 * rows.
 */
async function permissionsOf(roleName) {
    if (roleName === SUPERADMIN_ROLE) return KEYS;
    const role = await AdminRole.findByPk(roleName);
    if (!role) return null;
    return Array.isArray(role.permissions) ? role.permissions : [];
}

/**
 * Guard one route with one permission key.
 *
 * The key is checked against the catalogue HERE, at module load, so a typo
 * ('parameters.wirte') stops the service at boot instead of quietly guarding a
 * route with a permission nobody can ever hold.
 */
function requirePermission(key) {
    if (!isKnown(key)) {
        throw new Error(`requirePermission: "${key}" is not in the permission catalogue`);
    }
    const danger = isDangerous(key);

    return async function (req, res, next) {
        try {
            const granted = await permissionsOf(req.admin.role);

            if (granted === null) {
                console.warn(`[PERM] ${req.admin.username} holds role "${req.admin.role}", which no longer exists`);
                return res.status(403).json({ error: 'your role no longer exists - ask an administrator' });
            }

            if (!granted.includes(key)) {
                console.warn(`[PERM] ${req.admin.username} (${req.admin.role}) denied ${key} on ${req.method} ${req.originalUrl}`);
                return res.status(403).json({ error: `permission denied: ${key}` });
            }

            if (danger && !(await consumeCode(req, res, key))) return undefined;

            next();
            return undefined;
        } catch (err) {
            return next(err);
        }
    };
}

/**
 * Spend a fresh TOTP code for a dangerous action.
 *
 * Answers the response itself and returns false when the code is missing or
 * bad. `totpRequired` in the body is what tells the panel to ask for six digits
 * rather than showing a dead-end error.
 *
 * This is the cheap half of four-eyes: it does not prove a second person agreed,
 * but it does prove the account's owner is at the keyboard right now - which a
 * stolen session token alone cannot.
 */
async function consumeCode(req, res, key) {
    const code = req.get('x-totp-code') || (req.body && req.body.totpCode);

    if (typeof code !== 'string' || code.trim() === '') {
        res.status(403).json({ error: `this action needs a verification code: ${key}`, totpRequired: true });
        return false;
    }

    const user = await AdminUser.findByPk(req.admin.userId);
    if (!user || !user.enabled) {
        res.status(403).json({ error: 'this account is disabled' });
        return false;
    }

    const counter = verifyCode(user.totp_secret, code.trim(), { window: config.totpWindow });
    // Same replay rule as signing in: a code is good exactly once, so one seen
    // over a shoulder cannot be spent on a second dangerous action.
    if (counter === null || Number(counter) <= Number(user.totp_last_counter)) {
        console.warn(`[PERM] ${req.admin.username} gave a bad or reused code for ${key}`);
        res.status(403).json({ error: 'that code is not right, or has already been used', totpRequired: true });
        return false;
    }

    await user.update({ totp_last_counter: counter });
    return true;
}

module.exports = { requirePermission, permissionsOf };
