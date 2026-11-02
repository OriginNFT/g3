'use strict';

const { baseColumns, baseOptions, DataTypes } = require('../columns');

// TierStaking.sol - tier locks, GG 18 decimals.
//
//   TierStaked    `address` locked `amount`
//   TierUnstaked  `address` released `amount`
//   TierChanged   the recorded stake tier of `address` moved from tier_from
//                 to tier_to (0 = none, 1..7 = G1..G7); `amount` is 0. Emitted
//                 by stake / unstake and by syncTier, which anyone may call
//                 after a price move.
module.exports = (sequelize) =>
    sequelize.define(
        'TierRecord',
        {
            ...baseColumns(),
            tier_from: { type: DataTypes.INTEGER, allowNull: true },
            tier_to: { type: DataTypes.INTEGER, allowNull: true },
        },
        baseOptions('gold3_tier_records')
    );
