// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.8.24;

import {AccessControlEnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/extensions/AccessControlEnumerableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "./interface/IReserveVault.sol";

/**
 * @title ReserveVault
 * @notice Protocol reserve pool: 95% of the participation funds actually
 *         received (spec §04), held for the base pool and injected on plan.
 * @dev Inflows are USDT pull-deposits by DEPOSITOR_ROLE (ComputingVault).
 *      Outflows are admin-only withdraw() calls, each recorded with a memo so
 *      the injection plan (open item, spec §13) can sit behind a timelock
 *      later without changing this contract. balance() reads the live ERC20
 *      balance so untagged transfers in are covered too.
 *
 *      Upgradeable (Transparent proxy). Roles: DEFAULT_ADMIN_ROLE (withdraw,
 *      role management), DEPOSITOR_ROLE (deposit).
 */
contract ReserveVault is AccessControlEnumerableUpgradeable, ReentrancyGuardUpgradeable, IReserveVault {
    using SafeERC20 for IERC20;

    uint256 public constant IMPL_REV = 1;

    bytes32 public constant DEPOSITOR_ROLE = keccak256("DEPOSITOR_ROLE");

    // ============ Storage ============

    address public usdt;

    uint256 public totalDeposited;
    uint256 public totalWithdrawn;

    uint256[50] private __gap;

    // ============ Initializable ============

    function initialize(address usdt_) external initializer {
        __AccessControlEnumerable_init();
        __ReentrancyGuard_init();
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);

        require(usdt_ != address(0), "ReserveVault: zero usdt");
        usdt = usdt_;
    }

    // ============ Flows ============

    /// @notice Pull `amount` USDT from the calling depositor. DEPOSITOR_ROLE only.
    ///         The caller must have approved this contract first.
    function deposit(uint256 amount) external override onlyRole(DEPOSITOR_ROLE) nonReentrant {
        require(amount > 0, "ReserveVault: zero amount");

        IERC20(usdt).safeTransferFrom(msg.sender, address(this), amount);
        totalDeposited += amount;

        emit ReserveDeposited(msg.sender, amount);
    }

    /// @notice Send `amount` USDT to `to`; `memo` labels the withdrawal for the indexer. Admin only.
    function withdraw(address to, uint256 amount, bytes32 memo) external override onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant {
        require(to != address(0), "ReserveVault: zero recipient");
        require(amount > 0, "ReserveVault: zero amount");

        IERC20(usdt).safeTransfer(to, amount);
        totalWithdrawn += amount;

        emit ReserveWithdrawn(to, amount, memo);
    }

    // ============ Views ============

    /// @notice USDT currently held.
    function balance() external view override returns (uint256) {
        return IERC20(usdt).balanceOf(address(this));
    }
}
