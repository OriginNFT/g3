'use strict';

const { randomBytes, createHash } = require('node:crypto');

const config = require('../config');
const { redis } = require('./redis');

// Opaque bearer tokens in redis rather than a signed JWT: revocation is a DEL,
// and there is no signing key to leak or rotate. The cost is that redis has to
// be up, which it does anyway for the rest of the stack.
//
// Only a hash of the token is stored. A dump of redis therefore does not hand
// anyone a working session, the same reason a password file holds hashes.
const SESSION_PREFIX = 'ADMIN:SESSION:';
const LOGIN_FAIL_PREFIX = 'ADMIN:LOGINFAIL:';
const ENROLL_PREFIX = 'ADMIN:ENROLL:';

// Minutes, not hours: an enrollment ticket only has to survive scanning a code.
const ENROLL_TTL_SECONDS = 600;

const hash = (token) => createHash('sha256').update(token).digest('hex');
const keyOf = (token) => `${SESSION_PREFIX}${hash(token)}`;
const enrollKeyOf = (token) => `${ENROLL_PREFIX}${hash(token)}`;

async function createSession(user, meta = {}) {
    const token = randomBytes(32).toString('base64url');
    const payload = {
        userId: user.id,
        username: user.username,
        role: user.role,
        createdAt: new Date().toISOString(),
        ip: meta.ip || null,
    };
    await redis.set(keyOf(token), JSON.stringify(payload), { EX: config.sessionTtlSeconds });
    return { token, expiresIn: config.sessionTtlSeconds };
}

async function readSession(token) {
    if (!token) return null;
    const raw = await redis.get(keyOf(token));
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch (err) {
        console.error('[AUTH] unparsable session payload:', err.message, err);
        return null;
    }
}

async function destroySession(token) {
    if (!token) return;
    await redis.del(keyOf(token));
}

// ============ login throttling ============
// Keyed by username, not by IP: the point is to protect one account from being
// ground through, and an attacker rotating IPs is the expected case.
async function failureCount(username) {
    const raw = await redis.get(`${LOGIN_FAIL_PREFIX}${username}`);
    return raw ? Number(raw) : 0;
}

async function recordFailure(username) {
    const key = `${LOGIN_FAIL_PREFIX}${username}`;
    const count = await redis.incr(key);
    // Refresh the window on every failure, so a slow drip does not outlast it.
    await redis.expire(key, config.loginLockoutSeconds);
    return count;
}

async function clearFailures(username) {
    await redis.del(`${LOGIN_FAIL_PREFIX}${username}`);
}

// ============ enrollment tickets ============
// Handed out only after a correct password, and short-lived. It is what carries
// "this browser is mid-way through binding an authenticator for user X" between
// the two requests, so the second one does not have to take a password again.
async function createEnrollment(username) {
    const token = randomBytes(32).toString('base64url');
    await redis.set(enrollKeyOf(token), username, { EX: ENROLL_TTL_SECONDS });
    return { token, expiresIn: ENROLL_TTL_SECONDS };
}

async function readEnrollment(token) {
    if (!token) return null;
    return redis.get(enrollKeyOf(token));
}

async function destroyEnrollment(token) {
    if (!token) return;
    await redis.del(enrollKeyOf(token));
}

module.exports = {
    createSession,
    readSession,
    destroySession,
    failureCount,
    recordFailure,
    clearFailures,
    createEnrollment,
    readEnrollment,
    destroyEnrollment,
};
