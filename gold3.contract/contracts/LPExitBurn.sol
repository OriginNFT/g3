// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.8.24;

import {AccessControlEnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/extensions/AccessControlEnumerableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

import "./interface/ILPExitBurn.sol";

/**
 * @title LPExitBurn
 * @notice Stepped exit burn of the ecosystem pools (spec §09). The LP is
 *         removed first and BOTH underlying tokens are burnt in the same ratio;
 *         burning only the LP token is not allowed.
 *           day 1-30  25% | 31-60  20% | 61-90  15% | 91-120  10% | 121+  5% forever
 * @dev Skeleton: signatures and storage only.
 */
contract LPExitBurn is AccessControlEnumerableUpgradeable, ReentrancyGuardUpgradeable, ILPExitBurn {
    uint256 public constant IMPL_REV = 1;

    bytes32 public constant VAULT_ROLE = keccak256("VAULT_ROLE");

    uint256 public constant BPS = 10_000;

    uint256 public constant TIER1_MAX_DAYS = 30;
    uint256 public constant TIER2_MAX_DAYS = 60;
    uint256 public constant TIER3_MAX_DAYS = 90;
    uint256 public constant TIER4_MAX_DAYS = 120;

    uint256 public constant TIER1_BURN_BPS = 2_500;
    uint256 public constant TIER2_BURN_BPS = 2_000;
    uint256 public constant TIER3_BURN_BPS = 1_500;
    uint256 public constant TIER4_BURN_BPS = 1_000;
    uint256 public constant FLOOR_BURN_BPS = 500;

    // ============ Storage ============

    address public router;

    uint256[50] private __gap;

    // ============ Initializable ============

    function initialize(address router_) external initializer {
        __AccessControlEnumerable_init();
        __ReentrancyGuard_init();
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);

        router = router_;
    }

    function burnBpsFor(uint256 heldDays) external pure override returns (uint256) {}

    function exitAndBurn(
        address pool,
        uint256 lpAmount,
        uint256 heldDays,
        address to,
        uint256 minA,
        uint256 minB
    ) external override onlyRole(VAULT_ROLE) nonReentrant returns (uint256 returnedA, uint256 returnedB) {}
}
