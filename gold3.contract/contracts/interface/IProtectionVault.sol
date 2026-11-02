// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.8.24;

interface IProtectionVault {
    event ProtectionDeposited(address indexed from, uint256 amount);
    event ProtectionBuyExecuted(address indexed buyer, address[] path, uint256 amountIn, uint256 amountOut);
    event ProtectionWithdrawn(address indexed token, address indexed to, uint256 amount, bytes32 indexed memo);

    function deposit(uint256 amount) external;

    /// @notice Market buy with the held funds; whitelisted callers only.
    function buy(address[] calldata path, uint256 amountIn, uint256 minOut) external returns (uint256 amountOut);

    /// @notice Send `amount` of any held token (USDT or what buy() acquired) to `to`. Admin only.
    function withdraw(address token, address to, uint256 amount, bytes32 memo) external;

    function balance() external view returns (uint256);
}
