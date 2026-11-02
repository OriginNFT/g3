'use strict';

const { eventColumns, eventOptions, DataTypes } = require('../columns');

// CommunityEngine.sol - the day-level side of the community budget, one row
// per (day, method). GG, 18 decimals.
//
//   CommunityBudgetAllocated  notifyCommunityBudget split the day's community
//                             half into the five buckets (30/30/30/5/5)
//   CommunityDayClosed        closeDay ran: `credited` the total the buckets
//                             handed out, `leftover` what went to the
//                             InsuranceTreasury under UNUSED_COMMUNITY
//
// keepers/community-accountant.js drains gold3_community_queue against the
// CommunityBudgetAllocated rows and closes a day once every row is sent.
module.exports = (sequelize) =>
    sequelize.define(
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
        eventOptions('gold3_community_days', [{ unique: true, fields: ['day', 'method'] }])
    );
