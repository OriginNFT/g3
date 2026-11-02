// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.8.24;

interface IEmissionController {
    event GenesisSet(uint256 genesisTimestamp, uint256[5] phaseEndDay);
    event DailySettled(
        uint256 indexed dayId,
        uint256 dayBudget,
        uint256 holdingAmount,
        uint256 communityAmount,
        uint256 unusedAmount
    );

    /// @notice Fix the protocol genesis (start of day 1), once. Admin only.
    function setGenesis(uint256 genesisTimestamp_) external;

    /// @notice Settle `dayId`, which must be lastSettledDay + 1 and fully elapsed. KEEPER_ROLE only.
    function settleDay(uint256 dayId) external;

    /// @notice Settle up to `maxDays` consecutive elapsed days. KEEPER_ROLE only.
    /// @return settled Number of days settled by this call.
    function settleUpTo(uint256 maxDays) external returns (uint256 settled);

    /// @notice Start of day 1; 0 until setGenesis.
    function genesisTimestamp() external view returns (uint256);

    function lastSettledDay() external view returns (uint256);

    /// @notice Day containing block.timestamp; 0 before genesis.
    function currentDay() external view returns (uint256);

    function dayStart(uint256 dayId) external view returns (uint256);

    function dayEnd(uint256 dayId) external view returns (uint256);

    /// @notice Calendar month (SGT) of `dayId`, counted from genesis's month as 1.
    function monthOf(uint256 dayId) external view returns (uint256);

    /// @notice Emission budget accumulated up to the end of `dayId`.
    function cumulativeBudget(uint256 dayId) external view returns (uint256);

    /// @notice cumulativeBudget(dayId) - cumulativeBudget(dayId - 1).
    function dayBudget(uint256 dayId) external view returns (uint256);

    function isSettled(uint256 dayId) external view returns (bool);
}
