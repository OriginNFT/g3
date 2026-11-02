'use strict';
require('dotenv').config();

// Prints the Redis cursor and heartbeat of every sync service.
//   npm run status
const config = require('../config');
const { SERVICES } = require('../config/services');
const { getCursor } = require('../utils/cursor');
const { redis, closeRedis } = require('../utils/redis');
const { statusKey } = require('../utils/serviceStatus');

async function main() {
    console.log(`network=${config.NETWORK} chainId=${config.chainId} rpc=${config.rpcUrl}`);
    console.log('');

    for (const service of SERVICES) {
        const isListener = service.kind === 'listener';

        // The heartbeat carries a 60s TTL - missing means the service is down.
        const raw = await redis.get(statusKey(service.name));
        let heartbeat = 'offline';
        let custom = '';
        if (raw) {
            try {
                const status = JSON.parse(raw);
                heartbeat = [
                    status.isRunning ? 'running' : 'stopped',
                    `head=${status.latestChainBlock}`,
                    isListener ? `events=${status.processedEvents}` : `ticks=${status.processedEvents}`,
                    status.lastError ? `lastError="${status.lastError}" at ${status.lastErrorTime}` : '',
                ]
                    .filter(Boolean)
                    .join(' ');
                // A keeper has no cursor or table; what it is doing lives here.
                if (!isListener && status.customStatus && Object.keys(status.customStatus).length > 0) {
                    custom = Object.entries(status.customStatus)
                        .filter(([, v]) => v !== null && v !== undefined)
                        .map(([k, v]) => `${k}=${v}`)
                        .join(' ');
                }
            } catch (err) {
                heartbeat = `unparsable status: ${err.message}`;
            }
        }

        if (isListener) {
            const cursor = await getCursor(service.name);
            console.log(`${service.name.padEnd(16)} cursor=${cursor === null ? 'unset' : cursor}`);
            console.log(`${''.padEnd(16)} table=${service.table}`);
        } else {
            console.log(`${service.name.padEnd(16)} kind=${service.kind}`);
        }
        console.log(`${''.padEnd(16)} ${heartbeat}`);
        if (custom) console.log(`${''.padEnd(16)} ${custom}`);
        console.log('');
    }
}

main()
    .catch((err) => {
        console.error('[FATAL] show-status:', err.message, err);
        process.exitCode = 1;
    })
    .finally(closeRedis);
