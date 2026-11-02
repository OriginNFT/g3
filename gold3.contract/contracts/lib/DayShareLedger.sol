// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.8.24;

/**
 * @title DayShareLedger
 * @notice Reward-per-share accounting with day-granular activation, shared by
 *         every pool that pays a daily emission pro rata to "shares".
 *
 *         Semantics (frozen by the protocol time model):
 *           - A deposit made on day d becomes active from day d: it takes
 *             part in the settlement of day d and later. Day d-1 is never
 *             affected, whether or not it has already been settled.
 *           - settle(day, reward) distributes `reward` over the shares that
 *             were active for `day`, records the accumulator, then folds the
 *             deposits activating on day+1 into the active total.
 *           - A withdrawal is effective for every unsettled day: the shares
 *             leave the active total immediately and earn nothing for the day
 *             in progress. Nothing is ever rewritten for a settled day.
 *           - Rounding is floor. A reward that finds no active share is
 *             returned to the caller as `undistributed` so it can be routed to
 *             the treasury; per-day rounding dust stays in the holding contract
 *             (see settle()).
 *
 *         A deposit whose activation day is already covered by the active
 *         total (fromDay == lastSettledDay + 1, i.e. settlement has caught up
 *         with the clock) is credited to the active shares directly. A later
 *         activation day (settlement lagging behind the clock) is kept as a
 *         per-account pending bucket keyed by that day (merged when the day
 *         matches). sync() folds every bucket whose activation day is covered
 *         by the active total and credits the reward it earned since
 *         activation using the per-day accumulator snapshots.
 */
