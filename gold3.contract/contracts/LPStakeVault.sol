// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.8.24;

import {AccessControlEnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/extensions/AccessControlEnumerableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

import "./interface/ILPStakeVault.sol";

/**
 * @title LPStakeVault
 * @notice LP staking of the two ecosystem pools, GOT2/GG and AUG/GG (spec §07-09).
 *         USDT/GG is not eligible. Staked LP earns two things, both shared by
 *         USDT-valued LP weight:
 *           - the LP share of the trading fees (FeeRouter)
 *           - the GG dynamic airdrop (InsuranceTreasury)
 *         Exiting goes through LPExitBurn, stepped by each batch's holding time.
 * @dev Skeleton: signatures and storage only.
 */
contract LPStakeVault is AccessControlEnumerableUpgradeable, ReentrancyGuardUpgradeable, ILPStakeVault {
    uint256 public constant IMPL_REV = 1;

    bytes32 public constant FEE_ROLE = keccak256("FEE_ROLE");
    bytes32 public constant AIRDROP_ROLE = keccak256("AIRDROP_ROLE");

    // ============ Storage ============

    address public gg;
    address public weightOracle;
    address public exitBurn;

    mapping(address => bool) public override isEligiblePool;

    mapping(address => mapping(address => Batch[])) internal _batches;
    mapping(address => mapping(address => uint256)) public override stakedOf;

    uint256[50] private __gap;

    // ============ Initializable ============

    function initialize(
        address gg_,
        address weightOracle_,
        address exitBurn_,
        address got2GgPool_,
        address augGgPool_
    ) external initializer {
        __AccessControlEnumerable_init();
        __ReentrancyGuard_init();
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);

        gg = gg_;
        weightOracle = weightOracle_;
        exitBurn = exitBurn_;
        isEligiblePool[got2GgPool_] = true;
        isEligiblePool[augGgPool_] = true;
    }

    // ============ Stake / exit ============

    function stakeLP(address pool, uint256 amount) external override nonReentrant {}

    function exitLP(address pool, uint256 amount) external override nonReentrant {}

    // ============ Rewards ============

    function claimLPFees() external override nonReentrant {}

    function claimLPAirdrop() external override nonReentrant returns (uint256 amount) {}

    function notifyFees(address token, uint256 amount) external override onlyRole(FEE_ROLE) {}

    function notifyAirdrop(uint256 dayId, uint256 amount) external override onlyRole(AIRDROP_ROLE) {}

    // ============ Views ============

    function batchesOf(address account, address pool) external view override returns (Batch[] memory) {}

    function pendingLPFees(address account, address token) external view override returns (uint256) {}

    function pendingLPAirdrop(address account) external view override returns (uint256) {}
}
