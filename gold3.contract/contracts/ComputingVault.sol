// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.8.24;

import {AccessControlEnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/extensions/AccessControlEnumerableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

import "./interface/IComputingVault.sol";

/**
 * @title ComputingVault
 * @notice Power positions (spec §04):
 *           USDT        2.5x of the USDT received
 *           GOT2 burn   2x   of the USDT value at burn time, really burnt
 *           GG burn     2.5x of the USDT value at burn time, really burnt
 *         Cash actually received is split 95% ReserveVault / 5% ProtectionVault.
 *         Burnt tokens are never booked as received USDT.
 *         Also receives the daily holding 50% of the emission.
 * @dev Skeleton: signatures and storage only.
 */
contract ComputingVault is AccessControlEnumerableUpgradeable, ReentrancyGuardUpgradeable, IComputingVault {
    uint256 public constant IMPL_REV = 1;

    bytes32 public constant EMISSION_ROLE = keccak256("EMISSION_ROLE");

    uint256 public constant BPS = 10_000;

    uint256 public constant USDT_POWER_BPS = 25_000;
    uint256 public constant GOT2_BURN_POWER_BPS = 20_000;
    uint256 public constant GG_BURN_POWER_BPS = 25_000;

    uint256 public constant RESERVE_BPS = 9_500;
    uint256 public constant PROTECTION_BPS = 500;

    // ============ Storage ============

    address public usdt;
    address public got2;
    address public gg;
    address public oracle;
    address public reserveVault;
    address public protectionVault;

    uint256 public nextPositionId;
    mapping(uint256 => Position) internal _positions;
    mapping(address => uint256[]) internal _positionIds;

    mapping(address => uint256) public override powerOf;
    uint256 public override totalPower;

    uint256[50] private __gap;

    // ============ Initializable ============

    function initialize(
        address usdt_,
        address got2_,
        address gg_,
        address oracle_,
        address reserveVault_,
        address protectionVault_
    ) external initializer {
        __AccessControlEnumerable_init();
        __ReentrancyGuard_init();
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);

        usdt = usdt_;
        got2 = got2_;
        gg = gg_;
        oracle = oracle_;
        reserveVault = reserveVault_;
        protectionVault = protectionVault_;
    }

    // ============ Participation ============

    function participate(
        address asset,
        uint256 amount,
        uint256 minPower
    ) external override nonReentrant returns (uint256 positionId) {}

    // ============ Holding reward ============

    function notifyHoldingReward(uint256 dayId, uint256 amount) external override onlyRole(EMISSION_ROLE) nonReentrant {}

    function claimHoldingReward() external override nonReentrant returns (uint256 amount) {}

    // ============ Views ============

    function pendingHoldingReward(address account) external view override returns (uint256) {}

    function getPosition(uint256 positionId) external view override returns (Position memory) {}

    function positionIdsOf(address account) external view override returns (uint256[] memory) {}
}
