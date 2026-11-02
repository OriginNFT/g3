'use strict';

const { redis } = require('./redis');

const CURSOR_PREFIX = 'SYNC:CURSOR:';

function cursorKey(serviceName) {
    return `${CURSOR_PREFIX}${serviceName}`;
}

// Returns the last fully processed block for a service, or null when the
// service has never run. Redis is the primary (and only) cursor store - never
// derive the resume point from max(block) of a business table.
async function getCursor(serviceName) {
    const raw = await redis.get(cursorKey(serviceName));
    if (raw === null || raw === undefined || raw === '') return null;
    const value = Number(raw);
    if (!Number.isFinite(value)) {
        throw new Error(`corrupt cursor for "${serviceName}": ${raw}`);
    }
    return value;
}

// No TTL: the cursor must outlive the process.
async function setCursor(serviceName, block) {
    await redis.set(cursorKey(serviceName), String(block));
}

async function clearCursor(serviceName) {
    return redis.del(cursorKey(serviceName));
}

module.exports = { getCursor, setCursor, clearCursor, cursorKey, CURSOR_PREFIX };
