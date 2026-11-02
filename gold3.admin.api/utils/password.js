'use strict';

const { randomBytes, scrypt, timingSafeEqual } = require('node:crypto');
const { promisify } = require('node:util');

const scryptAsync = promisify(scrypt);

// scrypt from node's own crypto - no dependency, and the cost parameters are
// stored with the hash so they can be raised later without invalidating
// existing passwords.
//
// Stored form: scrypt$N$r$p$<salt base64>$<hash base64>
const N = 16384; // CPU/memory cost
const R = 8;
const P = 1;
const KEY_LENGTH = 32;
const SALT_LENGTH = 16;

async function hashPassword(password) {
    if (typeof password !== 'string' || password.length < 12) {
        throw new Error('password must be at least 12 characters');
    }
    const salt = randomBytes(SALT_LENGTH);
    const key = await scryptAsync(password, salt, KEY_LENGTH, { N, r: R, p: P });
    return `scrypt$${N}$${R}$${P}$${salt.toString('base64')}$${key.toString('base64')}`;
}

/**
 * Verify a password against a stored hash.
 *
 * Never throws on a malformed stored value - a corrupt row must read as "wrong
 * password", not as a 500 that tells the caller the account exists.
 */
async function verifyPassword(password, stored) {
    try {
        const parts = String(stored).split('$');
        if (parts.length !== 6 || parts[0] !== 'scrypt') return false;

        const [, n, r, p, saltB64, hashB64] = parts;
        const salt = Buffer.from(saltB64, 'base64');
        const expected = Buffer.from(hashB64, 'base64');
        const key = await scryptAsync(password, salt, expected.length, {
            N: Number(n),
            r: Number(r),
            p: Number(p),
        });
        // Constant time: a length mismatch is already decided, so compare only
        // when the buffers line up.
        return key.length === expected.length && timingSafeEqual(key, expected);
    } catch (err) {
        console.error('[AUTH] password verify failed:', err.message, err);
        return false;
    }
}

module.exports = { hashPassword, verifyPassword };
