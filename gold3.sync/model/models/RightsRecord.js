'use strict';

const { baseColumns, baseOptions, DataTypes } = require('../columns');

// NFTRightsLedger.sol + ClaimController.sol - two contracts, one table: the
// NFT rights quota (USDT, 18 decimals) and the claims that spend it.
//
//   RightsCreated       `address` burnt burned_amount of `asset` (the asset's
//                       own decimals) worth usdt_value and got `amount` rights
//                       (usdt_value x 2 for GOT2, x 3 for GG)
//   TokensBurned        the burn half of that RightsCreated, same tx:
//                       `address` the burner, `amount` what was burnt of `token`
//   RightsConsumed      `amount` rights taken off `address` by ClaimController
//   CommunityGGClaimed  ClaimController: `address` claimed `amount` GG at
//                       gg_price (USDT per GG, 18 decimals), rights_deducted =
//                       amount x gg_price. Same tx as the RightsConsumed row
//                       and as the CommunityPaid row in gold3_community_credits.
module.exports = (sequelize) =>
    sequelize.define(
        'RightsRecord',
        {
            ...baseColumns(),
            asset: { type: DataTypes.STRING(42), allowNull: true },
            burned_amount_raw: { type: DataTypes.STRING(78), allowNull: true },
            burned_amount: { type: DataTypes.DECIMAL(78, 18), allowNull: true },
            usdt_value: { type: DataTypes.DECIMAL(78, 18), allowNull: true },
            token: { type: DataTypes.STRING(42), allowNull: true },
            gg_price: { type: DataTypes.DECIMAL(78, 18), allowNull: true },
            rights_deducted: { type: DataTypes.DECIMAL(78, 18), allowNull: true },
        },
        baseOptions('gold3_rights_records')
    );
