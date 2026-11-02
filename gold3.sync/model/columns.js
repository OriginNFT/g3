'use strict';

const { DataTypes } = require('sequelize');

// Columns every event table carries. Each module still owns its own table (so
// per-module queries stay narrow and indexable); this only keeps the shared
// shape identical across them.
//
//   address    user address, stored exactly as the chain returns it (checksummed)
//   method     event name, e.g. 'PowerRecorded'
//   amount_raw exact uint256 as a decimal string (source of truth)
//   amount     same value in token units (18 decimals), for aggregation
//   ts         block timestamp
function baseColumns() {
    return {
        id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
        address: { type: DataTypes.STRING(42), allowNull: false },
        method: { type: DataTypes.STRING(32), allowNull: false },
        amount_raw: { type: DataTypes.STRING(78), allowNull: false },
        // (78, 18) is the full uint256 range at 18 decimals, so an unexpected
        // amount can never overflow the column and stall the listener.
        amount: { type: DataTypes.DECIMAL(78, 18), allowNull: false },
        block: { type: DataTypes.BIGINT, allowNull: false },
        tx: { type: DataTypes.STRING(66), allowNull: false },
        log_index: { type: DataTypes.INTEGER, allowNull: false },
        ts: { type: DataTypes.DATE, allowNull: false },
    };
}

// unique(tx, log_index) is what makes the listeners replay-safe: re-syncing a
// block range inserts nothing new.
function baseOptions(tableName, extraIndexes = []) {
    return {
        tableName,
        underscored: true,
        indexes: [
            { unique: true, fields: ['tx', 'log_index'] },
            { fields: ['address'] },
            { fields: ['block'] },
            { fields: ['method'] },
            ...extraIndexes,
        ],
    };
}

// Amount-free variant for events that move no token (status changes, votes,
// settlements keyed by day). Same replay-safety index.
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

function eventOptions(tableName, extraIndexes = []) {
    return {
        tableName,
        underscored: true,
        indexes: [
            { unique: true, fields: ['tx', 'log_index'] },
            { fields: ['block'] },
            { fields: ['method'] },
            ...extraIndexes,
        ],
    };
}

module.exports = { baseColumns, baseOptions, eventColumns, eventOptions, DataTypes };
