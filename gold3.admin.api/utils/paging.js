'use strict';

/**
 * Read `limit` and `offset` off a query string, bounded.
 *
 * Every list route takes the same two parameters and has to survive the same
 * inputs - a missing one, a word, a negative number, a limit of 100000 that
 * would hand a full table scan to a single caller. Doing that inline per route
 * is how one of them ends up without the cap.
 *
 * `defaultLimit` and `maxLimit` are per route rather than global because the
 * rows differ by two orders of magnitude in size: a day summary and a queue row
 * do not deserve the same page.
 *
 * Number('') is 0, Number('abc') is NaN and a fraction such as 0.5 floors to 0;
 * none of them clears the `>= 1` guard, so all of them fall back to the default
 * rather than becoming a limit of 0 (which returns nothing and reads as an
 * empty table). Same guard as helix.api/utils/paging.js, so the two helpers
 * answer identically for the same query string.
 *
 * @param {object} req express request; only req.query is read
 * @param {{ defaultLimit: number, maxLimit: number }} bounds
 * @returns {{ limit: number, offset: number }} both plain numbers, ready for a
 *          named replacement in a LIMIT / OFFSET clause
 */
function paging(req, { defaultLimit, maxLimit }) {
    const query = (req && req.query) || {};

    const requested = Number(query.limit);
    const limit = Math.min(Number.isFinite(requested) && requested >= 1 ? Math.floor(requested) : defaultLimit, maxLimit);

    const skip = Number(query.offset);
    const offset = Number.isFinite(skip) && skip > 0 ? Math.floor(skip) : 0;

    return { limit, offset };
}

module.exports = { paging };
