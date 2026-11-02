'use strict';

const { sequelize } = require('./sequelize');

// Event tables, one per listener (config/services.js; position and community write two each).
const PositionRecord = require('./models/PositionRecord')(sequelize);
const HoldingDay = require('./models/HoldingDay')(sequelize);
const EmissionDay = require('./models/EmissionDay')(sequelize);
const CommunityDay = require('./models/CommunityDay')(sequelize);
const CommunityCredit = require('./models/CommunityCredit')(sequelize);
const TierRecord = require('./models/TierRecord')(sequelize);
const RightsRecord = require('./models/RightsRecord')(sequelize);
const FeeRecord = require('./models/FeeRecord')(sequelize);
const TreasuryFlow = require('./models/TreasuryFlow')(sequelize);

// Keeper tables.
const CommunityQueue = require('./models/CommunityQueue')(sequelize);
const CommunityQueueDay = require('./models/CommunityQueueDay')(sequelize);

// Await this before touching any model. It only verifies the connection -
// the schema is owned by scripts/init-schema.js and is never created here.
//
// sequelize.sync() must not run at this point: it would mean every listener
// issues CREATE TABLE IF NOT EXISTS for every model as it boots. PostgreSQL
// does not serialise that statement against a concurrent creation of the
// same table: the losers of the race die on a duplicate key in
// pg_class_relname_nsp_index.
//
// Rejects on failure instead of swallowing the error, so an unreachable
// database stops the service loudly.
const ready = sequelize
    .authenticate()
    .then(() => {
        console.log('[DB] connected');
    })
    .catch((err) => {
        console.error('[DB] connection failed:', err.message, err);
        throw err;
    });

// Idempotent insert. bulkCreate + ignoreDuplicates maps to ON CONFLICT DO
// NOTHING, which the unique (tx, log_index) index turns into replay safety.
async function insertIgnore(Model, row) {
    await Model.bulkCreate([row], { ignoreDuplicates: true, returning: false });
}

module.exports = {
    sequelize,
    ready,
    insertIgnore,
    PositionRecord,
    HoldingDay,
    EmissionDay,
    CommunityDay,
    CommunityCredit,
    TierRecord,
    RightsRecord,
    FeeRecord,
    TreasuryFlow,
    CommunityQueue,
    CommunityQueueDay,
};
