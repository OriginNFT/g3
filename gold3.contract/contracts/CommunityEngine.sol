// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.8.24;

import {AccessControlEnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/extensions/AccessControlEnumerableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

import "./interface/ICommunityEngine.sol";

/**
 * @title CommunityEngine
 * @notice Receives the daily community 50% of the emission and splits it
 *         30 expansion / 30 collaboration / 30 contribution / 5 DAO building /
 *         5 platform (spec §02). Pays out to ClaimController.
 * @dev Skeleton: signatures and storage only.
 */
contract CommunityEngine is AccessControlEnumerableUpgradeable, ReentrancyGuardUpgradeable, ICommunityEngine {
    uint256 public constant IMPL_REV = 1;

    bytes32 public constant EMISSION_ROLE = keccak256("EMISSION_ROLE");
    bytes32 public constant CLAIM_ROLE = keccak256("CLAIM_ROLE");

    uint256 public constant BPS = 10_000;

    uint256 public constant EXPANSION_BPS = 3_000;
    uint256 public constant COLLABORATION_BPS = 3_000;
    uint256 public constant CONTRIBUTION_BPS = 3_000;
    uint256 public constant DAO_BUILDING_BPS = 500;
    uint256 public constant PLATFORM_BPS = 500;

    // ============ Storage ============

    address public gg;

    mapping(uint256 => uint256) public override communityBudgetOf;

    uint256[50] private __gap;

    // ============ Initializable ============

    function initialize(address gg_) external initializer {
        __AccessControlEnumerable_init();
        __ReentrancyGuard_init();
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);

        gg = gg_;
    }

    // ============ Budget ============

    function notifyCommunityBudget(uint256 dayId, uint256 amount) external override onlyRole(EMISSION_ROLE) nonReentrant {}

    function payout(address to, uint256 amount) external override onlyRole(CLAIM_ROLE) nonReentrant {}
}
