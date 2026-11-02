'use strict';

const { eventColumns, eventOptions, DataTypes } = require('../columns');

// FeeRouter.sol + BuybackExecutor.sol - two contracts, one table: where every
// fee went and what the buybacks did. No user: `to_address` is a contract or
// a configured account. Amounts are in the token's own decimals (amount_raw
// exact); `token` says which.
//
//   FeeRouted        FeeRouter sent `amount` of `token` to `to_address` under
//                    source_tag (TURBINE / *_SELL) for purpose_tag
//   BuybackFunded    BuybackExecutor booked `amount` of `token` for purpose_tag
//   BuybackExecuted  BuybackExecutor swapped `amount` of `token` (tokenIn) into
//                    amount_out of token_out and burnt it (TokensBurned, same tx)
//   TokensBurned     BuybackExecutor burnt `amount` of `token`
module.exports = (sequelize) =>
    sequelize.define(
        'FeeRecord',
        {
            ...eventColumns(),
            source_tag: { type: DataTypes.STRING(66), allowNull: true },
            source_name: { type: DataTypes.STRING(32), allowNull: true },
            purpose_tag: { type: DataTypes.STRING(66), allowNull: true },
            purpose_name: { type: DataTypes.STRING(32), allowNull: true },
            token: { type: DataTypes.STRING(42), allowNull: false },
            to_address: { type: DataTypes.STRING(42), allowNull: true },
            amount_raw: { type: DataTypes.STRING(78), allowNull: false },
            amount: { type: DataTypes.DECIMAL(78, 18), allowNull: false },
            token_out: { type: DataTypes.STRING(42), allowNull: true },
            amount_out_raw: { type: DataTypes.STRING(78), allowNull: true },
            amount_out: { type: DataTypes.DECIMAL(78, 18), allowNull: true },
        },
        eventOptions('gold3_fee_records', [{ fields: ['source_name'] }, { fields: ['purpose_name'] }])
    );
