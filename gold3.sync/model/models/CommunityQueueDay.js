'use strict';

const { DataTypes } = require('sequelize');

// One row per protocol day the accountant is responsible for closing:
// written together with the day's gold3_community_queue rows by whatever
// decides the day (a day with nothing to credit still gets a row, so its
// whole budget leaves as leftover), then taken on chain by
// keepers/community-accountant.js.
//
//   status  queued   queue rows pending or in flight
//           sent     every gold3_community_queue row of the day is `sent`
//           closed   CommunityEngine.closeDay(day) confirmed; `tx` holds its hash
module.exports = (sequelize) =>
    sequelize.define(
        'CommunityQueueDay',
        {
            day: { type: DataTypes.BIGINT, primaryKey: true },
            status: { type: DataTypes.STRING(16), allowNull: false, defaultValue: 'queued' },
            tx: { type: DataTypes.STRING(66), allowNull: true },
            created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
            closed_at: { type: DataTypes.DATE, allowNull: true },
        },
        {
            tableName: 'gold3_community_queue_days',
            underscored: true,
            timestamps: false,
            indexes: [{ fields: ['status'] }],
        }
    );
