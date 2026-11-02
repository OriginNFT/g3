'use strict';

const { createHmac, randomBytes, timingSafeEqual } = require('node:crypto');

// RFC 6238 TOTP, the Google Authenticator profile: HMAC-SHA1 over a 30-second
// counter, truncated to 6 digits. Implemented here rather than pulled in as a
// dependency - it is thirty lines of a fully specified algorithm, and the
// verification side is where the security actually lives (replay rejection,
// which a library would leave to the caller anyway).
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const STEP_SECONDS = 30;
const DIGITS = 6;

function base32Encode(buffer) {
    let bits = 0;
    let value = 0;
    let output = '';
    for (const byte of buffer) {
        value = (value << 8) | byte;
        bits += 8;
        while (bits >= 5) {
            output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
            bits -= 5;
        }
    }
    if (bits > 0) output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
    return output;
}

function base32Decode(input) {
    const clean = String(input).toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
    let bits = 0;
    let value = 0;
    const bytes = [];
    for (const char of clean) {
        const index = BASE32_ALPHABET.indexOf(char);
        if (index === -1) throw new Error(`invalid base32 character: ${char}`);
        value = (value << 5) | index;
        bits += 5;
        if (bits >= 8) {
            bytes.push((value >>> (bits - 8)) & 255);
            bits -= 8;
        }
    }
    return Buffer.from(bytes);
}

/// A fresh 160-bit secret, base32 encoded the way authenticator apps expect.
function generateSecret() {
    return base32Encode(randomBytes(20));
}

/// The URI an authenticator app scans. Contains the secret - never log it.
function otpauthUrl(secret, account, issuer) {
    const label = encodeURIComponent(`${issuer}:${account}`);
    const query = new URLSearchParams({
        secret,
        issuer,
        algorithm: 'SHA1',
        digits: String(DIGITS),
        period: String(STEP_SECONDS),
    });
    return `otpauth://totp/${label}?${query.toString()}`;
}

function counterAt(seconds) {
    return Math.floor(seconds / STEP_SECONDS);
}

function codeForCounter(secret, counter) {
    const key = base32Decode(secret);
    const buffer = Buffer.alloc(8);
    // Counter is a 64-bit big-endian integer; it stays well inside 2^53 for any
    // real timestamp, so the high word is written separately rather than with
    // BigInt gymnastics.
    buffer.writeUInt32BE(Math.floor(counter / 2 ** 32), 0);
    buffer.writeUInt32BE(counter >>> 0, 4);

    const digest = createHmac('sha1', key).update(buffer).digest();
    const offset = digest[digest.length - 1] & 0x0f;
    const binary =
        ((digest[offset] & 0x7f) << 24) |
        ((digest[offset + 1] & 0xff) << 16) |
        ((digest[offset + 2] & 0xff) << 8) |
        (digest[offset + 3] & 0xff);
    return String(binary % 10 ** DIGITS).padStart(DIGITS, '0');
}

/**
 * Check a code against the counters around `now`.
 *
 * @returns the counter it matched, or null. The caller MUST persist that
 *          counter and refuse anything at or below it next time - without that
 *          a code stays usable for its whole 30-second window, which is exactly
 *          long enough for someone reading it over a shoulder or off a proxy.
 */
function verifyCode(secret, code, { window, nowSeconds = Math.floor(Date.now() / 1000) } = {}) {
    const candidate = String(code || '').trim();
    if (!/^\d{6}$/.test(candidate)) return null;

    const current = counterAt(nowSeconds);
    const span = Number.isFinite(window) ? window : 1;

    for (let drift = -span; drift <= span; drift++) {
        const counter = current + drift;
        if (counter < 0) continue;
        const expected = codeForCounter(secret, counter);
        // Same length by construction, so a timing-safe compare is meaningful.
        if (timingSafeEqual(Buffer.from(expected), Buffer.from(candidate))) return counter;
    }
    return null;
}

module.exports = { generateSecret, otpauthUrl, verifyCode, codeForCounter, counterAt };
