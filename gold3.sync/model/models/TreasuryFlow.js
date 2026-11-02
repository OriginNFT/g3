'use strict';

const { baseColumns, baseOptions, DataTypes } = require('../columns');

// InsuranceTreasury, ReserveVault, ProtectionVault, AllocationVault - four
// contracts, one table: every flow in or out of the protocol's holdings.
// `contract` is the address-book label of the emitter; `token` the asset
// (GG for the treasury and the allocation vault, USDT for the reserve and
// protection deposits, whatever `token` says for a protection withdrawal or
// buy); amounts in that token's own decimals.
//
//   TreasuryCredited      `address` (the router) credited `amount` GG under tag
//   TreasuryPaid          `amount` GG paid to `address` for purpose (LP_AIRDROP)
//   ReserveDeposited      `address` (ComputingVault) deposited `amount` USDT
//   ReserveWithdrawn      admin withdrew `amount` USDT to `address`, `memo`
//   ProtectionDeposited   `address` (ComputingVault) deposited `amount` USDT
//   ProtectionBuyExecuted `address` (the buyer) spent `amount` USDT along
//                         `path` for amount_out of token_out (the vault keeps it)
//   ProtectionWithdrawn   admin withdrew `amount` of `token` to `address`, `memo`
//   AllocationReleased    AllocationVault released `amount` GG of bucket
//                         (source_tag) to `address`
module.exports = (sequelize) =>
    sequelize.define(
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
        baseOptions('gold3_treasury_flows', [{ fields: ['contract'] }, { fields: ['tag_name'] }])
    );
