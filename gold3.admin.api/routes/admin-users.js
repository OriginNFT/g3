'use strict';

const express = require('express');
const { Op } = require('sequelize');

const { AdminUser, AdminRole } = require('../model');
const { audit } = require('../utils/audit');
const { hashPassword } = require('../utils/password');
const { requirePermission } = require('../middleware/permission');
const { SUPERADMIN_ROLE } = require('../permissions');
const { wrap } = require('../utils/asyncRoute');

const router = express.Router();

// Same rule as scripts/create-admin.js, so an account made here and one made on
// the console are the same kind of thing.
const USERNAME_PATTERN = /^[a-zA-Z0-9._@-]{3,64}$/;

/**
 * The shape an operator is allowed to see - and the shape that goes in the audit
 * log.
 *
 * Never the whole row: password_hash and totp_secret are in it, and GP's panel
 * shipping the password column to the browser is exactly the mistake this
 * projection exists to make impossible.
 */
function publicUser(user) {
    return {
        id: Number(user.id),
        username: user.username,
        role: user.role,
        enabled: user.enabled,
        // Derived the same way the login route derives it: an account that has
        // never spent a code has never finished binding an authenticator.
        totpBound: Number(user.totp_last_counter) > 0,
        lastLoginAt: user.last_login_at,
        lastLoginIp: user.last_login_ip,
        createdAt: user.created_at,
    };
}

async function roleExists(name) {
    if (name === SUPERADMIN_ROLE) return true;
    return Boolean(await AdminRole.findByPk(name));
}

/**
 * How many enabled accounts still hold the built-in role, ignoring one id.
 *
 * The lockout guard: disabling the last one, or moving it to a lesser role,
 * would leave a panel nobody can administer - and the only way back would be a
 * database edit by hand.
 */
async function otherEnabledSuperadmins(exceptId) {
    return AdminUser.count({
        where: { role: SUPERADMIN_ROLE, enabled: true, id: { [Op.ne]: exceptId } },
    });
}

router.get('/', requirePermission('admin.users.read'), wrap(async function (req, res) {
    const users = await AdminUser.findAll({ order: [['username', 'ASC']] });
    res.json(users.map(publicUser));
}));

router.post('/', requirePermission('admin.users.write'), wrap(async function (req, res) {
    const { username, password, role } = req.body || {};

    if (typeof username !== 'string' || !USERNAME_PATTERN.test(username)) {
        return res.status(400).json({
            error: 'username must be 3-64 characters of letters, digits, dot, underscore, dash or at-sign',
        });
    }
    if (typeof role !== 'string' || !(await roleExists(role))) {
        return res.status(400).json({ error: 'no such role' });
    }
    if (await AdminUser.findOne({ where: { username } })) {
        return res.status(409).json({ error: 'that username is taken' });
    }

    let passwordHash;
    try {
        passwordHash = await hashPassword(password);
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }

    // No TOTP secret is issued here, the same as on the console: the account is
    // created unbound, and their first password sign-in hands them a secret in
    // their own browser. A secret minted here would have to travel to them
    // somehow, and every route it could take is worse.
    const user = await AdminUser.create({
        username,
        password_hash: passwordHash,
        totp_secret: '',
        totp_last_counter: 0,
        role,
        enabled: true,
    });

    await audit(req, { action: 'create', entity: 'admin_user', entityId: username, after: publicUser(user) });
    console.log(`[ACCESS] ${req.admin.username} created operator "${username}" with role "${role}"`);

    return res.status(201).json(publicUser(user));
}));

router.put('/:username', requirePermission('admin.users.write'), wrap(async function (req, res) {
    const { username } = req.params;
    const user = await AdminUser.findOne({ where: { username } });
    if (!user) return res.status(404).json({ error: 'no such account' });

    const { role, enabled, password } = req.body || {};
    const before = publicUser(user);
    const patch = {};

    if (role !== undefined) {
        if (typeof role !== 'string' || !(await roleExists(role))) {
            return res.status(400).json({ error: 'no such role' });
        }
        patch.role = role;
    }
    if (enabled !== undefined) {
        if (typeof enabled !== 'boolean') return res.status(400).json({ error: 'enabled must be true or false' });
        patch.enabled = enabled;
    }
    if (password !== undefined) {
        try {
            patch.password_hash = await hashPassword(password);
        } catch (err) {
            return res.status(400).json({ error: err.message });
        }
    }

    if (Object.keys(patch).length === 0) return res.status(400).json({ error: 'nothing to update' });

    // Losing the last administrator is the one change that cannot be undone
    // from inside the panel.
    const losesSuperadmin =
        (patch.role !== undefined && user.role === SUPERADMIN_ROLE && patch.role !== SUPERADMIN_ROLE) ||
        (patch.enabled === false && user.role === SUPERADMIN_ROLE);
    if (losesSuperadmin && (await otherEnabledSuperadmins(user.id)) === 0) {
        return res.status(409).json({ error: 'this is the last enabled administrator - promote someone else first' });
    }

    await user.update(patch);
    await audit(req, {
        action: 'update',
        entity: 'admin_user',
        entityId: username,
        before,
        after: publicUser(user),
    });
    // Named individually so the log line answers "what changed" without a diff.
    const changed = Object.keys(patch).map((key) => (key === 'password_hash' ? 'password' : key));
    console.log(`[ACCESS] ${req.admin.username} updated operator "${username}": ${changed.join(', ')}`);

    return res.json(publicUser(user));
}));

module.exports = router;
