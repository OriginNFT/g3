// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.8.24;

import {AccessControlEnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/extensions/AccessControlEnumerableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

import "./interface/IProtectionVault.sol";

/**
 * @title ProtectionVault
 * @notice Price-protection pool: 5% of the participation funds actually
 *         received (spec §04). BUYER_ROLE is the whitelist that may spend it
 *         on market buys.
 * @dev Skeleton: signatures and storage only. Trigger and authorization are open items (spec §13).
 */
contract ProtectionVault is AccessControlEnumerableUpgradeable, ReentrancyGuardUpgradeable, IProtectionVault {
    uint256 public constant IMPL_REV = 1;

    bytes32 public constant DEPOSITOR_ROLE = keccak256("DEPOSITOR_ROLE");
    bytes32 public constant BUYER_ROLE = keccak256("BUYER_ROLE");

    // ============ Storage ============

    address public usdt;
    address public router;

    uint256 public totalDeposited;
    uint256 public totalSpent;

    uint256[50] private __gap;

    // ============ Initializable ============

    function initialize(address usdt_, address router_) external initializer {
        __AccessControlEnumerable_init();
        __ReentrancyGuard_init();
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);

        usdt = usdt_;
        router = router_;
    }

    // ============ Flows ============

    function deposit(uint256 amount) external override onlyRole(DEPOSITOR_ROLE) nonReentrant {}

    function buy(
        address[] calldata path,
        uint256 amountIn,
        uint256 minOut
    ) external override onlyRole(BUYER_ROLE) nonReentrant returns (uint256 amountOut) {}

    function balance() external view override returns (uint256) {}
}
