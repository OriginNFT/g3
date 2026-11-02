'use strict';

const { DataTypes } = require('sequelize');

// MIRRORS of gold3.sync's models, for the tables this panel reads and the two
// it edits (gold3_community_queue / gold3_community_queue_days).
//
// Deliberately one file: gold3.sync owns these definitions and this is a copy,
// so the copy has to move whenever the original does. Keeping them together
// makes that a single diff to check.
//
// This service never creates or alters these tables - scripts/init-schema.js
// syncs only gold3_admin_users, gold3_admin_roles and gold3_admin_audit_log.
//
// Source, one per define below (all under gold3.sync/model/models/):
//   CommunityQueue.js       gold3_community_queue
//   CommunityQueueDay.js    gold3_community_queue_days
//   EmissionDay.js          gold3_emission_days
//   CommunityDay.js         gold3_community_days
//   CommunityCredit.js      gold3_community_credits
//   PositionRecord.js       gold3_position_records
//   TreasuryFlow.js         gold3_treasury_flows
//
// Most routes here read these tables with raw SQL (QueryTypes.SELECT); the
// models exist for the places that want rows back as records - CommunityQueue
// and CommunityQueueDay (written) - and to keep one written-down statement of
// the shape this panel expects. Read through raw SQL without a mirror:
// gold3_holding_days, gold3_tier_records, gold3_rights_records, gold3_fee_records.

// Copy of gold3.sync/model/columns.js. `address` and every other address
// column is stored exactly as the chain returns it (checksummed) - compare
// with `=`, never lowercase it.
function baseColumns() {
    return {
        id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
        address: { type: DataTypes.STRING(42), allowNull: false },
        method: { type: DataTypes.STRING(32), allowNull: false },
        amount_raw: { type: DataTypes.STRING(78), allowNull: false },
        amount: { type: DataTypes.DECIMAL(78, 18), allowNull: false },
        block: { type: DataTypes.BIGINT, allowNull: false },
        tx: { type: DataTypes.STRING(66), allowNull: false },
        log_index: { type: DataTypes.INTEGER, allowNull: false },
        ts: { type: DataTypes.DATE, allowNull: false },
    };
}

function eventColumns() {
    return {
        id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
        method: { type: DataTypes.STRING(32), allowNull: false },
        block: { type: DataTypes.BIGINT, allowNull: false },
        tx: { type: DataTypes.STRING(66), allowNull: false },
        log_index: { type: DataTypes.INTEGER, allowNull: false },
        ts: { type: DataTypes.DATE, allowNull: false },
    };
}

// gold3.sync's baseOptions / eventOptions leave sequelize's `timestamps` at its
// default, so every event table really does carry created_at / updated_at.
// The indexes are NOT mirrored: they belong to the schema, which is created
// over there and never here.
function eventTable(tableName) {
    return { tableName, underscored: true, timestamps: true };
}

function plainTable(tableName) {
    return { tableName, underscored: true, timestamps: false };
}

// Source: gold3.sync/model/models/CommunityQueue.js
function defineCommunityQueue(sequelize) {
    return sequelize.define(
        'CommunityQueue',
        {
            id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
            day: { type: DataTypes.BIGINT, allowNull: false },
            address: { type: DataTypes.STRING(42), allowNull: false },
            bucket: { type: DataTypes.STRING(16), allowNull: false },
            amount: { type: DataTypes.DECIMAL(78, 18), allowNull: false },
            status: { type: DataTypes.STRING(16), allowNull: false, defaultValue: 'pending' },
            tx: { type: DataTypes.STRING(66), allowNull: true },
            nonce: { type: DataTypes.INTEGER, allowNull: true },
            error: { type: DataTypes.TEXT, allowNull: true },
            retry_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
            sent_at: { type: DataTypes.DATE, allowNull: true },
        },
        plainTable('gold3_community_queue')
    );
}

// Source: gold3.sync/model/models/CommunityQueueDay.js
function defineCommunityQueueDay(sequelize) {
    return sequelize.define(
        'CommunityQueueDay',
        {
            day: { type: DataTypes.BIGINT, primaryKey: true },
            status: { type: DataTypes.STRING(16), allowNull: false, defaultValue: 'queued' },
            tx: { type: DataTypes.STRING(66), allowNull: true },
            created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
            closed_at: { type: DataTypes.DATE, allowNull: true },
        },
        plainTable('gold3_community_queue_days')
    );
}

