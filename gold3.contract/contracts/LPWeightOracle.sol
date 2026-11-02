// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.8.24;

import {AccessControlEnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/extensions/AccessControlEnumerableUpgradeable.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

import "./interface/ILPWeightOracle.sol";
import "./interface/IOracleAdapter.sol";
import "./interface/IUniswapV2.sol";

/// @dev Minimal ERC20 decimals surface, used to scale reserves to whole tokens.
interface IERC20DecimalsLP {
    function decimals() external view returns (uint8);
}

/**
 * @title LPWeightOracle
 * @notice USDT value of LP for the reward weights (spec §07):
 *           userReward = distributable x userLPValueUSDT / totalEligibleLPValueUSDT
 * @dev Fair LP pricing: the pool's value is taken as 2 x sqrt(v0 x v1) where
 *      vX is the USDT value of reserve X at the OracleAdapter TWAP price, not
 *      v0 + v1. Because r0 x r1 (k) is invariant under a swap, a flash-loan
 *      that skews the reserves inside one block cannot move this value; only
 *      the TWAP prices enter, so no unprotected single-block spot price is
 *      read (spec §07). lpValueUSDT(pool, amount) = poolValue x amount /
 *      totalSupply; 0 for an empty pool or a zero amount.
 *
 *      update(pool) refreshes the adapter's TWAPs and emits the current LP
 *      price so an indexer can chart it; nothing is stored here.
 *
 *      Upgradeable (Transparent proxy). DEFAULT_ADMIN_ROLE re-points the adapter.
 */
contract LPWeightOracle is AccessControlEnumerableUpgradeable, ILPWeightOracle {
    uint256 public constant IMPL_REV = 1;

    uint256 private constant PRICE_PRECISION = 1e18;

    // ============ Storage ============

    address public oracle;

    uint256[50] private __gap;

    // ============ Events ============

    event OracleSet(address oracle);

    // ============ Initializable ============

    function initialize(address oracle_) external initializer {
        __AccessControlEnumerable_init();
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);

        require(oracle_ != address(0), "LPWeightOracle: zero oracle");
        oracle = oracle_;
    }

    // ============ Admin ============

    function setOracle(address oracle_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(oracle_ != address(0), "LPWeightOracle: zero oracle");
        oracle = oracle_;
        emit OracleSet(oracle_);
    }

    // ============ Update ============

    /// @notice Refresh the adapter's TWAPs and emit the USDT price of one
    ///         whole LP token of `pool`. Permissionless.
    function update(address pool) external override {
        IOracleAdapter(oracle).update();
        emit LPPriceUpdated(pool, lpValueUSDT(pool, PRICE_PRECISION), block.timestamp);
    }

    // ============ Views ============

    /// @notice USDT value (1e18) of `lpAmount` LP tokens of `pool` at fair
    ///         reserves and TWAP prices. 0 for an empty pool or a zero amount.
    function lpValueUSDT(address pool, uint256 lpAmount) public view override returns (uint256) {
        require(pool != address(0), "LPWeightOracle: zero pool");
        IUniswapV2Pair p = IUniswapV2Pair(pool);
        uint256 supply = p.totalSupply();
        if (lpAmount == 0 || supply == 0) {
            return 0;
        }

        (uint112 r0, uint112 r1, ) = p.getReserves();
        uint256 v0 = _reserveValueUSDT(p.token0(), uint256(r0));
        uint256 v1 = _reserveValueUSDT(p.token1(), uint256(r1));
        uint256 poolValue = 2 * Math.sqrt(v0 * v1);
        return Math.mulDiv(poolValue, lpAmount, supply);
    }

    // ============ Internal ============

    /// @dev USDT value (1e18) of `reserve` base units of `token`.
    function _reserveValueUSDT(address token, uint256 reserve) internal view returns (uint256) {
        return Math.mulDiv(reserve, IOracleAdapter(oracle).priceUSDT(token), _unit(token));
    }

    function _unit(address token) internal view returns (uint256) {
        uint256 dec = uint256(IERC20DecimalsLP(token).decimals());
        require(dec <= 77, "LPWeightOracle: decimals too large");
        return 10 ** dec;
    }
}
