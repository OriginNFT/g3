// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.8.24;

interface IBuybackExecutor {
    event BuybackExecuted(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut);
    event TokensBurned(address indexed token, uint256 amount);
    event PathAllowed(bytes32 indexed pathHash, bool allowed);

    function executeBuyback(address[] calldata path, uint256 amountIn, uint256 minOut) external returns (uint256 amountOut);

    function setPathAllowed(address[] calldata path, bool allowed) external;

    function setMaxSingleAmount(uint256 amount) external;

    function setMaxSlippageBps(uint256 bps) external;
}
