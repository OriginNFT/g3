// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.8.24;

interface IComputingVault {
    struct Position {
        address owner;
        address asset;
        uint256 inputAmount;
        uint256 usdtValue;
        uint256 power;
        uint64 createdAt;
        uint8 status;
    }

    event PositionCreated(
        uint256 indexed positionId,
        address indexed owner,
        address indexed asset,
        uint256 inputAmount,
        uint256 usdtValue,
        uint256 power
    );
    event TokensBurned(address indexed token, address indexed from, uint256 amount);
    event HoldingRewardNotified(uint256 indexed dayId, uint256 amount);
    event HoldingRewardClaimed(address indexed account, uint256 amount);
    event TurbineSet(address turbine);

    function participate(address asset, uint256 amount, uint256 minPower) external returns (uint256 positionId);

    /// @notice Receive the holding half of `dayId`'s emission: pulls what it
    ///         distributes (amount - undistributed) from the caller, which
    ///         must have approved it. EMISSION_ROLE only.
    /// @return undistributed The part no position could receive (the whole amount when no power is active).
    function notifyHoldingReward(uint256 dayId, uint256 amount) external returns (uint256 undistributed);

    /// @notice Settle the caller's holding reward and deliver it to the turbine.
    function claimHoldingReward() external returns (uint256 amount);

    function pendingHoldingReward(address account) external view returns (uint256);

    function getPosition(uint256 positionId) external view returns (Position memory);

    function positionIdsOf(address account) external view returns (uint256[] memory);

    function powerOf(address account) external view returns (uint256);

    function totalPower() external view returns (uint256);
}
