// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.8.24;

import {AccessControlEnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/extensions/AccessControlEnumerableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "./interface/IProtectionVault.sol";
import {IUniswapV2Router02} from "./interface/IUniswapV2.sol";

/**
 * @title ProtectionVault
 * @notice Price-protection pool: 5% of the participation funds actually
 *         received (spec §04). BUYER_ROLE is the whitelist that may spend it
 *         on market buys.
 * @dev Inflows are USDT pull-deposits by DEPOSITOR_ROLE (ComputingVault).
 *      buy() swaps held USDT through the Uniswap V2 router along `path`
 *      (path[0] must be USDT) with this vault as the recipient, so whatever
 *      is bought stays here; the router is approved for exactly amountIn and
 *      the approval is reset afterwards. withdraw() moves any held token out,
 *      admin only, with a memo. The trigger and authorization of the buys are
 *      open items (spec §13): on chain they are the BUYER_ROLE whitelist and
 *      the caller's minOut.
 *
 *      Upgradeable (Transparent proxy). Roles: DEFAULT_ADMIN_ROLE (withdraw,
 *      setRouter, role management), DEPOSITOR_ROLE (deposit), BUYER_ROLE (buy).
 */
contract ProtectionVault is AccessControlEnumerableUpgradeable, ReentrancyGuardUpgradeable, IProtectionVault {
    using SafeERC20 for IERC20;

    uint256 public constant IMPL_REV = 1;

    bytes32 public constant DEPOSITOR_ROLE = keccak256("DEPOSITOR_ROLE");
    bytes32 public constant BUYER_ROLE = keccak256("BUYER_ROLE");

    // ============ Storage ============

    address public usdt;
    address public router;

    uint256 public totalDeposited;
    uint256 public totalSpent;

    uint256[50] private __gap;

    // ============ Events ============

    event RouterSet(address router);

    // ============ Initializable ============

    function initialize(address usdt_, address router_) external initializer {
        __AccessControlEnumerable_init();
        __ReentrancyGuard_init();
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);

        require(usdt_ != address(0), "ProtectionVault: zero usdt");
        require(router_ != address(0), "ProtectionVault: zero router");
        usdt = usdt_;
        router = router_;
    }

    // ============ Admin ============

    function setRouter(address router_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(router_ != address(0), "ProtectionVault: zero router");
        router = router_;
        emit RouterSet(router_);
    }

    // ============ Flows ============

    /// @notice Pull `amount` USDT from the calling depositor. DEPOSITOR_ROLE only.
    ///         The caller must have approved this contract first.
    function deposit(uint256 amount) external override onlyRole(DEPOSITOR_ROLE) nonReentrant {
        require(amount > 0, "ProtectionVault: zero amount");

        IERC20(usdt).safeTransferFrom(msg.sender, address(this), amount);
        totalDeposited += amount;

        emit ProtectionDeposited(msg.sender, amount);
    }

    /// @notice Swap `amountIn` held USDT along `path` for at least `minOut`,
    ///         bought tokens kept by this vault. BUYER_ROLE only.
    function buy(
        address[] calldata path,
        uint256 amountIn,
        uint256 minOut
    ) external override onlyRole(BUYER_ROLE) nonReentrant returns (uint256 amountOut) {
        require(path.length >= 2, "ProtectionVault: bad path");
        require(path[0] == usdt, "ProtectionVault: path must start with usdt");
        require(amountIn > 0, "ProtectionVault: zero amount");
        require(IERC20(usdt).balanceOf(address(this)) >= amountIn, "ProtectionVault: insufficient usdt");

        IERC20(usdt).forceApprove(router, amountIn);
        uint256[] memory amounts = IUniswapV2Router02(router).swapExactTokensForTokens(
            amountIn,
            minOut,
            path,
            address(this),
            block.timestamp
        );
        IERC20(usdt).forceApprove(router, 0);

        amountOut = amounts[amounts.length - 1];
        totalSpent += amountIn;

        emit ProtectionBuyExecuted(msg.sender, path, amountIn, amountOut);
    }

    /// @notice Send `amount` of `token` to `to`; `memo` labels the withdrawal for the indexer. Admin only.
    function withdraw(
        address token,
        address to,
        uint256 amount,
        bytes32 memo
    ) external override onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant {
        require(token != address(0), "ProtectionVault: zero token");
        require(to != address(0), "ProtectionVault: zero recipient");
        require(amount > 0, "ProtectionVault: zero amount");

        IERC20(token).safeTransfer(to, amount);

        emit ProtectionWithdrawn(token, to, amount, memo);
    }

    // ============ Views ============

    /// @notice USDT currently held.
    function balance() external view override returns (uint256) {
        return IERC20(usdt).balanceOf(address(this));
    }
}
