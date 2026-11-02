// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.8.24;

import {AccessControlEnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/extensions/AccessControlEnumerableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "./interface/ITierStaking.sol";
import "./interface/IOracleAdapter.sol";

/**
 * @title TierStaking
 * @notice G1-G7 tier by locked GG (spec §05). Value = locked GG x live GG
 *         USDT price, re-evaluated as the price moves. A drop in value or an
 *         unlock downgrades. Locked GG is never released linearly and earns
 *         nothing; no veGG, no dividend, no vote. The community condition
 *         of each tier (spec §05) is assessed off-chain (spec §13); this
 *         contract exposes the stake tier only.
 */
contract TierStaking is AccessControlEnumerableUpgradeable, ReentrancyGuardUpgradeable, ITierStaking {
    using SafeERC20 for IERC20;

    uint256 public constant IMPL_REV = 1;

    uint8 public constant MAX_TIER = 7;

    // Minimum locked GG value in USDT (18 decimals) per tier.
    uint256 public constant G1_STAKE_USDT = 1_000 ether;
    uint256 public constant G2_STAKE_USDT = 3_000 ether;
    uint256 public constant G3_STAKE_USDT = 5_000 ether;
    uint256 public constant G4_STAKE_USDT = 8_000 ether;
    uint256 public constant G5_STAKE_USDT = 10_000 ether;
    uint256 public constant G6_STAKE_USDT = 15_000 ether;
    uint256 public constant G7_STAKE_USDT = 20_000 ether;

    // ============ Storage ============

    address public gg;
    address public oracle;
    address public community;

    mapping(address => uint256) public override lockedOf;
    uint256 public totalLocked;

    /// @notice Tier last emitted through TierChanged.
    mapping(address => uint8) public recordedTier;

    uint256[50] private __gap;

    // ============ Initializable ============

    function initialize(address gg_, address oracle_, address community_) external initializer {
        __AccessControlEnumerable_init();
        __ReentrancyGuard_init();
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);

        gg = gg_;
        oracle = oracle_;
        community = community_;
    }

    // ============ Lock ============

    function stakeTierGG(uint256 amount) external override nonReentrant {
        require(amount > 0, "TierStaking: zero amount");
        IERC20(gg).safeTransferFrom(msg.sender, address(this), amount);
        lockedOf[msg.sender] += amount;
        totalLocked += amount;
        emit TierStaked(msg.sender, amount);
        _syncTier(msg.sender);
    }

    function unstakeTierGG(uint256 amount) external override nonReentrant {
        require(amount > 0, "TierStaking: zero amount");
        require(lockedOf[msg.sender] >= amount, "TierStaking: insufficient locked");
        lockedOf[msg.sender] -= amount;
        totalLocked -= amount;
        IERC20(gg).safeTransfer(msg.sender, amount);
        emit TierUnstaked(msg.sender, amount);
        _syncTier(msg.sender);
    }

    function syncTier(address account) external override {
        _syncTier(account);
    }

    // ============ Views ============

    function lockedValueUSDT(address account) public view override returns (uint256) {
        return IOracleAdapter(oracle).valueUSDT(gg, lockedOf[account]);
    }

    function stakeTierOf(address account) public view override returns (uint8) {
        uint256 value = lockedValueUSDT(account);
        if (value >= G7_STAKE_USDT) return 7;
        if (value >= G6_STAKE_USDT) return 6;
        if (value >= G5_STAKE_USDT) return 5;
        if (value >= G4_STAKE_USDT) return 4;
        if (value >= G3_STAKE_USDT) return 3;
        if (value >= G2_STAKE_USDT) return 2;
        if (value >= G1_STAKE_USDT) return 1;
        return 0;
    }

    // ============ Internal ============

    function _syncTier(address account) internal {
        uint8 tier = stakeTierOf(account);
        uint8 recorded = recordedTier[account];
        if (tier != recorded) {
            recordedTier[account] = tier;
            emit TierChanged(account, recorded, tier);
        }
    }
}
