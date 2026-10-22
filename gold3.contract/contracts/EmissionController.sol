// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.8.24;

import {AccessControlEnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/extensions/AccessControlEnumerableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

import "./interface/IEmissionController.sol";

/**
 * @title EmissionController
 * @notice 67.2M GG over 120 months in five phases, budgeted per MONTH (not per
 *         epoch) and settled per day along the plan curve (spec §03):
 *           dayBudget = cumulative(dayEnd) - cumulative(dayStart)
 *           holding 50% -> ComputingVault, community 50% -> CommunityEngine
 *           unused = dayBudget - actualHolding - actualCommunity -> InsuranceTreasury
 *         settleDay is idempotent per dayId and supports catch-up of missed days.
 * @dev Skeleton: signatures and storage only. Month boundaries and the
 *      settlement timezone are open items (spec §13).
 */
contract EmissionController is AccessControlEnumerableUpgradeable, ReentrancyGuardUpgradeable, IEmissionController {
    uint256 public constant IMPL_REV = 1;

    bytes32 public constant KEEPER_ROLE = keccak256("KEEPER_ROLE");

    uint256 public constant BPS = 10_000;

    uint256 public constant TOTAL_BUDGET = 67_200_000 ether;
    uint256 public constant TOTAL_MONTHS = 120;

    // Phase i covers months (PHASE{i-1}_END_MONTH, PHASE{i}_END_MONTH].
    uint256 public constant PHASE1_END_MONTH = 12;
    uint256 public constant PHASE2_END_MONTH = 37;
    uint256 public constant PHASE3_END_MONTH = 68;
    uint256 public constant PHASE4_END_MONTH = 95;
    uint256 public constant PHASE5_END_MONTH = 120;

    uint256 public constant PHASE1_BUDGET = 5_376_000 ether; // 8%
    uint256 public constant PHASE2_BUDGET = 15_456_000 ether; // 23%
    uint256 public constant PHASE3_BUDGET = 20_160_000 ether; // 30%
    uint256 public constant PHASE4_BUDGET = 15_456_000 ether; // 23%
    uint256 public constant PHASE5_BUDGET = 10_752_000 ether; // 16%

    uint256 public constant HOLDING_BPS = 5_000;
    uint256 public constant COMMUNITY_BPS = 5_000;

    // ============ Storage ============

    address public gg;
    address public insuranceTreasury;
    address public computingVault;
    address public communityEngine;

    uint256 public genesisTimestamp;
    uint256 public lastSettledDay;

    mapping(uint256 => bool) public override isSettled;

    uint256[50] private __gap;

    // ============ Initializable ============

    function initialize(
        address gg_,
        address insuranceTreasury_,
        address computingVault_,
        address communityEngine_,
        uint256 genesisTimestamp_
    ) external initializer {
        __AccessControlEnumerable_init();
        __ReentrancyGuard_init();
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);

        gg = gg_;
        insuranceTreasury = insuranceTreasury_;
        computingVault = computingVault_;
        communityEngine = communityEngine_;
        genesisTimestamp = genesisTimestamp_;
    }

    // ============ Settlement ============

    function settleDay(uint256 dayId) external override onlyRole(KEEPER_ROLE) nonReentrant {}

    // ============ Views ============

    function currentDay() external view override returns (uint256) {}

    function monthOf(uint256 dayId) external view override returns (uint256) {}

    function cumulativeBudget(uint256 dayId) external view override returns (uint256) {}

    function dayBudget(uint256 dayId) external view override returns (uint256) {}
}
