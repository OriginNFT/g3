// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.8.24;

import {AccessControlEnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/extensions/AccessControlEnumerableUpgradeable.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

import "./interface/IOracleAdapter.sol";
import "./interface/IUniswapV2.sol";

/// @dev Minimal ERC20 decimals surface, used to scale reserves to whole tokens.
interface IERC20DecimalsOA {
    function decimals() external view returns (uint8);
}

/**
 * @title OracleAdapter
 * @notice USDT reference prices of the protocol tokens, 1e18 = 1 USDT per
 *         whole token, every one of them a TWAP over a Uniswap V2 pair:
 *           - GG over the GG/USDT main pair (quote USDT);
 *           - any other token (GOT2, AUG) over its pair with GG (quote GG),
 *             converted through the GG price: price = twap(token in GG) x
 *             price(GG).
 *         No unprotected single-block spot price is served once a TWAP has
 *         been recorded (spec §07).
 * @dev One observation per priced token. The pair's price0CumulativeLast /
 *      price1CumulativeLast counters accumulate the UQ112x112 marginal price
 *      (quote base units per base base unit) per second. update() turns the
 *      accumulation since the last observation into the average over the
 *      elapsed seconds, scaled by the two tokens' decimals to 1e18 per whole
 *      token, and is a no-op for a token until at least twapWindowSeconds have
 *      elapsed since its last observation. The current cumulative is read with
 *      the standard counterfactual: when the pair has not been synced in this
 *      block, the marginal price implied by its reserves is accumulated over
 *      the seconds since blockTimestampLast (skipped while a reserve is zero,
 *      exactly like the pair itself). An observation taken on an empty pair
 *      records lastLive = false and the next update() restarts the observation
 *      instead of recording a diluted average.
 *
 *      Until the first TWAP of a token is recorded (after deployment and after
 *      every setPair) priceUSDT serves the spot price from the reserves; that
 *      price can be moved inside one transaction, so consumers must not go
 *      live before the first PriceUpdated event of every token they read.
 *
 *      Upgradeable (Transparent proxy). DEFAULT_ADMIN_ROLE registers and
 *      re-points pairs and sets the window. update() is permissionless.
 */
contract OracleAdapter is AccessControlEnumerableUpgradeable, IOracleAdapter {
    uint256 public constant IMPL_REV = 1;

    uint256 private constant PRICE_PRECISION = 1e18;
    // UQ112x112 fixed point scale used by Uniswap V2 cumulative prices.
    uint256 private constant Q112 = 2 ** 112;
    // Uniswap V2 pairs keep block timestamps modulo 2^32.
    uint256 private constant TS_MOD = 2 ** 32;

    struct Observation {
        address pair;
        address quote; // USDT for GG, GG for every other token
        bool baseIsToken0; // true when the priced token is token0 of the pair
        uint256 lastCumulative;
        uint256 lastTimestamp;
        uint256 lastTwap; // 1e18 = 1 quote per whole base token; 0 until the first window
        bool lastLive; // both reserves non-zero at the last observation
    }

    // ============ Storage ============

    address public usdt;
    address public gg;
    /// @notice Minimum seconds between two TWAP observations of one token.
    uint256 public twapWindowSeconds;

    mapping(address => Observation) public observations;
    /// @notice Tokens with a registered pair, in registration order (update() iterates them).
    address[] public pricedTokens;

    uint256[50] private __gap;

    // ============ Events ============

    event PairSet(address indexed token, address pair, address quote, bool baseIsToken0);
    event TwapWindowSet(uint256 windowSeconds);

    // ============ Initializable ============

    function initialize(address usdt_, address gg_, uint256 twapWindowSeconds_) external initializer {
        __AccessControlEnumerable_init();
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);

        require(usdt_ != address(0), "OracleAdapter: zero usdt");
        require(gg_ != address(0), "OracleAdapter: zero gg");
        require(usdt_ != gg_, "OracleAdapter: usdt == gg");

        usdt = usdt_;
        gg = gg_;
        _setTwapWindow(twapWindowSeconds_);
    }

    // ============ Admin ============

    /// @notice Register or re-point the pair `token` is priced over: GG over a
    ///         GG/USDT pair, any other token over its pair with GG. Discards
    ///         the recorded TWAP of that token and starts a fresh observation.
    function setPair(address token, address pair) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(token != address(0) && token != usdt, "OracleAdapter: bad token");
        require(pair != address(0), "OracleAdapter: zero pair");

        address quote = token == gg ? usdt : gg;
        address token0 = IUniswapV2Pair(pair).token0();
        address token1 = IUniswapV2Pair(pair).token1();
        bool baseIsToken0;
        if (token0 == token && token1 == quote) {
            baseIsToken0 = true;
        } else if (token0 == quote && token1 == token) {
            baseIsToken0 = false;
        } else {
            revert("OracleAdapter: bad pair");
        }

        Observation storage o = observations[token];
        if (o.pair == address(0)) {
            pricedTokens.push(token);
        }
        o.pair = pair;
        o.quote = quote;
        o.baseIsToken0 = baseIsToken0;
        o.lastTwap = 0;
        o.lastCumulative = _currentCumulative(o);
        o.lastTimestamp = block.timestamp;
        o.lastLive = _hasLiquidity(pair);

        emit PairSet(token, pair, quote, baseIsToken0);
    }

    function setTwapWindow(uint256 windowSeconds) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _setTwapWindow(windowSeconds);
    }

    function _setTwapWindow(uint256 windowSeconds) internal {
        require(windowSeconds > 0, "OracleAdapter: zero window");
        twapWindowSeconds = windowSeconds;
        emit TwapWindowSet(windowSeconds);
    }

    // ============ TWAP ============

    /// @notice Record a TWAP observation for every registered token whose
    ///         window has elapsed. Permissionless.
    function update() external override {
        uint256 n = pricedTokens.length;
        for (uint256 i = 0; i < n; i++) {
            _update(pricedTokens[i]);
        }
    }

    function _update(address token) internal {
        Observation storage o = observations[token];
        uint256 elapsed = block.timestamp - o.lastTimestamp;
        if (elapsed < twapWindowSeconds) {
            return;
        }

        uint256 cumulative = _currentCumulative(o);
        if (o.lastLive) {
            // Uniswap V2 cumulative counters wrap by design: take the delta with
            // wrapping subtraction.
            uint256 delta;
            unchecked {
                delta = cumulative - o.lastCumulative;
            }
            uint256 averageUQ = delta / elapsed;
            // quote base units per base base unit (UQ112x112) -> 1e18 quote per whole base
            uint256 price = Math.mulDiv(averageUQ, PRICE_PRECISION * _unit(token), Q112 * _unit(o.quote));
            o.lastTwap = price;
            emit PriceUpdated(token, price, block.timestamp);
        }

        o.lastCumulative = cumulative;
        o.lastTimestamp = block.timestamp;
        o.lastLive = _hasLiquidity(o.pair);
    }

    // ============ Prices ============

    /// @notice USDT price of one whole `token`, 1e18 = 1 USDT. USDT is 1e18,
    ///         GG its TWAP over the main pair, any other registered token its
    ///         TWAP in GG times the GG price. Reverts "OracleAdapter: no price"
    ///         for an unregistered token or an empty pair without a TWAP.
    function priceUSDT(address token) public view override returns (uint256) {
        require(token != address(0), "OracleAdapter: zero token");
        if (token == usdt) {
            return PRICE_PRECISION;
        }
        Observation storage o = observations[token];
        require(o.pair != address(0), "OracleAdapter: no price");

        uint256 inQuote = o.lastTwap > 0 ? o.lastTwap : _spot(o, token);
        if (token == gg) {
            return inQuote;
        }
        return inQuote * priceUSDT(gg) / PRICE_PRECISION;
    }

    /// @notice USDT value (1e18) of `amount` base units of `token`.
    function valueUSDT(address token, uint256 amount) external view override returns (uint256) {
        if (amount == 0) {
            return 0;
        }
        return amount * priceUSDT(token) / _unit(token);
    }

    function pricedTokenCount() external view returns (uint256) {
        return pricedTokens.length;
    }

    // ============ Internal ============

    /// @dev Marginal price of `token` in its quote implied by the pair reserves, 1e18 per whole token.
    function _spot(Observation storage o, address token) internal view returns (uint256) {
        (uint112 r0, uint112 r1, ) = IUniswapV2Pair(o.pair).getReserves();
        uint256 reserveBase = o.baseIsToken0 ? uint256(r0) : uint256(r1);
        uint256 reserveQuote = o.baseIsToken0 ? uint256(r1) : uint256(r0);
        require(reserveBase > 0 && reserveQuote > 0, "OracleAdapter: no price");
        return Math.mulDiv(reserveQuote, PRICE_PRECISION * _unit(token), reserveBase * _unit(o.quote));
    }

    function _hasLiquidity(address pair) internal view returns (bool) {
        (uint112 r0, uint112 r1, ) = IUniswapV2Pair(pair).getReserves();
        return r0 != 0 && r1 != 0;
    }

    /// @dev 10^decimals of `token`. Bounded so the exponentiation cannot wrap.
    function _unit(address token) internal view returns (uint256) {
        uint256 dec = uint256(IERC20DecimalsOA(token).decimals());
        require(dec <= 77, "OracleAdapter: decimals too large");
        return 10 ** dec;
    }

    /// @dev Cumulative price (quote per base, UQ112x112 * seconds) of the
    ///      observation's pair as of now: the pair's counter plus, when the
    ///      pair has not been synced in this block, the marginal price implied
    ///      by its reserves accumulated over the seconds since
    ///      blockTimestampLast. Skipped while a reserve is zero, exactly like
    ///      UniswapV2Pair._update.
    function _currentCumulative(Observation storage o) internal view returns (uint256 cumulative) {
        IUniswapV2Pair p = IUniswapV2Pair(o.pair);
        cumulative = o.baseIsToken0 ? p.price0CumulativeLast() : p.price1CumulativeLast();

        (uint112 r0, uint112 r1, uint32 tsLast) = p.getReserves();
        uint32 tsNow = uint32(block.timestamp % TS_MOD);
        if (tsLast != tsNow && r0 != 0 && r1 != 0) {
            uint256 sinceSync = _elapsed32(tsLast, tsNow);
            uint256 priceUQ = o.baseIsToken0 ? _fractionUQ(r1, r0) : _fractionUQ(r0, r1);
            unchecked {
                cumulative = cumulative + priceUQ * sinceSync; // wraps like UniswapV2Pair._update
            }
        }
    }

    /// @dev numerator / denominator as UQ112x112.
    function _fractionUQ(uint112 numerator, uint112 denominator) internal pure returns (uint256) {
        return uint256(numerator) * Q112 / uint256(denominator);
    }

    /// @dev Seconds from `from` to `to` on the pair's modulo-2^32 timestamp clock.
    function _elapsed32(uint32 from, uint32 to) internal pure returns (uint256) {
        if (to >= from) {
            return uint256(to) - uint256(from);
        }
        return TS_MOD - uint256(from) + uint256(to);
    }
}
