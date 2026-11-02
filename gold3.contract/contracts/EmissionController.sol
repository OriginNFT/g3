// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.8.24;

import {AccessControlEnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/extensions/AccessControlEnumerableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {SgtCalendar} from "./lib/SgtCalendar.sol";
import "./interface/IEmissionController.sol";
import "./interface/IComputingVault.sol";
import "./interface/ICommunityEngine.sol";
import "./interface/IInsuranceTreasury.sol";

/**
 * @title EmissionController
 * @notice 67.2M GG over 120 calendar months in five phases, settled per day
 *         along the plan curve (spec §03):
 *           dayBudget = cumulative(dayEnd) - cumulative(dayStart)
 *           holding 50% -> ComputingVault, community 50% -> CommunityEngine
 *           unused -> InsuranceTreasury
 * @dev Time. Day 1 starts at `genesisTimestamp`, an SGT 12:00 (UTC 04:00)
 *      instant the admin fixes once with setGenesis(); every day lasts 86400
 *      seconds. The calendar date of a day is the SGT civil date of its
 *      start. Month 1 is the calendar month containing genesis (a partial
 *      month), month n the (n-1)th calendar month after it; the five phases
 *      end with months 12 / 37 / 68 / 95 / 120 and their last protocol days
 *      are fixed in `phaseEndDay` when genesis is set.
 *
 *      Curve. A phase's budget is spread evenly over the protocol days of
 *      that phase: cumulativeBudget(d) inside phase p is the sum of the
 *      earlier phases plus PHASE_BUDGET_p x (d - phaseStart_p + 1) /
 *      daysInPhase_p (floor), so the floor dust lands on the last day of each
 *      phase, each phase pays exactly its budget and the five phases pay
 *      exactly TOTAL_BUDGET. The partial month 1 is therefore pro rata by its
 *      days and nothing is left unemitted at the end of month 120. A day
 *      after the last phase has a zero budget.
 *
 *      Settlement. settleDay(dayId) requires dayId == lastSettledDay + 1 and
 *      the day to have fully elapsed, so days settle strictly in order and a
 *      missed day is caught up by settling it next (settleUpTo batches that).
 *      The holding half is pulled by the ComputingVault through
 *      notifyHoldingReward, which returns what it could not distribute (the
 *      whole amount on a day without active power); that remainder is
 *      credited to the InsuranceTreasury under TAG_UNUSED_EMISSION in the
 *      same transaction. The community half is pulled in full by the
 *      CommunityEngine; what the community assessment leaves unused is
 *      routed to the treasury by the engine itself when it closes the day.
 *
 *      Upgradeable (Transparent proxy). Roles: DEFAULT_ADMIN_ROLE (setGenesis,
 *      wiring), KEEPER_ROLE (settleDay, settleUpTo). This contract must hold
 *      the InsuranceTreasury's ROUTER_ROLE and the EMISSION_ROLE of the
 *      ComputingVault and the CommunityEngine.
 */
contract EmissionController is AccessControlEnumerableUpgradeable, ReentrancyGuardUpgradeable, IEmissionController {
    using SafeERC20 for IERC20;

    uint256 public constant IMPL_REV = 1;

    bytes32 public constant KEEPER_ROLE = keccak256("KEEPER_ROLE");

    uint256 public constant BPS = 10_000;
    uint256 public constant SECONDS_PER_DAY = 86400;
    /// @notice Seconds after UTC midnight a protocol day starts: SGT 12:00.
    uint256 public constant DAY_START_UTC_OFFSET = 4 hours;

    uint256 public constant TOTAL_BUDGET = 67_200_000 ether;
    uint256 public constant TOTAL_MONTHS = 120;
    uint256 public constant PHASES = 5;

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

    /// @dev Must equal InsuranceTreasury.TAG_UNUSED_EMISSION.
    bytes32 public constant TAG_UNUSED_EMISSION = keccak256("UNUSED_EMISSION");

    // ============ Storage ============

    address public gg;
    address public insuranceTreasury;
    address public computingVault;
    address public communityEngine;

    /// @notice Start of day 1; 0 until setGenesis.
    uint256 public override genesisTimestamp;
    uint256 public override lastSettledDay;

    /// @notice Last protocol day of each phase, fixed by setGenesis.
    uint256[5] public phaseEndDay;

    mapping(uint256 => bool) public override isSettled;

    uint256[50] private __gap;

    // ============ Events ============

    event InsuranceTreasurySet(address insuranceTreasury);
    event ComputingVaultSet(address computingVault);
    event CommunityEngineSet(address communityEngine);

    // ============ Initializable ============

    /// @dev ComputingVault and CommunityEngine are deployed after this
    ///      contract (the vault takes this address at initialize), so they
    ///      are wired with setComputingVault / setCommunityEngine.
    function initialize(address gg_, address insuranceTreasury_) external initializer {
        __AccessControlEnumerable_init();
        __ReentrancyGuard_init();
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);

        require(gg_ != address(0), "EmissionController: zero gg");
        require(insuranceTreasury_ != address(0), "EmissionController: zero treasury");

        gg = gg_;
        insuranceTreasury = insuranceTreasury_;
    }

    // ============ Admin ============

    /// @notice Fix genesis, once: an SGT 12:00 instant. Computes the last
    ///         protocol day of each phase from the calendar months.
    function setGenesis(uint256 genesisTimestamp_) external override onlyRole(DEFAULT_ADMIN_ROLE) {
        require(genesisTimestamp == 0, "EmissionController: genesis already set");
        require(genesisTimestamp_ > 0, "EmissionController: zero genesis");
        require(genesisTimestamp_ % SECONDS_PER_DAY == DAY_START_UTC_OFFSET, "EmissionController: genesis not SGT noon");

        genesisTimestamp = genesisTimestamp_;

        uint256 genesisDayNumber = SgtCalendar.dayNumberOf(genesisTimestamp_);
        (uint256 y0, uint256 m0, ) = SgtCalendar.civilFromDays(genesisDayNumber);
        uint256 genesisMonth = SgtCalendar.monthIndex(y0, m0);

        uint256[5] memory endMonths = [PHASE1_END_MONTH, PHASE2_END_MONTH, PHASE3_END_MONTH, PHASE4_END_MONTH, PHASE5_END_MONTH];
        for (uint256 p = 0; p < PHASES; p++) {
            (uint256 y, uint256 m) = SgtCalendar.monthFromIndex(genesisMonth + endMonths[p] - 1);
            uint256 lastDate = SgtCalendar.daysFromCivil(y, m, SgtCalendar.daysInMonth(y, m));
            phaseEndDay[p] = lastDate - genesisDayNumber + 1;
        }

        emit GenesisSet(genesisTimestamp_, phaseEndDay);
    }

    function setInsuranceTreasury(address insuranceTreasury_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(insuranceTreasury_ != address(0), "EmissionController: zero treasury");
        insuranceTreasury = insuranceTreasury_;
        emit InsuranceTreasurySet(insuranceTreasury_);
    }

    function setComputingVault(address computingVault_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(computingVault_ != address(0), "EmissionController: zero computing vault");
        computingVault = computingVault_;
        emit ComputingVaultSet(computingVault_);
    }

    function setCommunityEngine(address communityEngine_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(communityEngine_ != address(0), "EmissionController: zero community engine");
        communityEngine = communityEngine_;
        emit CommunityEngineSet(communityEngine_);
    }

    // ============ Settlement ============

    function settleDay(uint256 dayId) external override onlyRole(KEEPER_ROLE) nonReentrant {
        require(dayId == lastSettledDay + 1, "EmissionController: not next day");
        _settle(dayId);
    }

    function settleUpTo(uint256 maxDays) external override onlyRole(KEEPER_ROLE) nonReentrant returns (uint256 settled) {
        while (settled < maxDays && _dayEnded(lastSettledDay + 1)) {
            _settle(lastSettledDay + 1);
            settled++;
        }
    }

    function _settle(uint256 dayId) internal {
        require(_dayEnded(dayId), "EmissionController: day not ended");

        uint256 budget = dayBudget(dayId);
        uint256 holding = budget * HOLDING_BPS / BPS;
        uint256 community = budget - holding;

        uint256 undistributed;
        if (holding > 0) {
            IERC20(gg).forceApprove(computingVault, holding);
            undistributed = IComputingVault(computingVault).notifyHoldingReward(dayId, holding);
            IERC20(gg).forceApprove(computingVault, 0);
            require(undistributed <= holding, "EmissionController: undistributed above holding");
        }

        if (community > 0) {
            IERC20(gg).forceApprove(communityEngine, community);
            ICommunityEngine(communityEngine).notifyCommunityBudget(dayId, community);
            IERC20(gg).forceApprove(communityEngine, 0);
        }

        if (undistributed > 0) {
            IERC20(gg).forceApprove(insuranceTreasury, undistributed);
            IInsuranceTreasury(insuranceTreasury).credit(undistributed, TAG_UNUSED_EMISSION);
            IERC20(gg).forceApprove(insuranceTreasury, 0);
        }

        lastSettledDay = dayId;
        isSettled[dayId] = true;

        emit DailySettled(dayId, budget, holding - undistributed, community, undistributed);
    }

    // ============ Views ============

    function currentDay() external view override returns (uint256) {
        if (genesisTimestamp == 0 || block.timestamp < genesisTimestamp) {
            return 0;
        }
        return (block.timestamp - genesisTimestamp) / SECONDS_PER_DAY + 1;
    }

    function dayStart(uint256 dayId) public view override returns (uint256) {
        require(genesisTimestamp != 0, "EmissionController: genesis not set");
        require(dayId >= 1, "EmissionController: day 0");
        return genesisTimestamp + (dayId - 1) * SECONDS_PER_DAY;
    }

    function dayEnd(uint256 dayId) public view override returns (uint256) {
        return dayStart(dayId) + SECONDS_PER_DAY;
    }

    function monthOf(uint256 dayId) external view override returns (uint256) {
        (uint256 y0, uint256 m0, ) = SgtCalendar.civilOf(genesisTimestamp);
        (uint256 y, uint256 m, ) = SgtCalendar.civilOf(dayStart(dayId));
        return SgtCalendar.monthIndex(y, m) - SgtCalendar.monthIndex(y0, m0) + 1;
    }

    function cumulativeBudget(uint256 dayId) public view override returns (uint256) {
        require(genesisTimestamp != 0, "EmissionController: genesis not set");
        if (dayId == 0) {
            return 0;
        }

        uint256[5] memory budgets = [PHASE1_BUDGET, PHASE2_BUDGET, PHASE3_BUDGET, PHASE4_BUDGET, PHASE5_BUDGET];
        uint256 cumulative;
        uint256 phaseStart = 1;
        for (uint256 p = 0; p < PHASES; p++) {
            uint256 phaseEnd = phaseEndDay[p];
            if (dayId > phaseEnd) {
                cumulative += budgets[p];
                phaseStart = phaseEnd + 1;
                continue;
            }
            uint256 daysInPhase = phaseEnd - phaseStart + 1;
            return cumulative + budgets[p] * (dayId - phaseStart + 1) / daysInPhase;
        }
        return TOTAL_BUDGET;
    }

    function dayBudget(uint256 dayId) public view override returns (uint256) {
        require(dayId >= 1, "EmissionController: day 0");
        return cumulativeBudget(dayId) - cumulativeBudget(dayId - 1);
    }

    // ============ Internal ============

    function _dayEnded(uint256 dayId) internal view returns (bool) {
        return genesisTimestamp != 0 && block.timestamp >= dayEnd(dayId);
    }
}
