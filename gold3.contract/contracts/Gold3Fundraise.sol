// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.8.24;

import {AccessControlEnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/extensions/AccessControlEnumerableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "./interface/IGold3Fundraise.sol";

/**
 * @title Gold3Fundraise
 * @notice Minimal USDT fundraising ledger, ported from origin's
 *         AnubisFundraise (the Helix raise).
 *
 *  A subscriber approves USDT and calls subscribe(amount). The USDT is pulled
 *  into this contract and one immutable Record { subscriber, usdtAmount,
 *  timestamp } is appended to the global ledger. Per-user and global totals
 *  are kept alongside it.
 *
 *  Three limits gate subscribe(): `target` (hard cap on totalRaised),
 *  `minContribution` (floor for one subscription) and `maxPerAddress`
 *  (lifetime cap per subscriber). 0 turns a limit off. `closed` stops new
 *  subscriptions outright. Raised USDT stays here until DEFAULT_ADMIN_ROLE
 *  withdraws it.
 */
contract Gold3Fundraise is AccessControlEnumerableUpgradeable, ReentrancyGuardUpgradeable, IGold3Fundraise {
    using SafeERC20 for IERC20;

    uint256 public constant IMPL_REV = 1;

    // ============ Storage ============

    address public override usdt;

    // Global append-only ledger; a record id is its index here.
    Record[] private _records;
    // Record ids of each subscriber, in subscription order.
    mapping(address => uint256[]) private _userRecordIds;

    mapping(address => uint256) public override totalUsdtOf; // per-subscriber lifetime USDT
    uint256 public override totalRaised; // global lifetime USDT

    bool public override closed; // true = subscribe() reverts

    // 0 means that limit is not enforced.
    uint256 public override target; // hard cap on totalRaised
    uint256 public override minContribution; // floor for a single subscribe()
    uint256 public override maxPerAddress; // lifetime cap on totalUsdtOf[subscriber]

    uint256[50] private __gap;

    // ============ Initializable ============

    function initialize(address usdt_) external initializer {
        require(usdt_ != address(0), "Fundraise: zero address");

        __AccessControlEnumerable_init();
        __ReentrancyGuard_init();
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);

        usdt = usdt_;
    }

    // ============ Subscribe ============

    /// @dev The amount booked is the balance actually received, so a
    ///      fee-on-transfer token cannot inflate the ledger.
    function subscribe(uint256 amount) external override nonReentrant {
        require(!closed, "Fundraise: closed");
        require(amount > 0, "Fundraise: zero amount");

        IERC20 token = IERC20(usdt);
        uint256 balBefore = token.balanceOf(address(this));
        token.safeTransferFrom(msg.sender, address(this), amount);
        uint256 received = token.balanceOf(address(this)) - balBefore;
        require(received > 0, "Fundraise: nothing received");
        require(minContribution == 0 || received >= minContribution, "Fundraise: below minimum");
        require(
            maxPerAddress == 0 || totalUsdtOf[msg.sender] + received <= maxPerAddress,
            "Fundraise: address cap exceeded"
        );
        require(target == 0 || totalRaised + received <= target, "Fundraise: target exceeded");

        uint256 recordId = _records.length;
        _records.push(Record({subscriber: msg.sender, usdtAmount: received, timestamp: block.timestamp}));
        _userRecordIds[msg.sender].push(recordId);

        totalUsdtOf[msg.sender] += received;
        totalRaised += received;

        emit Subscribed(recordId, msg.sender, received, block.timestamp);
    }

    // ============ Views ============

    function recordCount() external view override returns (uint256) {
        return _records.length;
    }

    function getRecord(uint256 id) external view override returns (Record memory) {
        require(id < _records.length, "Fundraise: bad id");
        return _records[id];
    }

    function getRecords(
        uint256 offset,
        uint256 limit
    ) external view override returns (uint256[] memory ids, Record[] memory items) {
        uint256 total = _records.length;
        if (offset >= total) return (new uint256[](0), new Record[](0));

        uint256 end = offset + limit;
        if (end > total) end = total;
        uint256 n = end - offset;

        ids = new uint256[](n);
        items = new Record[](n);
        for (uint256 i = 0; i < n; i++) {
            uint256 id = offset + i;
            ids[i] = id;
            items[i] = _records[id];
        }
    }

    function userRecordCount(address account) external view override returns (uint256) {
        return _userRecordIds[account].length;
    }

    function getUserRecordIds(address account) external view override returns (uint256[] memory) {
        return _userRecordIds[account];
    }

    function getUserRecords(
        address account,
        uint256 offset,
        uint256 limit
    ) external view override returns (uint256[] memory ids, Record[] memory items) {
        uint256[] storage userIds = _userRecordIds[account];
        uint256 total = userIds.length;
        if (offset >= total) return (new uint256[](0), new Record[](0));

        uint256 end = offset + limit;
        if (end > total) end = total;
        uint256 n = end - offset;

        ids = new uint256[](n);
        items = new Record[](n);
        for (uint256 i = 0; i < n; i++) {
            uint256 id = userIds[offset + i];
            ids[i] = id;
            items[i] = _records[id];
        }
    }

    function remainingOf(address account) external view override returns (uint256) {
        if (maxPerAddress == 0) return type(uint256).max;
        uint256 used = totalUsdtOf[account];
        if (used >= maxPerAddress) return 0;
        return maxPerAddress - used;
    }

    function stats()
        external
        view
        override
        returns (
            uint256 raised,
            uint256 target_,
            uint256 minContribution_,
            uint256 maxPerAddress_,
            uint256 records,
            bool closed_
        )
    {
        return (totalRaised, target, minContribution, maxPerAddress, _records.length, closed);
    }

    // ============ Admin ============

    /// @dev `target_` may not be set below what has already been raised,
    ///      otherwise subscribe() would be permanently bricked.
    function setParams(
        uint256 target_,
        uint256 minContribution_,
        uint256 maxPerAddress_
    ) external override onlyRole(DEFAULT_ADMIN_ROLE) {
        require(target_ == 0 || target_ >= totalRaised, "Fundraise: target below raised");
        target = target_;
        minContribution = minContribution_;
        maxPerAddress = maxPerAddress_;
        emit ParamsUpdated(target_, minContribution_, maxPerAddress_);
    }

    function setClosed(bool closed_) external override onlyRole(DEFAULT_ADMIN_ROLE) {
        closed = closed_;
        emit ClosedUpdated(closed_);
    }

    /// @notice Withdraw raised USDT held by this contract.
    function withdraw(address to, uint256 amount) external override onlyRole(DEFAULT_ADMIN_ROLE) {
        require(to != address(0), "Fundraise: zero address");
        require(amount > 0, "Fundraise: zero amount");
        IERC20(usdt).safeTransfer(to, amount);
        emit Withdrawn(to, amount);
    }
}
