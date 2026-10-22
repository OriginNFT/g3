// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.8.24;

interface IReserveVault {
    event ReserveDeposited(address indexed from, uint256 amount);
    event ReserveWithdrawn(address indexed to, uint256 amount, bytes32 indexed memo);

    function deposit(uint256 amount) external;

    function withdraw(address to, uint256 amount, bytes32 memo) external;

    function balance() external view returns (uint256);
}
