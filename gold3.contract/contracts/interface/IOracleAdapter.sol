// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.8.24;

interface IOracleAdapter {
    event PriceUpdated(address indexed token, uint256 price, uint256 timestamp);

    function update() external;

    /// @notice USDT price of one whole `token`, 18 decimals.
    function priceUSDT(address token) external view returns (uint256);

    function valueUSDT(address token, uint256 amount) external view returns (uint256);
}
