'use strict';

const { baseColumns, baseOptions, DataTypes } = require('../columns');

// CommunityEngine.sol - the per-user side of the community budget. GG, 18
// decimals.
//
//   CommunityCredited  `address` was credited `amount` out of `day`'s
//                      `bucket` (0 EXPANSION, 1 COLLABORATION, 2 CONTRIBUTION
//                      by the accountant keeper; 3 DAO_BUILDING, 4 PLATFORM
//                      to the fixed accounts at settlement). One row per
//                      address per credit() call.
//   CommunityPaid      ClaimController paid `amount` of `address`'s credits:
//                      the GG went to the turbine. The NFT rights deducted
//                      for it are the CommunityGGClaimed row of the same tx
//                      in gold3_rights_records. `day` and `bucket` are null.
module.exports = (sequelize) =>
    sequelize.define(
        'CommunityCredit',
        {
            ...baseColumns(),
            day: { type: DataTypes.BIGINT, allowNull: true },
            bucket: { type: DataTypes.INTEGER, allowNull: true },
            bucket_name: { type: DataTypes.STRING(16), allowNull: true },
        },
        baseOptions('gold3_community_credits', [{ fields: ['day'] }])
    );
