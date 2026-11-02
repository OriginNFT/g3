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
    event CommunityCredited(uint256 indexed dayId, uint8 indexed bucket, address indexed account, uint256 amount);
    event CommunityDayClosed(uint256 indexed dayId, uint256 credited, uint256 leftover);
    event CommunityPaid(address indexed to, uint256 amount);
    event DaoBuildingAccountSet(address account);
    event PlatformAccountSet(address account);
    event TurbineSet(address turbine);

    /// @notice Receive `dayId`'s community half of the emission: pulls the
    ///         whole amount from the caller, which must have approved it,
    ///         and splits it 30/30/30/5/5 into the day's buckets. The DAO
    ///         building and platform buckets are credited to their fixed
    ///         accounts at once. EMISSION_ROLE only.
    function notifyCommunityBudget(uint256 dayId, uint256 amount) external;

    /// @notice Credit `amounts[i]` of `dayId`'s `bucket` to `accounts[i]`.
    ///         The day must be settled and not closed; the bucket's budget
    ///         caps the sum ever credited out of it. ACCOUNTANT_ROLE only.
    function credit(uint256 dayId, uint8 bucket, address[] calldata accounts, uint256[] calldata amounts) external;

    /// @notice Close `dayId`: what its buckets did not credit goes to the
    ///         InsuranceTreasury under TAG_UNUSED_COMMUNITY. ACCOUNTANT_ROLE only.
    function closeDay(uint256 dayId) external;

    /// @notice Take `amount` of `to`'s credits and deliver the GG to the
    ///         turbine for `to`. CLAIM_ROLE only.
    function payout(address to, uint256 amount) external;

    function communityBudgetOf(uint256 dayId) external view returns (uint256);

    function creditsOf(address account) external view returns (uint256);

    function bucketBudgetOf(uint256 dayId, uint8 bucket) external view returns (uint256);

    function bucketCreditedOf(uint256 dayId, uint8 bucket) external view returns (uint256);

    function lastSettledDay() external view returns (uint256);

    function isClosed(uint256 dayId) external view returns (bool);
}
