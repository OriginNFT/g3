// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.8.24;

import {AccessControlEnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/extensions/AccessControlEnumerableUpgradeable.sol";

import "./interface/IOracleAdapter.sol";

/**
 * @title OracleAdapter
 * @notice USDT prices of GG / GOT2 / AUG for power, tier, rights and claims.
 *         Manipulation-resistant: no unprotected single-block spot price (spec §07).
 * @dev Skeleton: signatures and storage only. The price source is an open item (spec §13).
 */
contract OracleAdapter is AccessControlEnumerableUpgradeable, IOracleAdapter {
    uint256 public constant IMPL_REV = 1;

    // ============ Storage ============

    address public usdt;

    uint256[50] private __gap;

    // ============ Initializable ============

    function initialize(address usdt_) external initializer {
        __AccessControlEnumerable_init();
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);

        usdt = usdt_;
    }

    function update() external override {}

    function priceUSDT(address token) external view override returns (uint256) {}

    function valueUSDT(address token, uint256 amount) external view override returns (uint256) {}
}
