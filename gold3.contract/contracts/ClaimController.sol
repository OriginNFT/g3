// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.8.24;

import {AccessControlEnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/extensions/AccessControlEnumerableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

import "./interface/IClaimController.sol";
import "./interface/INFTRightsLedger.sol";
import "./interface/ICommunityEngine.sol";
import "./interface/IOracleAdapter.sol";

/**
 * @title ClaimController
 * @notice Claim of the community dynamic emission (spec §06): deducts
 *         amount x live GG USDT price from NFTRightsLedger and pays GG from
 *         CommunityEngine in the same transaction; rejects when the quota is
 *         short. The GG is delivered by CommunityEngine to the turbine.
 */
contract ClaimController is AccessControlEnumerableUpgradeable, ReentrancyGuardUpgradeable, IClaimController {
    uint256 public constant IMPL_REV = 1;

    uint256 public constant PRICE_PRECISION = 1e18;

    // ============ Storage ============

    address public gg;
    address public oracle;
    address public rightsLedger;
    address public communityEngine;

    uint256[50] private __gap;

    // ============ Initializable ============

    function initialize(
        address gg_,
        address oracle_,
        address rightsLedger_,
        address communityEngine_
    ) external initializer {
        __AccessControlEnumerable_init();
        __ReentrancyGuard_init();
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);

        gg = gg_;
        oracle = oracle_;
        rightsLedger = rightsLedger_;
        communityEngine = communityEngine_;
    }

    // ============ Claim ============

    function claimCommunityGG(uint256 amount) external override nonReentrant {
        require(amount > 0, "ClaimController: zero amount");
        uint256 price = IOracleAdapter(oracle).priceUSDT(gg);
        require(price > 0, "ClaimController: no price");
        uint256 rights = amount * price / PRICE_PRECISION;

        INFTRightsLedger(rightsLedger).consume(msg.sender, rights);
        ICommunityEngine(communityEngine).payout(msg.sender, amount);
        emit CommunityGGClaimed(msg.sender, amount, price, rights);
    }

    /// @notice GG `account` can claim now: its community credits capped by
    ///         what its NFT rights cover at the live price.
    function claimable(address account) external view override returns (uint256) {
        uint256 credits = ICommunityEngine(communityEngine).creditsOf(account);
        uint256 price = IOracleAdapter(oracle).priceUSDT(gg);
        if (price == 0) {
            return 0;
        }
        uint256 byRights = INFTRightsLedger(rightsLedger).rightsOf(account) * PRICE_PRECISION / price;
        return credits < byRights ? credits : byRights;
    }
}
