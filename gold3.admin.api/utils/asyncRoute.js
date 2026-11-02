'use strict';

/**
 * Hand an async route handler's rejection to express.
 *
 * express 4 does not await what a handler returns, so a rejected promise from
 * an `await sequelize.query(...)` never reaches the JSON error handler in
 * app.js: the request hangs until the client gives up, and node (>= 15, and
 * this service runs 22) terminates the process on the unhandled rejection. One
 * failed query would therefore take the whole admin API down rather than
 * answering 500.
 *
 * So every async handler in routes/ is registered as `wrap(async function
 * (req, res) { ... })`. The wrapper is the only thing between a rejection and
 * `next(err)`, which is what routes it to the handler that logs it in full and
 * answers generically.
 *
 * Deliberately NOT a try/catch inside each handler (the shape helix.api uses):
 * the public API answers its own errors per route, while this service has one
 * error handler for the whole surface, and a wrapper cannot be forgotten
 * halfway down a file the way a catch block can.
 */
function wrap(handler) {
    return function (req, res, next) {
        Promise.resolve(handler(req, res, next)).catch(next);
    };
}

module.exports = { wrap };
