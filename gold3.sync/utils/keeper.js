'use strict';
require('dotenv').config();

const { JsonRpcProvider, Wallet, parseUnits, id, getAddress } = require('ethers');

const config = require('../config');
const { sequelize } = require('../model');
const { closeRedis } = require('./redis');
const { createServiceStatus } = require('./serviceStatus');

// Shared plumbing for the keepers - the services that SEND transactions on a
// tick loop. Everything a keeper file would otherwise repeat lives here, so
// each keeper is only its decision logic:
//
//   createProvider()          JsonRpcProvider with the chainId asserted once
//   createWallet(env, opts)   signer from an env var; null in a dry run
//   resolveGasOverrides(p)    { gasPrice, gasLimit } from env or the node
//   runTickLoop({...})        heartbeat + interruptible idle + SIGINT/SIGTERM
//   assertRole(...)           fail at startup instead of one revert per tick
//   eventsOf(...)             decoded events of one contract in a receipt
//   isDryRun()                --dry-run: read and decide, send nothing
//
// Env (all keepers):
//   KEEPER_TICK_INTERVAL_SECONDS  seconds between ticks (default 60)
//   KEEPER_GAS_PRICE_GWEI         fixed gas price; empty = the node's suggestion
//   KEEPER_GAS_LIMIT              gas limit per send (default 1500000)
//   <SIGNER_PK>                   per keeper, see the keeper's header

function num(name, fallback) {
    const raw = process.env[name];
    if (raw === undefined || raw === '') return fallback;
    const value = Number(raw);
    if (!Number.isFinite(value)) throw new Error(`env ${name} is not a number: ${raw}`);
    return value;
}

const TICK_INTERVAL_SECONDS = num('KEEPER_TICK_INTERVAL_SECONDS', 60);
const GAS_LIMIT = num('KEEPER_GAS_LIMIT', 1500000);
const GAS_PRICE_GWEI = process.env.KEEPER_GAS_PRICE_GWEI || null;

const DRY_RUN = process.argv.slice(2).includes('--dry-run');

// True when the process was started with --dry-run: the keeper reads the chain,
// logs what it would send, and sends nothing.
function isDryRun() {
    return DRY_RUN;
}

// JsonRpcProvider for config.rpcUrl. staticNetwork skips ethers' own chainId
// detection, so the chain is verified once here instead of silently sending
// to the wrong network.
async function createProvider() {
    const provider = new JsonRpcProvider(config.rpcUrl, config.chainId, { staticNetwork: true });
    const rpcChainId = Number(await provider.send('eth_chainId', []));
    if (rpcChainId !== config.chainId) {
        throw new Error(`RPC ${config.rpcUrl} serves chainId ${rpcChainId}, expected ${config.chainId}`);
    }
    return provider;
}

// Signer from the private key in process.env[envName], connected to
// `provider`. Returns null when the variable is unset and either the process
// is a dry run or `required` is false; throws otherwise, naming the variable.
function createWallet(envName, { required = true, provider = null } = {}) {
    const pk = process.env[envName];
    if (!pk) {
        if (DRY_RUN || !required) return null;
        throw new Error(`${envName} is not set - the keeper cannot sign (use --dry-run to run without a key)`);
    }
    if (!provider) throw new Error(`createWallet(${envName}): a provider is required to connect the wallet`);
    return new Wallet(pk, provider);
}

// Transaction overrides for every send: gasPrice from KEEPER_GAS_PRICE_GWEI
// when set, else the node's suggestion (a node that returns none is an error,
// not a guess); gasLimit from KEEPER_GAS_LIMIT.
async function resolveGasOverrides(provider) {
    let gasPrice;
    if (GAS_PRICE_GWEI) {
        gasPrice = parseUnits(GAS_PRICE_GWEI, 'gwei');
    } else {
        const fee = await provider.getFeeData();
        if (!fee.gasPrice) throw new Error('node returned no gasPrice; set KEEPER_GAS_PRICE_GWEI');
        gasPrice = fee.gasPrice;
    }
    return { gasPrice, gasLimit: GAS_LIMIT };
}

