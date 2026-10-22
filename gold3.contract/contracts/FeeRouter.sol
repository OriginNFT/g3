// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.8.24;

import {AccessControlEnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/extensions/AccessControlEnumerableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

import "./interface/IFeeRouter.sol";

/**
 * @title FeeRouter
 * @notice Per-path fee split (spec §08, §10), each source booked separately:
 *           turbine 2.5%  GOT2 buyback-burn 0.5 | GG buyback-burn 0.5 | AUG buyback-burn 0.5 | LP 1
 *           sell    3%    eco reserve 1 | community building 1 | LP 1
 *         Sell sources: USDT/GG, GOT2/GG, AUG/GG.
 * @dev Skeleton: signatures and storage only.
 */
contract FeeRouter is AccessControlEnumerableUpgradeable, ReentrancyGuardUpgradeable, IFeeRouter {
    uint256 public constant IMPL_REV = 1;

    bytes32 public constant COLLECTOR_ROLE = keccak256("COLLECTOR_ROLE");

    uint256 public constant BPS = 10_000;

    uint256 public constant TURBINE_FEE_BPS = 250;
    uint256 public constant TURBINE_GOT2_BUYBACK_BPS = 50;
    uint256 public constant TURBINE_GG_BUYBACK_BPS = 50;
    uint256 public constant TURBINE_AUG_BUYBACK_BPS = 50;
    uint256 public constant TURBINE_LP_BPS = 100;

    uint256 public constant SELL_FEE_BPS = 300;
    uint256 public constant SELL_ECO_RESERVE_BPS = 100;
    uint256 public constant SELL_COMMUNITY_BPS = 100;
    uint256 public constant SELL_LP_BPS = 100;

    bytes32 public constant SOURCE_TURBINE = keccak256("TURBINE");
    bytes32 public constant SOURCE_USDT_GG_SELL = keccak256("USDT_GG_SELL");
    bytes32 public constant SOURCE_GOT2_GG_SELL = keccak256("GOT2_GG_SELL");
    bytes32 public constant SOURCE_AUG_GG_SELL = keccak256("AUG_GG_SELL");

    bytes32 public constant PURPOSE_GOT2_BUYBACK = keccak256("GOT2_BUYBACK");
    bytes32 public constant PURPOSE_GG_BUYBACK = keccak256("GG_BUYBACK");
    bytes32 public constant PURPOSE_AUG_BUYBACK = keccak256("AUG_BUYBACK");
    bytes32 public constant PURPOSE_LP_INCENTIVE = keccak256("LP_INCENTIVE");
    bytes32 public constant PURPOSE_ECO_RESERVE = keccak256("ECO_RESERVE");
    bytes32 public constant PURPOSE_COMMUNITY_BUILDING = keccak256("COMMUNITY_BUILDING");

    // ============ Storage ============

    address public buybackExecutor;
    address public lpStakeVault;
    address public ecoReserve;
    address public communityBuilding;

    uint256[50] private __gap;

    // ============ Initializable ============

    function initialize(
        address buybackExecutor_,
        address lpStakeVault_,
        address ecoReserve_,
        address communityBuilding_
    ) external initializer {
        __AccessControlEnumerable_init();
        __ReentrancyGuard_init();
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);

        buybackExecutor = buybackExecutor_;
        lpStakeVault = lpStakeVault_;
        ecoReserve = ecoReserve_;
        communityBuilding = communityBuilding_;
    }

    // ============ Routing ============

    function routeTurbineFee(address token, uint256 amount) external override onlyRole(COLLECTOR_ROLE) nonReentrant {}

    function routeSellFee(
        bytes32 source,
        address token,
        uint256 amount
    ) external override onlyRole(COLLECTOR_ROLE) nonReentrant {}
}