// Source: gold3.sync/model/models/EmissionDay.js
function defineEmissionDay(sequelize) {
    return sequelize.define(
        'EmissionDay',
        {
            ...eventColumns(),
            day: { type: DataTypes.BIGINT, allowNull: true },
            day_budget: { type: DataTypes.DECIMAL(78, 18), allowNull: true },
            holding_amount: { type: DataTypes.DECIMAL(78, 18), allowNull: true },
            community_amount: { type: DataTypes.DECIMAL(78, 18), allowNull: true },
            unused_amount: { type: DataTypes.DECIMAL(78, 18), allowNull: true },
            genesis_timestamp: { type: DataTypes.BIGINT, allowNull: true },
            phase_end_days: { type: DataTypes.JSONB, allowNull: true },
        },
        eventTable('gold3_emission_days')
    );
}

// Source: gold3.sync/model/models/CommunityDay.js
function defineCommunityDay(sequelize) {
    return sequelize.define(
        'CommunityDay',
        {
            ...eventColumns(),
            day: { type: DataTypes.BIGINT, allowNull: false },
            expansion: { type: DataTypes.DECIMAL(78, 18), allowNull: true },
            collaboration: { type: DataTypes.DECIMAL(78, 18), allowNull: true },
            contribution: { type: DataTypes.DECIMAL(78, 18), allowNull: true },
            dao_building: { type: DataTypes.DECIMAL(78, 18), allowNull: true },
            platform: { type: DataTypes.DECIMAL(78, 18), allowNull: true },
            credited: { type: DataTypes.DECIMAL(78, 18), allowNull: true },
            leftover: { type: DataTypes.DECIMAL(78, 18), allowNull: true },
        },
        eventTable('gold3_community_days')
    );
}

// Source: gold3.sync/model/models/CommunityCredit.js
function defineCommunityCredit(sequelize) {
    return sequelize.define(
        'CommunityCredit',
        {
            ...baseColumns(),
            day: { type: DataTypes.BIGINT, allowNull: true },
            bucket: { type: DataTypes.INTEGER, allowNull: true },
            bucket_name: { type: DataTypes.STRING(16), allowNull: true },
        },
        eventTable('gold3_community_credits')
    );
}

// Source: gold3.sync/model/models/PositionRecord.js
function definePositionRecord(sequelize) {
    return sequelize.define(
        'PositionRecord',
        {
            ...baseColumns(),
            position_id: { type: DataTypes.BIGINT, allowNull: true },
            asset: { type: DataTypes.STRING(42), allowNull: true },
            input_amount_raw: { type: DataTypes.STRING(78), allowNull: true },
            input_amount: { type: DataTypes.DECIMAL(78, 18), allowNull: true },
            usdt_value: { type: DataTypes.DECIMAL(78, 18), allowNull: true },
            token: { type: DataTypes.STRING(42), allowNull: true },
        },
        eventTable('gold3_position_records')
    );
}

// Source: gold3.sync/model/models/TreasuryFlow.js
function defineTreasuryFlow(sequelize) {
    return sequelize.define(
        'TreasuryFlow',
        {
            ...baseColumns(),
            contract: { type: DataTypes.STRING(32), allowNull: false },
            token: { type: DataTypes.STRING(42), allowNull: false },
            source_tag: { type: DataTypes.STRING(66), allowNull: true },
            tag_name: { type: DataTypes.STRING(32), allowNull: true },
            memo: { type: DataTypes.STRING(66), allowNull: true },
            path: { type: DataTypes.JSONB, allowNull: true },
            token_out: { type: DataTypes.STRING(42), allowNull: true },
            amount_out_raw: { type: DataTypes.STRING(78), allowNull: true },
            amount_out: { type: DataTypes.DECIMAL(78, 18), allowNull: true },
        },
        eventTable('gold3_treasury_flows')
    );
}

module.exports = {
    defineCommunityQueue,
    defineCommunityQueueDay,
    defineEmissionDay,
    defineCommunityDay,
    defineCommunityCredit,
    definePositionRecord,
    defineTreasuryFlow,
};
