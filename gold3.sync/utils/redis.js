'use strict';
require('dotenv').config();

const { createClient } = require('redis');

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

const client = createClient({ url: REDIS_URL });
client.on('error', (err) => console.error('[REDIS] client error:', err.message, err));

// Single shared connect promise. Without it, concurrent first-time calls each
// fire connect() and node-redis throws "Socket already opened".
let connecting = null;
async function ensureConnected() {
    if (client.isReady) return;
    if (!connecting) {
        connecting = client.connect().catch((err) => {
            connecting = null;
            throw err;
        });
    }
    await connecting;
}

// Lazy-connecting proxy: callers just use redis.get/set and the socket is
// opened on first use.
const redis = new Proxy(client, {
    get(target, prop, receiver) {
        const value = target[prop];
        if (typeof value !== 'function') return value;
        if (prop === 'connect' || prop === 'quit' || prop === 'disconnect' || prop === 'on') {
            return value.bind(target);
        }
        return async function (...args) {
            await ensureConnected();
            return value.apply(target, args);
        };
    },
});

async function closeRedis() {
    if (!client.isOpen) return;
    try {
        await client.quit();
    } catch (err) {
        console.error('[REDIS] quit failed:', err.message, err);
    }
}

module.exports = { redis, closeRedis, REDIS_URL };
