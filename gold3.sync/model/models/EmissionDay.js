'use strict';

const { eventColumns, eventOptions, DataTypes } = require('../columns');

// EmissionController.sol - the daily settlement, one row per (day, method).
// Per-day, not per-user: no address and no primary amount. Every figure is
// GG (18 decimals).
//
//   DailySettled  settleDay / settleUpTo closed protocol day `day`:
//                   day_budget        cumulativeBudget(day) - cumulativeBudget(day - 1)
//                   holding_amount    the 50% handed to ComputingVault
//                   community_amount  the 50% handed to CommunityEngine
//                   unused_amount     what no position could receive, routed
//                                     to the InsuranceTreasury (UNUSED_EMISSION)
//   GenesisSet    setGenesis ran: genesis_timestamp (SGT 12:00) and the five
//                 phase end days; `day` is null
//
// unique (day, method): a day settles exactly once on chain.
module.exports = (sequelize) =>
    sequelize.define(
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
        eventOptions('gold3_emission_days', [{ unique: true, fields: ['day', 'method'] }])
    );
