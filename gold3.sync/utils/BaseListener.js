'use strict';
require('dotenv').config();

const { JsonRpcProvider, Interface, getAddress } = require('ethers');

const config = require('../config');
const { ready, sequelize } = require('../model');
const { getCursor, setCursor } = require('./cursor');
const { closeRedis } = require('./redis');
const { createServiceStatus } = require('./serviceStatus');

const RETRY_BASE_MS = 5000;
const RETRY_MAX_MS = 60000;

async function blockTimestamp(provider, blockNumber, cache) {
    if (cache.has(blockNumber)) return cache.get(blockNumber);
    const block = await provider.getBlock(blockNumber);
    if (!block) throw new Error(`block ${blockNumber} not found`);
    const ts = new Date(Number(block.timestamp) * 1000);
    cache.set(blockNumber, ts);
    return ts;
}

// Builds the address -> {interface, handlers} dispatch table and the union of
// topic0 hashes, so one getLogs call covers every contract/event of a service.
function buildDispatch(targets) {
    if (!Array.isArray(targets) || targets.length === 0) {
        throw new Error('startListener: "targets" must be a non-empty array');
    }

    const byAddress = new Map();
    const topics = new Set();

    for (const target of targets) {
        const { address, abi, events, label = null } = target;
        if (!address) throw new Error('startListener: target is missing "address"');
        if (!abi) throw new Error(`startListener: target ${address} is missing "abi"`);
        if (!events || Object.keys(events).length === 0) {
            throw new Error(`startListener: target ${address} has no "events"`);
        }

        // getAddress() only re-checksums - it never lowercases the stored value.
        const key = getAddress(address);
        if (byAddress.has(key)) throw new Error(`startListener: duplicate target address ${key}`);

        const iface = new Interface(abi);
        for (const eventName of Object.keys(events)) {
            const fragment = iface.getEvent(eventName);
            if (!fragment) throw new Error(`event "${eventName}" not found in the ABI of ${key}`);
            if (typeof events[eventName] !== 'function') {
                throw new Error(`handler for "${eventName}" on ${key} is not a function`);
            }
            topics.add(fragment.topicHash);
        }

        byAddress.set(key, { address: key, label, iface, events });
    }

    return { byAddress, addresses: [...byAddress.keys()], topic0: [...topics] };
}

/**
 * Generic chain-event -> database pump.
 *
 * options:
 *   serviceName  string   cursor / status key, e.g. 'staking'
 *   targets      array    [{ address, abi, label?, events: { EventName: handler } }]
 *   startBlock   number   first-run block, only used when Redis holds no cursor
 *   blockStep / sleepInterval / confirmBlocks / rpcUrl / chainId  optional overrides
 *
 * Each handler receives:
 *   { name, args, address, label, block, tx, logIndex, ts, status, getTx }
 * getTx() resolves the transaction that emitted the log, cached per range and
 * fetched only when a handler asks - it is one extra RPC round trip, so it is
 * for events that do not carry what the row needs (an event with no depositor
 * in it, say) rather than for every row.
 * A handler that throws makes the whole range retry, so handlers must write
 * idempotently (every model carries a unique index on (tx, log_index)).
 */
