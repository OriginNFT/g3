'use strict';

const { eventColumns, eventOptions, DataTypes } = require('../columns');

// ComputingVault.sol - HoldingRewardNotified(dayId, amount): the holding half
// of `day`'s emission the vault actually pulled from EmissionController
// (the distributed part; the whole half when no power was active is routed
// to the InsuranceTreasury by EmissionController instead and shows up as
// the day's unused_amount in gold3_emission_days). One row per day.
module.exports = (sequelize) =>
    sequelize.define(
        'HoldingDay',
        {
            ...eventColumns(),
            day: { type: DataTypes.BIGINT, allowNull: false },
            amount: { type: DataTypes.DECIMAL(78, 18), allowNull: false },
        },
        eventOptions('gold3_holding_days', [{ unique: true, fields: ['day', 'method'] }])
    );
