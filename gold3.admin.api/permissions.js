'use strict';

// The permission catalogue. This file is the whole vocabulary - a role can only
// ever hold keys that appear here.
//
// Why a code constant and not a table: a permission key is only meaningful
// because some route checks it. Letting operators invent keys in the database
// produces permissions that grant nothing and, worse, the belief that they do.
// Roles live in the database; what a role may contain does not.
//
// `scope` says where the key is enforced:
//   api    - checked by requirePermission on the route that performs it. Real.
//   panel  - the contract-settings pages. They sign transactions directly from
//            the browser and never touch this API, so nothing here can enforce
//            them: the chain obeys the private key, not this table. Those keys
//            are process control and an audit story, NOT a security boundary.
//            Treated as such deliberately, and labelled that way in the panel.
//
// `danger` requires a fresh TOTP code on the request, on top of the permission.
// A stolen session is then not enough to write a payout row or resolve a
// batch - the same reasoning as the password-change route.
const PERMISSIONS = [
    // ---- reports: read-only views over what gold3.sync wrote ----
    { key: 'days.read', group: 'reports', scope: 'api' },
    { key: 'positions.read', group: 'reports', scope: 'api' },
    { key: 'members.read', group: 'reports', scope: 'api' },
    { key: 'treasury.read', group: 'reports', scope: 'api' },
    { key: 'fees.read', group: 'reports', scope: 'api' },
    { key: 'services.read', group: 'reports', scope: 'api' },
    { key: 'audit.read', group: 'reports', scope: 'api' },

    // ---- operations: the community payout queue ----
    // Writing a row decides what a member gets paid out of a day's community
    // budget; resolving a batch left mid-flight can pay twice. Both carry a
    // fresh code.
    { key: 'queues.read', group: 'operations', scope: 'api' },
    { key: 'queues.write', group: 'operations', scope: 'api', danger: true },

    // ---- access: who may use this panel at all ----
    { key: 'admin.users.read', group: 'access', scope: 'api' },
    { key: 'admin.users.write', group: 'access', scope: 'api', danger: true },
    { key: 'admin.roles.read', group: 'access', scope: 'api' },
    { key: 'admin.roles.write', group: 'access', scope: 'api', danger: true },

    // ---- contracts: browser-signed, panel-side only (see `scope` above) ----
    { key: 'contracts.token.read', group: 'contracts', scope: 'panel' },
    { key: 'contracts.token.write', group: 'contracts', scope: 'panel' },
    { key: 'contracts.emission.read', group: 'contracts', scope: 'panel' },
    { key: 'contracts.emission.write', group: 'contracts', scope: 'panel' },
    { key: 'contracts.community.read', group: 'contracts', scope: 'panel' },
    { key: 'contracts.community.write', group: 'contracts', scope: 'panel' },
    { key: 'contracts.power.read', group: 'contracts', scope: 'panel' },
    { key: 'contracts.power.write', group: 'contracts', scope: 'panel' },
    { key: 'contracts.treasury.read', group: 'contracts', scope: 'panel' },
    { key: 'contracts.treasury.write', group: 'contracts', scope: 'panel' },
    { key: 'contracts.fee.read', group: 'contracts', scope: 'panel' },
    { key: 'contracts.fee.write', group: 'contracts', scope: 'panel' },
    { key: 'contracts.oracle.read', group: 'contracts', scope: 'panel' },
    { key: 'contracts.oracle.write', group: 'contracts', scope: 'panel' },
    { key: 'contracts.roles.read', group: 'contracts', scope: 'panel' },
    { key: 'contracts.roles.write', group: 'contracts', scope: 'panel' },
];

// The built-in role. Named 'admin' because that is what gold3_admin_users.role
// defaults to and what scripts/create-admin.js writes - there is always one role
// that cannot be edited into uselessness. It is not a database row: nothing can
// remove the last way in.
const SUPERADMIN_ROLE = 'admin';

const KEYS = PERMISSIONS.map((entry) => entry.key);
const KEY_SET = new Set(KEYS);
const DANGEROUS = new Set(PERMISSIONS.filter((entry) => entry.danger).map((entry) => entry.key));

// Labels live in the panel, not here: this service answers in English (the same
// strings land in the server log) and the panel translates the keys.
function catalogue() {
    return PERMISSIONS.map((entry) => ({
        key: entry.key,
        group: entry.group,
        scope: entry.scope,
        danger: Boolean(entry.danger),
    }));
}

function isKnown(key) {
    return KEY_SET.has(key);
}

function isDangerous(key) {
    return DANGEROUS.has(key);
}

// Only api-scoped keys can be enforced, so that is all the route checker demands
// coverage for.
function apiKeys() {
    return PERMISSIONS.filter((entry) => entry.scope === 'api').map((entry) => entry.key);
}

module.exports = { PERMISSIONS, KEYS, SUPERADMIN_ROLE, catalogue, isKnown, isDangerous, apiKeys };
