// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.8.24;

import {AccessControlEnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/extensions/AccessControlEnumerableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

import "./interface/IClaimController.sol";

/**
 * @title ClaimController
 * @notice Claim of the community dynamic emission (spec §06): deducts
 *         amount x live GG USDT price from NFTRightsLedger and pays GG from
 *         CommunityEngine in the same transaction; rejects when the quota is short.
 * @dev Skeleton: signatures and storage only.
 */
contract ClaimController is AccessControlEnumerableUpgradeable, ReentrancyGuardUpgradeable, IClaimController {
    uint256 public constant IMPL_REV = 1;

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

    function claimCommunityGG(uint256 amount) external override nonReentrant {}

    function claimable(address account) external view override returns (uint256) {}
}
