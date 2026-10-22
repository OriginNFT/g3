// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.8.24;

/// @notice Read-only view of the shared Community (Anubis 2.0 instance of
///         goldenpact/gp.contract contracts/invitation/Community.sol). gold3
///         keeps no referral tree of its own.
interface ICommunity {
    function getROOT() external view returns (address);

    function referrerOf(address member) external view returns (address);

    function referrals(
        address member,
        uint256 start,
        uint256 offset
    ) external view returns (uint256 length, address[] memory referrals_);

    /// @notice Public getter of `members`; the getter leaves out the `referrals` array.
    function members(address member) external view returns (uint256 level, address referrer, uint256 activityPoint);

    function joinOpen() external view returns (bool);
}
