// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.8.24;

interface IProtectionVault {
    event ProtectionDeposited(address indexed from, uint256 amount);
    event ProtectionBuyExecuted(address indexed buyer, address[] path, uint256 amountIn, uint256 amountOut);

    function deposit(uint256 amount) external;

    /// @notice Market buy with the held funds; whitelisted callers only.
    function buy(address[] calldata path, uint256 amountIn, uint256 minOut) external returns (uint256 amountOut);

    function balance() external view returns (uint256);
}
