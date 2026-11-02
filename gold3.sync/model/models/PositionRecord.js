'use strict';

const { baseColumns, baseOptions, DataTypes } = require('../columns');

// ComputingVault.sol - the user side of the power positions and their
// holding reward, one row per event.
//
//   PositionCreated       `address` the owner, `amount` the power (1e18 =
//                         1 USDT of power); position_id, asset, the input
//                         (input_amount in the asset's own decimals) and
//                         usdt_value (the TWAP value the power was computed
//                         from, 18 decimals; for USDT the received amount)
//   TokensBurned          `address` the burner, `amount` what was burnt of
//                         `token` (GOT2 or GG, the asset's own decimals) -
//                         the burn half of a GOT2 / GG PositionCreated of
//                         the same tx
//   HoldingRewardClaimed  `address` the claimer, `amount` the GG delivered
//                         to the turbine
//
// The day-level HoldingRewardNotified is in gold3_holding_days.
module.exports = (sequelize) =>
    sequelize.define(
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
        baseOptions('gold3_position_records', [{ fields: ['position_id'] }])
    );