library DayShareLedger {
    uint256 internal constant ACC_PRECISION = 1e18;

    struct Bucket {
        uint256 amount;
        uint256 fromDay;
    }

    struct Pool {
        uint256 totalActive;
        uint256 accPerShare;
        uint256 lastSettledDay;
        mapping(uint256 => uint256) pendingTotalFrom; // activation day => amount
        mapping(uint256 => uint256) accAfterDay; // settled day => accPerShare after it
    }

    struct Account {
        uint256 active;
        uint256 rewardDebt;
        uint256 unclaimed;
        Bucket[] pending;
    }

    // ============ Mutations ============

    /// @dev `fromDay` must not be earlier than the day whose pending total has
    ///      already been folded (lastSettledDay + 1), i.e. currentDay while
    ///      settlement is not ahead of the clock.
    function deposit(Pool storage p, Account storage a, uint256 amount, uint256 fromDay) internal {
        require(amount > 0, "DayShare: zero amount");
        require(fromDay >= p.lastSettledDay + 1, "DayShare: activation day already settled");
        sync(p, a);

        if (fromDay == p.lastSettledDay + 1) {
            a.active = a.active + amount;
            p.totalActive = p.totalActive + amount;
            a.rewardDebt = a.active * p.accPerShare / ACC_PRECISION;
            return;
        }

        uint256 n = a.pending.length;
        if (n > 0 && a.pending[n - 1].fromDay == fromDay) {
            a.pending[n - 1].amount = a.pending[n - 1].amount + amount;
        } else {
            require(n == 0 || a.pending[n - 1].fromDay < fromDay, "DayShare: bucket order");
            a.pending.push(Bucket({amount: amount, fromDay: fromDay}));
        }
        p.pendingTotalFrom[fromDay] = p.pendingTotalFrom[fromDay] + amount;
    }

    /// @notice Distribute `reward` over the shares active for `day`.
    /// @return undistributed The whole `reward` when no share is active for
    ///         `day`, else 0. The per-day rounding dust (< totalActive / 1e18
    ///         wei) is deliberately NOT returned: accounts floor once on the
    ///         cumulative accumulator while the pool would floor every day, so
    ///         the sum of credits can exceed the sum of per-day floors by a few
    ///         wei. Keeping the dust in the holding contract keeps every last
    ///         claim solvent; it is never routed anywhere.
    function settle(Pool storage p, uint256 day, uint256 reward) internal returns (uint256 undistributed) {
        require(day == p.lastSettledDay + 1, "DayShare: day out of order");
        if (p.totalActive == 0 || reward == 0) {
            undistributed = reward;
        } else {
            p.accPerShare = p.accPerShare + reward * ACC_PRECISION / p.totalActive;
        }
        p.accAfterDay[day] = p.accPerShare;
        p.lastSettledDay = day;
        p.totalActive = p.totalActive + p.pendingTotalFrom[day + 1];
    }

    /// @notice Fold activated buckets into `active` and accrue rewards.
    function sync(Pool storage p, Account storage a) internal {
        if (a.active > 0) {
            a.unclaimed = a.unclaimed + (a.active * p.accPerShare / ACC_PRECISION - a.rewardDebt);
        }

        uint256 n = a.pending.length;
        uint256 folded = 0;
        while (folded < n && a.pending[folded].fromDay <= p.lastSettledDay + 1) {
            Bucket memory b = a.pending[folded];
            uint256 accStart = p.accAfterDay[b.fromDay - 1];
            a.unclaimed = a.unclaimed + b.amount * (p.accPerShare - accStart) / ACC_PRECISION;
            a.active = a.active + b.amount;
            folded++;
        }
        if (folded > 0) {
            for (uint256 j = folded; j < n; j++) {
                a.pending[j - folded] = a.pending[j];
            }
            for (uint256 k = 0; k < folded; k++) {
                a.pending.pop();
            }
        }

        a.rewardDebt = a.active * p.accPerShare / ACC_PRECISION;
    }

    /// @notice Remove `amount` shares: pending buckets first (latest first),
    ///         then active shares. Effective for every unsettled day.
    function withdraw(Pool storage p, Account storage a, uint256 amount) internal {
        require(amount > 0, "DayShare: zero amount");
        sync(p, a);

        uint256 remaining = amount;
        while (remaining > 0 && a.pending.length > 0) {
            uint256 last = a.pending.length - 1;
            Bucket storage b = a.pending[last];
            uint256 take = b.amount < remaining ? b.amount : remaining;
            b.amount = b.amount - take;
            p.pendingTotalFrom[b.fromDay] = p.pendingTotalFrom[b.fromDay] - take;
            remaining = remaining - take;
            if (b.amount == 0) {
                a.pending.pop();
            }
        }
        if (remaining > 0) {
            require(a.active >= remaining, "DayShare: insufficient shares");
            a.active = a.active - remaining;
            p.totalActive = p.totalActive - remaining;
            a.rewardDebt = a.active * p.accPerShare / ACC_PRECISION;
        }
    }

    /// @notice Sync and take the whole unclaimed reward.
    function claim(Pool storage p, Account storage a) internal returns (uint256 amount) {
        sync(p, a);
        amount = a.unclaimed;
        a.unclaimed = 0;
    }

    // ============ Views ============

    function pendingShares(Account storage a) internal view returns (uint256 total) {
        for (uint256 i = 0; i < a.pending.length; i++) {
            total = total + a.pending[i].amount;
        }
    }

    function totalShares(Account storage a) internal view returns (uint256) {
        return a.active + pendingShares(a);
    }

    /// @notice Reward the account would hold after sync(), without writing.
    function pendingReward(Pool storage p, Account storage a) internal view returns (uint256 reward) {
        reward = a.unclaimed;
        if (a.active > 0) {
            reward = reward + (a.active * p.accPerShare / ACC_PRECISION - a.rewardDebt);
        }
        for (uint256 i = 0; i < a.pending.length; i++) {
            Bucket storage b = a.pending[i];
            if (b.fromDay > p.lastSettledDay + 1) break;
            uint256 accStart = p.accAfterDay[b.fromDay - 1];
            reward = reward + b.amount * (p.accPerShare - accStart) / ACC_PRECISION;
        }
    }

    /// @notice Shares that count for the next settlement (active + buckets
    ///         already folded into the pool total).
    function effectiveShares(Pool storage p, Account storage a) internal view returns (uint256 shares) {
        shares = a.active;
        for (uint256 i = 0; i < a.pending.length; i++) {
            Bucket storage b = a.pending[i];
            if (b.fromDay > p.lastSettledDay + 1) break;
            shares = shares + b.amount;
        }
    }
}
