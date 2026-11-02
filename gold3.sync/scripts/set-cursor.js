'use strict';
require('dotenv').config();

// Sets or clears the Redis block cursor of a service.
//   node scripts/set-cursor.js <service> <block>   set the last processed block
//   node scripts/set-cursor.js <service> clear     drop the cursor (next start
//                                                  falls back to START_BLOCK_*)
//
// Stop the service before running this - a live listener overwrites the cursor
// as soon as it finishes its current range.
const { SERVICES, SERVICE_NAMES, LISTENER_NAMES } = require('../config/services');
const { getCursor, setCursor, clearCursor } = require('../utils/cursor');
const { closeRedis } = require('../utils/redis');

async function main() {
    const [service, value] = process.argv.slice(2);

    if (!service || !value) {
        console.error('usage: node scripts/set-cursor.js <service> <block|clear>');
        console.error(`services: ${LISTENER_NAMES.join(', ')}`);
        process.exit(1);
    }

    if (!SERVICE_NAMES.includes(service)) {
        console.error(`unknown service "${service}" (services: ${LISTENER_NAMES.join(', ')})`);
        process.exit(1);
    }

    // Only listeners are cursor-driven; setting a cursor for anything else
    // would silently do nothing.
    if (!LISTENER_NAMES.includes(service)) {
        const { kind } = SERVICES.find((s) => s.name === service);
        console.error(`"${service}" is a ${kind}, not a listener - it has no block cursor`);
        process.exit(1);
    }

    const before = await getCursor(service);

    if (value === 'clear') {
        await clearCursor(service);
        console.log(`${service}: cursor cleared (was ${before === null ? 'unset' : before})`);
        return;
    }

    const block = Number(value);
    if (!Number.isInteger(block) || block < 0) {
        console.error(`block must be a non-negative integer, got "${value}"`);
        process.exit(1);
    }

    await setCursor(service, block);
    console.log(`${service}: cursor ${before === null ? 'unset' : before} -> ${block} (next start resumes at ${block + 1})`);
}

main()
    .catch((err) => {
        console.error('[FATAL] set-cursor:', err.message, err);
        process.exitCode = 1;
    })
    .finally(closeRedis);
