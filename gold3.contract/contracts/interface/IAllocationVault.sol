// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.8.24;

interface IAllocationVault {
    event AllocationReleased(bytes32 indexed bucket, address indexed to, uint256 amount);

    function releaseInitialLiquidity(address to) external;

    function releaseInsuranceReserve() external;

    function releaseEmissionBudget() external;

    function isReleased(bytes32 bucket) external view returns (bool);
}
