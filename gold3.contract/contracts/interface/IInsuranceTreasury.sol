// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.8.24;

interface IInsuranceTreasury {
    event TreasuryCredited(bytes32 indexed sourceTag, address indexed from, uint256 amount);
    event TreasuryPaid(address indexed to, uint256 amount, bytes32 indexed purpose);

    function credit(uint256 amount, bytes32 sourceTag) external;

    function supplyAirdrop(address to, uint256 amount) external;

    function balance() external view returns (uint256);
}
