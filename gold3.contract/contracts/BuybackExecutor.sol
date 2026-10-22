// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.8.24;

import {AccessControlEnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/extensions/AccessControlEnumerableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

import "./interface/IBuybackExecutor.sol";

/**
 * @title BuybackExecutor
 * @notice Buyback and real burn of GOT2 / GG / AUG (spec §10), behind a slippage
 *         limit, a path whitelist and a per-call maximum.
 * @dev Skeleton: signatures and storage only.
 */
contract BuybackExecutor is AccessControlEnumerableUpgradeable, ReentrancyGuardUpgradeable, IBuybackExecutor {
    uint256 public constant IMPL_REV = 1;

    bytes32 public constant KEEPER_ROLE = keccak256("KEEPER_ROLE");

    uint256 public constant BPS = 10_000;

    // ============ Storage ============

    address public router;
    uint256 public maxSingleAmount;
    uint256 public maxSlippageBps;

    mapping(bytes32 => bool) public allowedPath;

    uint256[50] private __gap;

    // ============ Initializable ============

    function initialize(address router_) external initializer {
        __AccessControlEnumerable_init();
        __ReentrancyGuard_init();
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);

        router = router_;
    }

    // ============ Buyback ============

    function executeBuyback(
        address[] calldata path,
        uint256 amountIn,
        uint256 minOut
    ) external override onlyRole(KEEPER_ROLE) nonReentrant returns (uint256 amountOut) {}

    // ============ Admin ============

    function setPathAllowed(address[] calldata path, bool allowed) external override onlyRole(DEFAULT_ADMIN_ROLE) {}

    function setMaxSingleAmount(uint256 amount) external override onlyRole(DEFAULT_ADMIN_ROLE) {}

    function setMaxSlippageBps(uint256 bps) external override onlyRole(DEFAULT_ADMIN_ROLE) {}
}
