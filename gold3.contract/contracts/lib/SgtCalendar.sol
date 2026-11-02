// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.8.24;

/**
 * @title SgtCalendar
 * @notice Civil (proleptic Gregorian) calendar arithmetic in Singapore time
 *         (UTC+8), for the calendar-month boundaries of the emission schedule.
 * @dev Howard Hinnant's days_from_civil / civil_from_days, unsigned, valid
 *      for every date from 1970-01-01 on. A "day number" is the number of
 *      civil days since 1970-01-01 in SGT. Pure functions, no storage.
 */
library SgtCalendar {
    uint256 internal constant SGT_OFFSET = 8 hours;
    uint256 internal constant SECONDS_PER_DAY = 86400;

    /// @notice SGT civil date of a unix timestamp.
    function civilOf(uint256 timestamp) internal pure returns (uint256 year, uint256 month, uint256 day) {
        return civilFromDays(dayNumberOf(timestamp));
    }

    /// @notice SGT day number (civil days since 1970-01-01) of a unix timestamp.
    function dayNumberOf(uint256 timestamp) internal pure returns (uint256) {
        return (timestamp + SGT_OFFSET) / SECONDS_PER_DAY;
    }

    /// @notice Civil date of a day number.
    function civilFromDays(uint256 z) internal pure returns (uint256 year, uint256 month, uint256 day) {
        z += 719468;
        uint256 era = z / 146097;
        uint256 doe = z - era * 146097; // [0, 146096]
        uint256 yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365; // [0, 399]
        uint256 y = yoe + era * 400;
        uint256 doy = doe - (365 * yoe + yoe / 4 - yoe / 100); // [0, 365]
        uint256 mp = (5 * doy + 2) / 153; // [0, 11]
        day = doy - (153 * mp + 2) / 5 + 1; // [1, 31]
        month = mp < 10 ? mp + 3 : mp - 9; // [1, 12]
        year = month <= 2 ? y + 1 : y;
    }

    /// @notice Day number of a civil date.
    function daysFromCivil(uint256 year, uint256 month, uint256 day) internal pure returns (uint256) {
        uint256 y = month <= 2 ? year - 1 : year;
        uint256 era = y / 400;
        uint256 yoe = y - era * 400; // [0, 399]
        uint256 mp = month > 2 ? month - 3 : month + 9; // [0, 11]
        uint256 doy = (153 * mp + 2) / 5 + day - 1; // [0, 365]
        uint256 doe = yoe * 365 + yoe / 4 - yoe / 100 + doy; // [0, 146096]
        return era * 146097 + doe - 719468;
    }

    function isLeapYear(uint256 year) internal pure returns (bool) {
        return (year % 4 == 0 && year % 100 != 0) || year % 400 == 0;
    }

    function daysInMonth(uint256 year, uint256 month) internal pure returns (uint256) {
        if (month == 2) {
            return isLeapYear(year) ? 29 : 28;
        }
        if (month == 4 || month == 6 || month == 9 || month == 11) {
            return 30;
        }
        return 31;
    }

    /// @notice Months since year 0: year * 12 + (month - 1). Differences of
    ///         two indices count calendar months between two dates.
    function monthIndex(uint256 year, uint256 month) internal pure returns (uint256) {
        return year * 12 + month - 1;
    }

    /// @notice Civil (year, month) of a month index.
    function monthFromIndex(uint256 index) internal pure returns (uint256 year, uint256 month) {
        year = index / 12;
        month = index % 12 + 1;
    }
}
