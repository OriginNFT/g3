// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.8.24;

interface ILPWeightOracle {
    event LPPriceUpdated(address indexed pool, uint256 lpPriceUSDT, uint256 timestamp);

    function update(address pool) external;

    function lpValueUSDT(address pool, uint256 lpAmount) external view returns (uint256);
}
