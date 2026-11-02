'use strict';
require('dotenv').config();

const addressBook = require('./addresses.json');
const { SERVICES, SERVICE_NAMES, LISTENER_NAMES } = require('./services');

const NETWORK = process.env.NETWORK || 'anubis';
const addresses = addressBook[NETWORK];
if (!addresses) {
    throw new Error(
        `NETWORK "${NETWORK}" not found in config/addresses.json (available: ${Object.keys(addressBook).join(', ')}). ` +
            'Run "npm run sync-addresses" if the address book is stale.'
    );
}

function num(name, fallback) {
    const raw = process.env[name];
    if (raw === undefined || raw === '') return fallback;
    const value = Number(raw);
    if (!Number.isFinite(value)) throw new Error(`env ${name} is not a number: ${raw}`);
    return value;
}

// Resolves the first-run block for a service. The live cursor lives in Redis;
// this value is only used when Redis holds no cursor for that service yet.
function startBlockFor(serviceName) {
    const key = `START_BLOCK_${serviceName.toUpperCase().replace(/-/g, '_')}`;
    const value = num(key, num('START_BLOCK', 0));
    if (value < 0) throw new Error(`env ${key} must be >= 0, got ${value}`);
    return value;
}

// Reads an address out of the address book and fails loudly when it is missing
// or still the zero placeholder.
function addressOf(key) {
    const value = addresses[key];
    if (!value) throw new Error(`address "${key}" missing from config/addresses.json[${NETWORK}]`);
    if (/^0x0{40}$/i.test(value)) throw new Error(`address "${key}" is the zero address in config/addresses.json[${NETWORK}]`);
    return value;
}

module.exports = {
    NETWORK,
    addresses,
    addressOf,
    startBlockFor,
    SERVICES,
    SERVICE_NAMES,
    LISTENER_NAMES,
    chainId: num('CHAIN_ID', 6714),
    rpcUrl: process.env.RPC_URL || 'https://rpc2.anubispace.org',
    confirmBlocks: num('CONFIRM_BLOCKS', 16),
    blockStep: num('BLOCK_STEP', 500),
    sleepInterval: num('SLEEP_INTERVAL', 15),
    // GG and every USDT value the contracts emit are 1e18-scaled.
    GG_DECIMALS: 18,
    VALUE_DECIMALS: 18,
    // anubis USDT
    USDT_DECIMALS: 6,
    BPS: 10000,
    // Protocol day boundary: SGT 12:00 = UTC 04:00; mirrors EmissionController.
    SGT_OFFSET_SECONDS: 8 * 3600,
};
