// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.8.24;

import {AccessControlEnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/extensions/AccessControlEnumerableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "./interface/ICommunityEngine.sol";
import "./interface/IInsuranceTreasury.sol";
import "./interface/ITurbine.sol";

/**
 * @title CommunityEngine
 * @notice Receives the daily community 50% of the emission and splits it
 *         30 expansion / 30 collaboration / 30 contribution / 5 DAO building /
 *         5 platform (spec §02). The three 30% buckets are credited to
 *         accounts by the accountant keeper (the community assessment is
 *         off-chain, spec §13); the two 5% buckets go to fixed accounts at
 *         settlement. What a day's buckets never credit is routed to the
 *         InsuranceTreasury when the day is closed. Credits are paid out by
 *         ClaimController and delivered to the turbine, never straight to
 *         the user.
 */
contract CommunityEngine is AccessControlEnumerableUpgradeable, ReentrancyGuardUpgradeable, ICommunityEngine {
    using SafeERC20 for IERC20;

    uint256 public constant IMPL_REV = 1;

    bytes32 public constant EMISSION_ROLE = keccak256("EMISSION_ROLE");
    bytes32 public constant CLAIM_ROLE = keccak256("CLAIM_ROLE");
    bytes32 public constant ACCOUNTANT_ROLE = keccak256("ACCOUNTANT_ROLE");

    bytes32 public constant TAG_UNUSED_COMMUNITY = keccak256("UNUSED_COMMUNITY");

    uint256 public constant BPS = 10_000;

    uint256 public constant EXPANSION_BPS = 3_000;
    uint256 public constant COLLABORATION_BPS = 3_000;
    uint256 public constant CONTRIBUTION_BPS = 3_000;
    uint256 public constant DAO_BUILDING_BPS = 500;
    uint256 public constant PLATFORM_BPS = 500;

    uint8 public constant BUCKET_EXPANSION = 0;
    uint8 public constant BUCKET_COLLABORATION = 1;
    uint8 public constant BUCKET_CONTRIBUTION = 2;
    uint8 public constant BUCKET_DAO_BUILDING = 3;
    uint8 public constant BUCKET_PLATFORM = 4;

    // ============ Storage ============

    address public gg;
    address public insuranceTreasury;
    address public turbine;
    address public daoBuildingAccount;
    address public platformAccount;

    uint256 public override lastSettledDay;
    mapping(uint256 => uint256) public override communityBudgetOf;
    mapping(uint256 => mapping(uint8 => uint256)) internal _bucketBudget;
    mapping(uint256 => mapping(uint8 => uint256)) internal _bucketCredited;
    mapping(uint256 => bool) public override isClosed;
    mapping(address => uint256) public override creditsOf;

    uint256[50] private __gap;

    // ============ Initializable ============

    function initialize(address gg_, address insuranceTreasury_) external initializer {
        __AccessControlEnumerable_init();
        __ReentrancyGuard_init();
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);

        gg = gg_;
        insuranceTreasury = insuranceTreasury_;
    }

    // ============ Admin ============

    function setTurbine(address turbine_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        turbine = turbine_;
        emit TurbineSet(turbine_);
    }

    function setDaoBuildingAccount(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        daoBuildingAccount = account;
        emit DaoBuildingAccountSet(account);
    }

    function setPlatformAccount(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        platformAccount = account;
        emit PlatformAccountSet(account);
    }

    // ============ Budget ============

    function notifyCommunityBudget(uint256 dayId, uint256 amount) external override onlyRole(EMISSION_ROLE) nonReentrant {
        require(dayId == lastSettledDay + 1, "CommunityEngine: day out of order");
        require(daoBuildingAccount != address(0), "CommunityEngine: dao building account not set");
        require(platformAccount != address(0), "CommunityEngine: platform account not set");

        if (amount > 0) {
            IERC20(gg).safeTransferFrom(msg.sender, address(this), amount);
        }

        uint256 expansion = amount * EXPANSION_BPS / BPS;
        uint256 collaboration = amount * COLLABORATION_BPS / BPS;
        uint256 contribution = amount * CONTRIBUTION_BPS / BPS;
        uint256 daoBuilding = amount * DAO_BUILDING_BPS / BPS;
        uint256 platform = amount - expansion - collaboration - contribution - daoBuilding;

        lastSettledDay = dayId;
        communityBudgetOf[dayId] = amount;
        _bucketBudget[dayId][BUCKET_EXPANSION] = expansion;
        _bucketBudget[dayId][BUCKET_COLLABORATION] = collaboration;
        _bucketBudget[dayId][BUCKET_CONTRIBUTION] = contribution;
        _bucketBudget[dayId][BUCKET_DAO_BUILDING] = daoBuilding;
        _bucketBudget[dayId][BUCKET_PLATFORM] = platform;

        emit CommunityBudgetAllocated(dayId, expansion, collaboration, contribution, daoBuilding, platform);

        _credit(dayId, BUCKET_DAO_BUILDING, daoBuildingAccount, daoBuilding);
        _credit(dayId, BUCKET_PLATFORM, platformAccount, platform);
    }

    function credit(
        uint256 dayId,
        uint8 bucket,
        address[] calldata accounts,
        uint256[] calldata amounts
    ) external override onlyRole(ACCOUNTANT_ROLE) nonReentrant {
        require(dayId != 0 && dayId <= lastSettledDay, "CommunityEngine: day not settled");
        require(!isClosed[dayId], "CommunityEngine: day closed");
        require(bucket <= BUCKET_CONTRIBUTION, "CommunityEngine: bucket not creditable");
        require(accounts.length == amounts.length, "CommunityEngine: length mismatch");

        for (uint256 i = 0; i < accounts.length; i++) {
            _credit(dayId, bucket, accounts[i], amounts[i]);
        }
    }

    function closeDay(uint256 dayId) external override onlyRole(ACCOUNTANT_ROLE) nonReentrant {
        require(dayId != 0 && dayId <= lastSettledDay, "CommunityEngine: day not settled");
        require(!isClosed[dayId], "CommunityEngine: day closed");

        uint256 credited;
        for (uint8 b = BUCKET_EXPANSION; b <= BUCKET_PLATFORM; b++) {
            credited += _bucketCredited[dayId][b];
        }
        uint256 leftover = communityBudgetOf[dayId] - credited;
        isClosed[dayId] = true;

        if (leftover > 0) {
            IERC20(gg).forceApprove(insuranceTreasury, leftover);
            IInsuranceTreasury(insuranceTreasury).credit(leftover, TAG_UNUSED_COMMUNITY);
        }
        emit CommunityDayClosed(dayId, credited, leftover);
    }

    function payout(address to, uint256 amount) external override onlyRole(CLAIM_ROLE) nonReentrant {
        require(turbine != address(0), "CommunityEngine: turbine not set");
        require(amount > 0, "CommunityEngine: zero amount");
        require(creditsOf[to] >= amount, "CommunityEngine: insufficient credits");

        creditsOf[to] -= amount;
        IERC20(gg).forceApprove(turbine, amount);
        ITurbine(turbine).creditClaimed(to, amount);
        emit CommunityPaid(to, amount);
    }

    // ============ Views ============

    function bucketBudgetOf(uint256 dayId, uint8 bucket) external view override returns (uint256) {
        return _bucketBudget[dayId][bucket];
    }

    function bucketCreditedOf(uint256 dayId, uint8 bucket) external view override returns (uint256) {
        return _bucketCredited[dayId][bucket];
    }

    // ============ Internal ============

    function _credit(uint256 dayId, uint8 bucket, address account, uint256 amount) internal {
        if (amount == 0) {
            return;
        }
        require(account != address(0), "CommunityEngine: zero account");
        uint256 credited = _bucketCredited[dayId][bucket] + amount;
        require(credited <= _bucketBudget[dayId][bucket], "CommunityEngine: bucket budget exceeded");
        _bucketCredited[dayId][bucket] = credited;
        creditsOf[account] += amount;
        emit CommunityCredited(dayId, bucket, account, amount);
    }
}
