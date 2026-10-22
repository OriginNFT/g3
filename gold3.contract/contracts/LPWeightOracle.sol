// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.8.24;

import {AccessControlEnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/extensions/AccessControlEnumerableUpgradeable.sol";

import "./interface/ILPWeightOracle.sol";

/**
 * @title LPWeightOracle
 * @notice USDT value of LP for the reward weights (spec §07):
 *           userReward = distributable x userLPValueUSDT / totalEligibleLPValueUSDT
 *         Must not read an unprotected single-block spot price.
 * @dev Skeleton: signatures and storage only.
 */
contract LPWeightOracle is AccessControlEnumerableUpgradeable, ILPWeightOracle {
    uint256 public constant IMPL_REV = 1;

    // ============ Storage ============

    address public oracle;

    uint256[50] private __gap;

    // ============ Initializable ============

    function initialize(address oracle_) external initializer {
        __AccessControlEnumerable_init();
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);

        oracle = oracle_;
    }

    function update(address pool) external override {}

    function lpValueUSDT(address pool, uint256 lpAmount) external view override returns (uint256) {}
}
