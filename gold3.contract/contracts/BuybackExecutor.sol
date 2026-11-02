// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.8.24;

import {AccessControlEnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/extensions/AccessControlEnumerableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "./interface/IBuybackExecutor.sol";
import "./interface/IGGToken.sol";
import "./interface/IOracleAdapter.sol";
import "./interface/IUniswapV2.sol";

/**
 * @title BuybackExecutor
 * @notice Buyback and real burn of GOT2 / GG / AUG (spec §10), behind a slippage
 *         limit, a path whitelist and a per-call maximum. The quote
 *         protection is the OracleAdapter TWAP: `minOut` may not be below
 *         the TWAP-implied output less `maxSlippageBps`. Budgets are booked
 *         by purpose (GOT2 / GG / AUG buyback) and input token.
 */
contract BuybackExecutor is AccessControlEnumerableUpgradeable, ReentrancyGuardUpgradeable, IBuybackExecutor {
    using SafeERC20 for IERC20;

    uint256 public constant IMPL_REV = 1;

    bytes32 public constant KEEPER_ROLE = keccak256("KEEPER_ROLE");
    bytes32 public constant ROUTER_ROLE = keccak256("ROUTER_ROLE");

    uint256 public constant BPS = 10_000;

    bytes32 public constant PURPOSE_GOT2_BUYBACK = keccak256("GOT2_BUYBACK");
    bytes32 public constant PURPOSE_GG_BUYBACK = keccak256("GG_BUYBACK");
    bytes32 public constant PURPOSE_AUG_BUYBACK = keccak256("AUG_BUYBACK");

    // ============ Storage ============

    address public router;
    address public oracle;
    address public got2;
    address public gg;
    address public aug;
    uint256 public maxSingleAmount;
    uint256 public maxSlippageBps;

    mapping(bytes32 => bool) public allowedPath;
    mapping(bytes32 => mapping(address => uint256)) public override budgetOf;

    uint256[50] private __gap;

    // ============ Initializable ============

    function initialize(
        address router_,
        address oracle_,
        address got2_,
        address gg_,
        address aug_
    ) external initializer {
        __AccessControlEnumerable_init();
        __ReentrancyGuard_init();
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);

        router = router_;
        oracle = oracle_;
        got2 = got2_;
        gg = gg_;
        aug = aug_;
    }

    // ============ Funding ============

    function fund(bytes32 purpose, address token, uint256 amount) external override onlyRole(ROUTER_ROLE) nonReentrant {
        require(
            purpose == PURPOSE_GOT2_BUYBACK || purpose == PURPOSE_GG_BUYBACK || purpose == PURPOSE_AUG_BUYBACK,
            "BuybackExecutor: unknown purpose"
        );
        require(amount > 0, "BuybackExecutor: zero amount");
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        budgetOf[purpose][token] += amount;
        emit BuybackFunded(purpose, token, amount);
    }

    // ============ Buyback ============

    function executeBuyback(
        address[] calldata path,
        uint256 amountIn,
        uint256 minOut
    ) external override onlyRole(KEEPER_ROLE) nonReentrant returns (uint256 amountOut) {
        require(path.length >= 2, "BuybackExecutor: bad path");
        require(allowedPath[keccak256(abi.encodePacked(path))], "BuybackExecutor: path not allowed");
        require(amountIn > 0 && amountIn <= maxSingleAmount, "BuybackExecutor: amount out of range");

        address tokenIn = path[0];
        address tokenOut = path[path.length - 1];
        bytes32 purpose = _purposeOf(tokenOut);
        require(budgetOf[purpose][tokenIn] >= amountIn, "BuybackExecutor: budget exceeded");

        uint256 expectedOut = IOracleAdapter(oracle).valueUSDT(tokenIn, amountIn)
            * (10 ** IERC20Metadata(tokenOut).decimals())
            / IOracleAdapter(oracle).priceUSDT(tokenOut);
        require(minOut >= expectedOut * (BPS - maxSlippageBps) / BPS, "BuybackExecutor: minOut below quote");

        budgetOf[purpose][tokenIn] -= amountIn;

        IERC20(tokenIn).forceApprove(router, amountIn);
        uint256[] memory amounts = IUniswapV2Router02(router).swapExactTokensForTokens(
            amountIn,
            minOut,
            path,
            address(this),
            block.timestamp
        );
        IERC20(tokenIn).forceApprove(router, 0);
        amountOut = amounts[amounts.length - 1];

        IGGToken(tokenOut).burn(amountOut);

        emit BuybackExecuted(tokenIn, tokenOut, amountIn, amountOut);
        emit TokensBurned(tokenOut, amountOut);
    }

    // ============ Admin ============

    function setPathAllowed(address[] calldata path, bool allowed) external override onlyRole(DEFAULT_ADMIN_ROLE) {
        bytes32 pathHash = keccak256(abi.encodePacked(path));
        allowedPath[pathHash] = allowed;
        emit PathAllowed(pathHash, allowed);
    }

    function setMaxSingleAmount(uint256 amount) external override onlyRole(DEFAULT_ADMIN_ROLE) {
        maxSingleAmount = amount;
        emit MaxSingleAmountSet(amount);
    }

    function setMaxSlippageBps(uint256 bps) external override onlyRole(DEFAULT_ADMIN_ROLE) {
        require(bps <= BPS, "BuybackExecutor: bps out of range");
        maxSlippageBps = bps;
        emit MaxSlippageBpsSet(bps);
    }

    // ============ Internal ============

    function _purposeOf(address tokenOut) internal view returns (bytes32) {
        if (tokenOut == got2) return PURPOSE_GOT2_BUYBACK;
        if (tokenOut == gg) return PURPOSE_GG_BUYBACK;
        if (tokenOut == aug) return PURPOSE_AUG_BUYBACK;
        revert("BuybackExecutor: unsupported buyback token");
    }
}
