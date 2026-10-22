// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.8.24;

import {AccessControlEnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/extensions/AccessControlEnumerableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

import "./interface/ITierStaking.sol";

/**
 * @title TierStaking
 * @notice G1-G7 tier by locked GG (spec §05). Value = locked GG x live GG
 *         USDT price, re-evaluated as the price moves. A drop in value or an
 *         unlock downgrades. Locked GG is never released linearly and earns
 *         nothing; no veGG, no dividend, no vote.
 * @dev Skeleton: signatures and storage only.
 */
contract TierStaking is AccessControlEnumerableUpgradeable, ReentrancyGuardUpgradeable, ITierStaking {
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

    function stakeTierGG(uint256 amount) external override nonReentrant {}

    function unstakeTierGG(uint256 amount) external override nonReentrant {}

    function syncTier(address account) external override {}

    // ============ Views ============

    function lockedValueUSDT(address account) external view override returns (uint256) {}

    function stakeTierOf(address account) external view override returns (uint8) {}
}
