'use strict';

const { DataTypes } = require('sequelize');

// Payout queue of the community budget: what was decided for a settled day
// (the community assessment is off chain, spec §13 - rows are written by
// whatever produces it, never by this module), waiting to be pushed on chain
// by keepers/community-accountant.js as
//   CommunityEngine.credit(day, bucket, accounts[], amounts[]).
//
// The queue exists because credit() is purely additive: the chain caps a
// bucket's total against its budget but cannot tell a retry from a second
// credit. So the decision is written down first, unique on (day, address,
// bucket), and a row is only ever sent once:
//
//   pending  decided, not sent
//   sending  a transaction carrying this row was submitted; its hash is in `tx`.
//            Left here if the process dies mid-send - check the hash on chain
//            before touching it, because re-sending double-credits the user.
//   sent     confirmed
//   failed   the send reverted or was rejected; `error` says why. Safe to retry,
//            since a failed transaction credited nothing.
//
//   day      protocol day whose community budget pays this (CommunityBudgetAllocated)
//   bucket   EXPANSION, COLLABORATION or CONTRIBUTION (utils/tags.js bucketId);
//            batches are homogeneous per (day, bucket) because one
//            transaction carries one bucket
//   amount   GG, 18 decimals; the keeper parses it back with parseUnits
//
// Once every row of a day is `sent` the keeper closes the day with
// closeDay(day) and records that in gold3_community_queue_days, not here.
module.exports = (sequelize) =>
    sequelize.define(
        'CommunityQueue',
        {
            id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
            day: { type: DataTypes.BIGINT, allowNull: false },
            address: { type: DataTypes.STRING(42), allowNull: false },
            bucket: { type: DataTypes.STRING(16), allowNull: false },
            amount: { type: DataTypes.DECIMAL(78, 18), allowNull: false },
            status: { type: DataTypes.STRING(16), allowNull: false, defaultValue: 'pending' },
            tx: { type: DataTypes.STRING(66), allowNull: true },
            // Nonce the batch was reserved against, written before the send. It
            // is what makes a crashed send answerable afterwards: the nonce
            // either landed on chain or it did not.
            nonce: { type: DataTypes.INTEGER, allowNull: true },
            error: { type: DataTypes.TEXT, allowNull: true },
            retry_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
            sent_at: { type: DataTypes.DATE, allowNull: true },
        },
        {
            tableName: 'gold3_community_queue',
            underscored: true,
            timestamps: false,
            indexes: [
                { unique: true, fields: ['day', 'address', 'bucket'] },
                { fields: ['status'] },
                { fields: ['day'] },
            ],
        }
    );
