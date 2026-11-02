'use strict';
require('dotenv').config();

function num(name, fallback) {
    const raw = process.env[name];
    if (raw === undefined || raw === '') return fallback;
    const value = Number(raw);
    if (!Number.isFinite(value)) throw new Error(`env ${name} is not a number: ${raw}`);
    return value;
}

function list(name, fallback) {
    const raw = process.env[name];
    if (raw === undefined || raw === '') return fallback;
    return raw
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
}

module.exports = {
    NETWORK: process.env.NETWORK || 'anubis',
    port: num('PORT', 3300),
    redisUrl: process.env.REDIS_URL || 'redis://127.0.0.1:6379',

    // Origins allowed to call this API. This service writes, so the default is
    // nothing, and every origin has to be named.
    corsOrigins: list('ADMIN_CORS_ORIGINS', []),

    // How long a session token stays valid. No sliding renewal: an admin
    // session is short-lived on purpose, and re-login costs one TOTP code.
    sessionTtlSeconds: num('ADMIN_SESSION_TTL_SECONDS', 12 * 3600),

    // Failed logins per username before it is locked out, and for how long.
    // Password + TOTP is only as good as the rate limit in front of it.
    loginMaxAttempts: num('ADMIN_LOGIN_MAX_ATTEMPTS', 5),
    loginLockoutSeconds: num('ADMIN_LOGIN_LOCKOUT_SECONDS', 900),

    // TOTP tolerance, in 30-second steps either side of now. 1 covers ordinary
    // clock drift; more than that widens the window an intercepted code is
    // usable in.
    totpWindow: num('ADMIN_TOTP_WINDOW', 1),
    totpIssuer: process.env.ADMIN_TOTP_ISSUER || 'GOLDEN PACT Admin',
};
