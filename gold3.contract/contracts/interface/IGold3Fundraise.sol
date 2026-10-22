// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.8.24;

interface IGold3Fundraise {
    struct Record {
        address subscriber;
        uint256 usdtAmount;
        uint256 timestamp;
    }

    event Subscribed(uint256 indexed recordId, address indexed subscriber, uint256 usdtAmount, uint256 timestamp);
    event ClosedUpdated(bool closed);
    event Withdrawn(address indexed to, uint256 amount);
    event ParamsUpdated(uint256 target, uint256 minContribution, uint256 maxPerAddress);

    // ============ Subscribe ============

    /// @notice Pull `amount` USDT from the caller and record the subscription.
    function subscribe(uint256 amount) external;

    // ============ Views ============

    function usdt() external view returns (address);

    function totalUsdtOf(address account) external view returns (uint256);

    function totalRaised() external view returns (uint256);

    function closed() external view returns (bool);

    function target() external view returns (uint256);

    function minContribution() external view returns (uint256);

    function maxPerAddress() external view returns (uint256);

    function recordCount() external view returns (uint256);

    function getRecord(uint256 id) external view returns (Record memory);

    /// @notice Global ledger page. Returns fewer than `limit` items at the tail.
    function getRecords(uint256 offset, uint256 limit) external view returns (uint256[] memory ids, Record[] memory items);

    function userRecordCount(address account) external view returns (uint256);

    function getUserRecordIds(address account) external view returns (uint256[] memory);

    /// @notice One subscriber's records, paged. Returns fewer than `limit` at the tail.
    function getUserRecords(
        address account,
        uint256 offset,
        uint256 limit
    ) external view returns (uint256[] memory ids, Record[] memory items);

    /// @notice USDT `account` may still contribute before hitting `maxPerAddress`;
    ///         type(uint256).max when the per-address cap is off.
    function remainingOf(address account) external view returns (uint256);

    /// @notice Everything the fundraise header needs, in one call.
    function stats()
        external
        view
        returns (
            uint256 raised,
            uint256 target_,
            uint256 minContribution_,
            uint256 maxPerAddress_,
            uint256 records,
            bool closed_
        );

    // ============ Admin ============

    /// @notice Set the three limits; 0 turns a limit off.
    function setParams(uint256 target_, uint256 minContribution_, uint256 maxPerAddress_) external;

    function setClosed(bool closed_) external;

    function withdraw(address to, uint256 amount) external;
}
