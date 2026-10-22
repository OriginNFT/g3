// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.8.24;

import {AccessControlEnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/extensions/AccessControlEnumerableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

import "./interface/IReserveVault.sol";

/**
 * @title ReserveVault
 * @notice Protocol reserve pool: 95% of the participation funds actually
 *         received (spec §04), held for the base pool and injected on plan.
 * @dev Skeleton: signatures and storage only. The injection plan is an open item (spec §13).
 */
contract ReserveVault is AccessControlEnumerableUpgradeable, ReentrancyGuardUpgradeable, IReserveVault {
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

        usdt = usdt_;
    }

    // ============ Flows ============

    function deposit(uint256 amount) external override onlyRole(DEPOSITOR_ROLE) nonReentrant {}

    function withdraw(address to, uint256 amount, bytes32 memo) external override onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant {}

    function balance() external view override returns (uint256) {}
}
