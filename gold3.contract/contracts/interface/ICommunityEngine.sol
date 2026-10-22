// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.8.24;

interface ICommunityEngine {
    event CommunityBudgetAllocated(
        uint256 indexed dayId,
        uint256 expansion,
        uint256 collaboration,
        uint256 contribution,
        uint256 daoBuilding,
        uint256 platform
    );
    event CommunityPaid(address indexed to, uint256 amount);

    function notifyCommunityBudget(uint256 dayId, uint256 amount) external;

    function payout(address to, uint256 amount) external;

    function communityBudgetOf(uint256 dayId) external view returns (uint256);
}
