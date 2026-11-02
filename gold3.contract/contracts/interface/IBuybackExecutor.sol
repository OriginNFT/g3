// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.8.24;

interface IBuybackExecutor {
    event BuybackFunded(bytes32 indexed purpose, address indexed token, uint256 amount);
    event BuybackExecuted(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut);
    event TokensBurned(address indexed token, uint256 amount);
    event PathAllowed(bytes32 indexed pathHash, bool allowed);
    event MaxSingleAmountSet(uint256 amount);
    event MaxSlippageBpsSet(uint256 bps);

    /// @notice Book `amount` of `token` for `purpose`: pulls it from the
    ///         caller, which must have approved it. ROUTER_ROLE only.
    function fund(bytes32 purpose, address token, uint256 amount) external;

    function executeBuyback(address[] calldata path, uint256 amountIn, uint256 minOut) external returns (uint256 amountOut);

    function setPathAllowed(address[] calldata path, bool allowed) external;

    function setMaxSingleAmount(uint256 amount) external;

    function setMaxSlippageBps(uint256 bps) external;

    function budgetOf(bytes32 purpose, address token) external view returns (uint256);
}