async function startListener(options) {
    const {
        serviceName,
        targets,
        startBlock = 0,
        rpcUrl = config.rpcUrl,
        chainId = config.chainId,
        blockStep = config.blockStep,
        sleepInterval = config.sleepInterval,
        confirmBlocks = config.confirmBlocks,
    } = options;

    if (!serviceName) throw new Error('startListener: "serviceName" is required');
    if (blockStep < 1) throw new Error(`startListener: blockStep must be >= 1, got ${blockStep}`);

    await ready;

    const { byAddress, addresses, topic0 } = buildDispatch(targets);

    console.log(`[INIT] service=${serviceName} network=${config.NETWORK} chainId=${chainId} rpc=${rpcUrl}`);
    console.log(`[INIT] blockStep=${blockStep} sleep=${sleepInterval}s confirmBlocks=${confirmBlocks}`);
    for (const target of byAddress.values()) {
        const label = target.label ? `${target.label} ` : '';
        console.log(`[INIT] ${label}${target.address} -> ${Object.keys(target.events).join(', ')}`);
    }

    const provider = new JsonRpcProvider(rpcUrl, chainId, { staticNetwork: true });
    // staticNetwork skips ethers' own chainId detection, so verify it once here
    // instead of silently syncing the wrong chain.
    const rpcChainId = Number(await provider.send('eth_chainId', []));
    if (rpcChainId !== chainId) {
        throw new Error(`RPC ${rpcUrl} serves chainId ${rpcChainId}, expected ${chainId}`);
    }

    const { status, save: saveStatus, recordError, stop: stopStatus } = createServiceStatus(serviceName);

    // Interruptible idle wait, so a stop signal does not have to sit through a
    // full sleepInterval before the process can exit.
    let stopping = false;
    let wakeUp = null;
    const idle = (ms) => new Promise((resolve) => {
        const timer = setTimeout(() => {
            wakeUp = null;
            resolve();
        }, ms);
        wakeUp = () => {
            clearTimeout(timer);
            wakeUp = null;
            resolve();
        };
    });

    for (const signal of ['SIGINT', 'SIGTERM']) {
        process.on(signal, () => {
            if (stopping) return;
            stopping = true;
            console.log(`[${serviceName}] ${signal} received, finishing the current range before exit`);
            if (wakeUp) wakeUp();
        });
    }

    const cursor = await getCursor(serviceName);
    if (cursor === null) {
        console.log(`[CURSOR] no redis cursor, first run from block ${startBlock}`);
    } else {
        console.log(`[CURSOR] resuming after block ${cursor}`);
    }
    let next = cursor === null ? startBlock : cursor + 1;

    status.lastBlock = next - 1;
    status.currentBlock = next;
    status.isRunning = true;
    saveStatus();

    // Fetch + decode + persist one inclusive block range. Returns how many logs
    // were dispatched to a handler.
    async function processRange(fromBlock, toBlock) {
        const logs = await provider.getLogs({ address: addresses, topics: [topic0], fromBlock, toBlock });
        if (logs.length === 0) return 0;

        // Chain order matters for downstream aggregation.
        logs.sort((a, b) => (a.blockNumber - b.blockNumber) || (a.index - b.index));

        const tsCache = new Map();
        const txCache = new Map();
        let handled = 0;

        // One fetch per transaction hash, however many of its logs ask for it.
        async function transactionOf(hash) {
            if (txCache.has(hash)) return txCache.get(hash);
            const transaction = await provider.getTransaction(hash);
            if (!transaction) throw new Error(`transaction ${hash} not found`);
            txCache.set(hash, transaction);
            return transaction;
        }

        for (const log of logs) {
            const target = byAddress.get(getAddress(log.address));
            if (!target) continue;

            // parseLog returns null when another target owns this topic0.
            const parsed = target.iface.parseLog({ topics: log.topics.slice(), data: log.data });
            if (!parsed) continue;

            const handler = target.events[parsed.name];
            if (!handler) continue;

            await handler({
                name: parsed.name,
                args: parsed.args,
                address: target.address,
                label: target.label,
                block: log.blockNumber,
                tx: log.transactionHash,
                logIndex: log.index,
                ts: await blockTimestamp(provider, log.blockNumber, tsCache),
                status,
                getTx: () => transactionOf(log.transactionHash),
            });

            handled++;
        }

        return handled;
    }

    async function shutdown(code) {
        status.isRunning = false;
        saveStatus();
        stopStatus();
        try {
            await sequelize.close();
        } catch (err) {
            console.error('[DB] close failed:', err.message, err);
        }
        await closeRedis();
        console.log(`[${serviceName}] stopped at block ${status.lastBlock}`);
        process.exit(code);
    }

    while (!stopping) {
        try {
            const latest = await provider.getBlockNumber();
            const safeBlock = latest - confirmBlocks;
            status.latestChainBlock = latest;

            if (next > safeBlock) {
                console.log(`[IDLE] head=${latest} safe=${safeBlock} next=${next}`);
            }

            while (next <= safeBlock && !stopping) {
                const toBlock = Math.min(next + blockStep - 1, safeBlock);
                status.currentBlock = next;

                // The range and its cursor write are retried together; handlers
                // are idempotent, so replaying a range is harmless.
                let attempt = 0;
                let done = false;
                while (!done && !stopping) {
                    try {
                        const handled = await processRange(next, toBlock);
                        await setCursor(serviceName, toBlock);
                        status.processedEvents += handled;
                        if (handled > 0) {
                            console.log(`[SYNC] ${next}-${toBlock} handled=${handled} (total=${status.processedEvents})`);
                        }
                        done = true;
                    } catch (err) {
                        attempt++;
                        const wait = Math.min(RETRY_BASE_MS * 2 ** (attempt - 1), RETRY_MAX_MS);
                        console.error(`[ERROR] range ${next}-${toBlock} attempt ${attempt}, retry in ${wait / 1000}s:`, err.message, err);
                        recordError(err);
                        await idle(wait);
                    }
                }

                // Cursor untouched when a stop interrupted the retries; the
                // range is simply replayed on the next start.
                if (!done) break;

                status.lastBlock = toBlock;
                next = toBlock + 1;
                status.currentBlock = next;
                saveStatus();
            }
        } catch (err) {
            console.error(`[ERROR] ${serviceName} loop:`, err.message, err);
            recordError(err);
        }

        if (stopping) break;
        await idle(sleepInterval * 1000);
    }

    await shutdown(0);
}

module.exports = { startListener };
