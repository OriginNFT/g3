'use strict';

const express = require('express');

const { AdminRole, AdminUser } = require('../model');
const { audit, plain } = require('../utils/audit');
const { requirePermission } = require('../middleware/permission');
const { catalogue, isKnown, KEYS, SUPERADMIN_ROLE } = require('../permissions');
const { wrap } = require('../utils/asyncRoute');

const router = express.Router();

// gold3_admin_users.role is STRING(16), so a role name has to fit in it - varchar
// counts characters rather than bytes, so 16 Han characters fit just as 16
// letters do. Han is allowed because the panel's UI language is Traditional
// Chinese (zh-TW); ASCII stays lower case only, since two roles
// differing by case would be two rows that read as one.
//
// \u4e00-\u9fff is CJK Unified Ideographs and \u3400-\u4dbf its Extension A,
// written as escapes rather than as the characters themselves so this file
// stays ASCII like the rest of the service.
const NAME_PATTERN = /^[a-z\u3400-\u4dbf\u4e00-\u9fff][a-z0-9_\-\u3400-\u4dbf\u4e00-\u9fff]{1,15}$/;

// The built-in role, reported alongside the stored ones so the panel can show
// the whole picture. `builtin` marks it read-only: it is defined in code, holds
// everything, and cannot be edited or deleted - that is what guarantees there
// is always a way back in.
function builtinRole(inUse) {
    return {
        name: SUPERADMIN_ROLE,
        description: 'Built-in. Holds every permission, cannot be changed.',
        permissions: KEYS,
        builtin: true,
        inUse,
    };
}

/**
 * Validate a permission list against the catalogue.
 *
 * Unknown keys are rejected rather than dropped: silently ignoring one produces
 * a role that looks like it grants something and does not, which is the failure
 * mode this whole design exists to avoid.
 */
function cleanPermissions(value) {
    if (!Array.isArray(value)) throw new Error('permissions must be an array');
    const unknown = value.filter((key) => typeof key !== 'string' || !isKnown(key));
    if (unknown.length > 0) throw new Error(`unknown permission: ${unknown.join(', ')}`);
    return [...new Set(value)];
}

async function usageCounts() {
    const rows = await AdminUser.findAll({ attributes: ['role', 'enabled'] });
    const counts = new Map();
    for (const row of rows) counts.set(row.role, (counts.get(row.role) || 0) + 1);
    return counts;
}

router.get('/catalogue', requirePermission('admin.roles.read'), function (req, res) {
    res.json(catalogue());
});

router.get('/', requirePermission('admin.roles.read'), wrap(async function (req, res) {
    const counts = await usageCounts();
    const stored = await AdminRole.findAll({ order: [['name', 'ASC']] });
    res.json([
        builtinRole(counts.get(SUPERADMIN_ROLE) || 0),
        ...stored.map((role) => ({
            name: role.name,
            description: role.description,
            permissions: Array.isArray(role.permissions) ? role.permissions : [],
            builtin: false,
            inUse: counts.get(role.name) || 0,
        })),
    ]);
}));

router.post('/', requirePermission('admin.roles.write'), wrap(async function (req, res) {
    const { name, description, permissions } = req.body || {};

    if (typeof name !== 'string' || !NAME_PATTERN.test(name)) {
        return res.status(400).json({
            error: 'name must be 2-16 characters: Han characters, or lower-case letters, digits, dash, underscore',
        });
    }
    if (name === SUPERADMIN_ROLE) {
        return res.status(400).json({ error: 'that name is reserved for the built-in role' });
    }
    if (await AdminRole.findByPk(name)) {
        return res.status(409).json({ error: 'a role with that name already exists' });
    }

    let keys;
    try {
        keys = cleanPermissions(permissions === undefined ? [] : permissions);
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }

    const role = await AdminRole.create({
        name,
        description: typeof description === 'string' ? description.slice(0, 128) : null,
        permissions: keys,
    });

    await audit(req, { action: 'create', entity: 'admin_role', entityId: name, after: plain(role) });
    console.log(`[ACCESS] ${req.admin.username} created role "${name}" with ${keys.length} permission(s)`);

    return res.status(201).json({ name: role.name, description: role.description, permissions: keys });
}));

router.put('/:name', requirePermission('admin.roles.write'), wrap(async function (req, res) {
    const { name } = req.params;
    if (name === SUPERADMIN_ROLE) {
        return res.status(400).json({ error: 'the built-in role cannot be changed' });
    }

    const role = await AdminRole.findByPk(name);
    if (!role) return res.status(404).json({ error: 'no such role' });

    const { description, permissions } = req.body || {};
    const before = plain(role);
    const patch = { updated_at: new Date() };

    if (permissions !== undefined) {
        try {
            patch.permissions = cleanPermissions(permissions);
        } catch (err) {
            return res.status(400).json({ error: err.message });
        }
    }
    if (description !== undefined) {
        patch.description = typeof description === 'string' ? description.slice(0, 128) : null;
    }

    await role.update(patch);
    await audit(req, { action: 'update', entity: 'admin_role', entityId: name, before, after: plain(role) });
    console.log(`[ACCESS] ${req.admin.username} updated role "${name}"`);

    return res.json({ name: role.name, description: role.description, permissions: role.permissions });
}));

router.delete('/:name', requirePermission('admin.roles.write'), wrap(async function (req, res) {
    const { name } = req.params;
    if (name === SUPERADMIN_ROLE) {
        return res.status(400).json({ error: 'the built-in role cannot be deleted' });
    }

    const role = await AdminRole.findByPk(name);
    if (!role) return res.status(404).json({ error: 'no such role' });

    // Deleting a role out from under an account does not demote them to
    // "nothing" - it leaves them holding a name that resolves to no role, which
    // is a 403 on every page and reads as a broken panel. Move them first.
    const holders = await AdminUser.count({ where: { role: name } });
    if (holders > 0) {
        return res.status(409).json({ error: `${holders} account(s) still hold this role - move them first` });
    }

    const before = plain(role);
    await role.destroy();
    await audit(req, { action: 'delete', entity: 'admin_role', entityId: name, before });
    console.log(`[ACCESS] ${req.admin.username} deleted role "${name}"`);

    return res.json({ ok: true });
}));

module.exports = router;
