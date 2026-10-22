// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.8.24;

interface ILPStakeVault {
    /// @notice One stake of LP; each batch keeps its own entry time for the exit burn.
    struct Batch {
        uint256 amount;
        uint64 stakedAt;
    }

    event LPStaked(address indexed account, address indexed pool, uint256 amount, uint256 batchIndex);
    event LPExited(address indexed account, address indexed pool, uint256 lpAmount, uint256 returnedA, uint256 returnedB);
    event LPFeesNotified(address indexed token, uint256 amount);
    event LPAirdropNotified(uint256 indexed dayId, uint256 amount);
    event LPFeesClaimed(address indexed account, address indexed token, uint256 amount);
    event LPAirdropClaimed(address indexed account, uint256 amount);

    function stakeLP(address pool, uint256 amount) external;

    function exitLP(address pool, uint256 amount) external;

    function claimLPFees() external;

    function claimLPAirdrop() external returns (uint256 amount);

    function notifyFees(address token, uint256 amount) external;

    function notifyAirdrop(uint256 dayId, uint256 amount) external;

    function batchesOf(address account, address pool) external view returns (Batch[] memory);

    function stakedOf(address account, address pool) external view returns (uint256);

    function pendingLPFees(address account, address token) external view returns (uint256);

    function pendingLPAirdrop(address account) external view returns (uint256);

    function isEligiblePool(address pool) external view returns (bool);
}