// Verifies that `address` holds `roleName` (keccak256 of the name, the way
// every AccessControl contract here defines its constants) on `contract`,
// which must expose hasRole(bytes32,address). Throws when it does not, naming
// the granting script under gold3.contract/scripts/config/ so the fix is one
// command instead of one revert per tick forever. Skipped when `address` is
// null (a dry run without a key has nothing to check).
async function assertRole(contract, roleName, address, grantScriptHint) {
    if (!address) return;
    const role = id(roleName);
    const target = await contract.getAddress();
    const authorised = await contract.hasRole(role, address);
    if (!authorised) {
        throw new Error(
            `${address} does not hold ${roleName} on ${target} - grant it with ` +
                `gold3.contract/scripts/config/${grantScriptHint}`
        );
    }
}

// Decoded events named `name` that `contract` emitted in `receipt`, in log order.
function eventsOf(contract, receipt, name) {
    const target = getAddress(contract.target);
    const found = [];
    for (const entry of receipt.logs) {
        if (getAddress(entry.address) !== target) continue;
        let parsed = null;
        try {
            parsed = contract.interface.parseLog({ topics: [...entry.topics], data: entry.data });
        } catch (err) {
            continue;
        }
        if (parsed && parsed.name === name) found.push(parsed);
    }
    return found;
}

/**
 * Runs `tick(status)` forever, `tickSeconds` apart, until SIGINT/SIGTERM.
 *
 *   serviceName  heartbeat key (SERVICE:STATUS:<serviceName>) and log prefix
 *   tickSeconds  idle between ticks; default KEEPER_TICK_INTERVAL_SECONDS
 *   tick         async (status) => boolean|void. `status` is the heartbeat
 *                object from createServiceStatus. A tick that resolves to
 *                true is followed straight away by the next one (there is
 *                more work); anything else idles for tickSeconds first.
 *
 * A tick that throws is logged and recorded in the heartbeat; the loop keeps
 * going. The idle is interruptible, so a stop signal does not sit through a
 * full tick interval; the signal is honoured after the running tick finishes,
 * never in the middle of a send. On exit the heartbeat is marked stopped and
 * the database pool and Redis are closed before process.exit(0).
 */
async function runTickLoop({ serviceName, tickSeconds = TICK_INTERVAL_SECONDS, tick }) {
    if (!serviceName) throw new Error('runTickLoop: "serviceName" is required');
    if (typeof tick !== 'function') throw new Error('runTickLoop: "tick" must be a function');
    if (!(tickSeconds > 0)) throw new Error(`runTickLoop: tickSeconds must be > 0, got ${tickSeconds}`);

    const { status, save: saveStatus, recordError, stop: stopStatus } = createServiceStatus(serviceName);
    status.isRunning = true;
    saveStatus();

    let stopping = false;
    let wakeUp = null;
    const idle = (ms) =>
        new Promise((resolve) => {
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
            console.log(`[${serviceName}] ${signal} received, finishing the current tick before exit`);
            if (wakeUp) wakeUp();
        });
    }

    console.log(`[${serviceName}]${DRY_RUN ? ' [DRY-RUN]' : ''} tick loop started, every ${tickSeconds}s`);

    while (!stopping) {
        let more = false;
        try {
            more = (await tick(status)) === true;
            status.processedEvents += 1;
            saveStatus();
        } catch (err) {
            console.error(`[${serviceName}] tick failed:`, err.message, err);
            recordError(err);
        }
        if (stopping) break;
        if (!more) await idle(tickSeconds * 1000);
    }

    status.isRunning = false;
    saveStatus();
    stopStatus();
    try {
        await sequelize.close();
    } catch (err) {
        console.error('[DB] close failed:', err.message, err);
    }
    await closeRedis();
    console.log(`[${serviceName}] stopped`);
    process.exit(0);
}

module.exports = {
    TICK_INTERVAL_SECONDS,
    GAS_LIMIT,
    GAS_PRICE_GWEI,
    isDryRun,
    createProvider,
    createWallet,
    resolveGasOverrides,
    assertRole,
    eventsOf,
    runTickLoop,
};
