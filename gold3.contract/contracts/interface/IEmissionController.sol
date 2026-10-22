// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.8.24;

interface IEmissionController {
    event DailySettled(
        uint256 indexed dayId,
        uint256 dayBudget,
        uint256 holdingAmount,
        uint256 communityAmount,
        uint256 unusedAmount
    );

    function settleDay(uint256 dayId) external;

    function currentDay() external view returns (uint256);

    function monthOf(uint256 dayId) external view returns (uint256);

    /// @notice Emission budget accumulated up to the end of `dayId`.
    function cumulativeBudget(uint256 dayId) external view returns (uint256);

    /// @notice cumulativeBudget(dayId) - cumulativeBudget(dayId - 1).
    function dayBudget(uint256 dayId) external view returns (uint256);

    function isSettled(uint256 dayId) external view returns (bool);
}
