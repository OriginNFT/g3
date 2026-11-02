'use strict';

const express = require('express');

const { redis } = require('../utils/redis');
const { requirePermission } = require('../middleware/permission');
const { wrap } = require('../utils/asyncRoute');

const router = express.Router();

// Written by helix.sync: utils/serviceStatus.js and utils/cursor.js.
const STATUS_PREFIX = 'SERVICE:STATUS:';
const CURSOR_PREFIX = 'SYNC:CURSOR:';

// The heartbeat carries a 60s TTL, so a key that is simply gone means the
// service is not running. Discovering services by scanning rather than from a
// hardcoded list means this reports what IS running, not what was expected to.
async function scanKeys(prefix) {
    const found = [];
    let cursor = 0;
    do {
        const result = await redis.scan(cursor, { MATCH: `${prefix}*`, COUNT: 200 });
        cursor = Number(result.cursor);
        found.push(...result.keys);
    } while (cursor !== 0);
    return found;
}

/**
 * What the sync services are doing.
 *
 * This is the watchdog view: a listener that quietly stopped looks exactly like
 * one that is idle unless you compare its heartbeat and its cursor against the
 * chain head.
 */
router.get('/', requirePermission('services.read'), wrap(async function (req, res) {
    let statusKeys;
    let cursorKeys;
    try {
        [statusKeys, cursorKeys] = await Promise.all([scanKeys(STATUS_PREFIX), scanKeys(CURSOR_PREFIX)]);
    } catch (err) {
        console.error('[SERVICES] redis scan failed:', err.message, err);
        return res.status(503).json({ error: 'cannot reach redis' });
    }

    const names = new Set([
        ...statusKeys.map((key) => key.slice(STATUS_PREFIX.length)),
        ...cursorKeys.map((key) => key.slice(CURSOR_PREFIX.length)),
    ]);

    const services = [];
    for (const name of [...names].sort()) {
        const [rawStatus, rawCursor] = await Promise.all([
            redis.get(`${STATUS_PREFIX}${name}`),
            redis.get(`${CURSOR_PREFIX}${name}`),
        ]);

        let status = null;
        if (rawStatus) {
            try {
                status = JSON.parse(rawStatus);
            } catch (err) {
                console.error(`[SERVICES] unparsable status for ${name}:`, err.message, err);
                status = { parseError: err.message };
            }
        }

        const cursor = rawCursor === null || rawCursor === undefined || rawCursor === '' ? null : Number(rawCursor);
        const head = status && Number.isFinite(Number(status.latestChainBlock)) ? Number(status.latestChainBlock) : null;
        const last = status && Number.isFinite(Number(status.lastBlock)) ? Number(status.lastBlock) : cursor;

        services.push({
            name,
            // No heartbeat within its 60s TTL is the only reliable "it is not
            // running" signal - a process can die without ever writing false.
            online: Boolean(status),
            isRunning: status ? Boolean(status.isRunning) : false,
            startTime: status ? status.startTime : null,
            cursor,
            lastBlock: last,
            latestChainBlock: head,
            behind: head !== null && last !== null ? head - last : null,
            processedEvents: status ? status.processedEvents : null,
            lastError: status ? status.lastError : null,
            lastErrorTime: status ? status.lastErrorTime : null,
            customStatus: status ? status.customStatus || null : null,
        });
    }

    res.json({ services });
}));

module.exports = router;
