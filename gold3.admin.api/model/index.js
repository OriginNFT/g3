'use strict';

const { sequelize } = require('./sequelize');
const {
    defineCommunityQueue,
    defineCommunityQueueDay,
    defineEmissionDay,
    defineCommunityDay,
    defineCommunityCredit,
    definePositionRecord,
    defineTreasuryFlow,
} = require('./models/sync');

// Owned by this service - scripts/init-schema.js creates these three and
// nothing else.
const AdminUser = require('./models/AdminUser')(sequelize);
const AdminRole = require('./models/AdminRole')(sequelize);
const AdminAuditLog = require('./models/AdminAuditLog')(sequelize);
const OWNED_MODELS = [AdminUser, AdminRole, AdminAuditLog];

// Owned by gold3.sync. Read and updated here, never created here.
//
// The community payout queue and its per-day header: the one place this
// service writes. routes/queues.js enqueues a settled day's rows (the
// assessment itself is off chain), resolves a row left mid-flight and retries
// a failed one. credit() is additive on chain, so every write is audited and
// guarded by a fresh TOTP code (permissions.js marks queues.write danger).
const CommunityQueue = defineCommunityQueue(sequelize);
const CommunityQueueDay = defineCommunityQueueDay(sequelize);

// Reported on, never edited.
const EmissionDay = defineEmissionDay(sequelize);
const CommunityDay = defineCommunityDay(sequelize);
const CommunityCredit = defineCommunityCredit(sequelize);
const PositionRecord = definePositionRecord(sequelize);
const TreasuryFlow = defineTreasuryFlow(sequelize);

// Verifies the connection once at boot and rejects on failure, so a bad
// DATABASE_URL stops the service instead of surfacing as a 500 per request.
//
// authenticate() only: the schema belongs to gold3.sync for the mirrors and to
// scripts/init-schema.js for the owned tables.
const ready = sequelize
    .authenticate()
    .then(() => {
        console.log('[DB] connected');
    })
    .catch((err) => {
        console.error('[DB] connection failed:', err.message, err);
        throw err;
    });

module.exports = {
    sequelize,
    ready,
    OWNED_MODELS,
    AdminUser,
    AdminRole,
    AdminAuditLog,
    CommunityQueue,
    CommunityQueueDay,
    EmissionDay,
    CommunityDay,
    CommunityCredit,
    PositionRecord,
    TreasuryFlow,
};
