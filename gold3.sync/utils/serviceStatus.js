'use strict';
require('dotenv').config();

const { redis } = require('./redis');

const STATUS_PREFIX = 'SERVICE:STATUS:';
const STATUS_TTL_SECONDS = 60;
const STATUS_INTERVAL_MS = 30000;

function statusKey(serviceName) {
    return `${STATUS_PREFIX}${serviceName}`;
}

// Heartbeat written to Redis with a 60s TTL, so a dead service disappears from
// the monitoring view on its own. Also forwarded to pm2 via process.send().
function createServiceStatus(serviceName) {
    const status = {
        serviceName,
        pm2Name: process.env.name || serviceName,
        startTime: new Date().toISOString(),
        lastBlock: 0,
        currentBlock: 0,
        latestChainBlock: 0,
        lastError: null,
        lastErrorTime: null,
        processedEvents: 0,
        isRunning: false,
        customStatus: {},
    };

    // customStatus may hold bigints; JSON.stringify would throw without this.
    const serialize = () => JSON.stringify(status, (k, v) => (typeof v === 'bigint' ? v.toString() : v));

    const save = () => {
        redis
            .set(statusKey(serviceName), serialize(), { EX: STATUS_TTL_SECONDS })
            .catch((err) => console.error(`[STATUS] redis save failed (${serviceName}):`, err.message, err));
        if (process.send) {
            process.send({ type: 'service_status', data: status });
        }
    };

    const recordError = (err) => {
        status.lastError = err && err.message ? err.message : String(err);
        status.lastErrorTime = new Date().toISOString();
        save();
    };

    // Keeps the heartbeat alive while the listener idles at the chain head.
    const timer = setInterval(save, STATUS_INTERVAL_MS);
    timer.unref();

    process.on('message', (msg) => {
        if (msg && msg.type === 'get_status') save();
    });

    const stop = () => clearInterval(timer);

    return { status, save, recordError, stop };
}

module.exports = { createServiceStatus, statusKey, STATUS_PREFIX };
