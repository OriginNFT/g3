'use strict';
require('dotenv').config();

const { JsonRpcProvider, Contract, getAddress } = require('ethers');

const config = require('../config');

// decimals() of a token, read once from the chain and cached for the life of
// the process. The listeners format every amount with the decimals of the
// token the event names (USDT is 6, GG is 18, GOT2 / AUG are whatever they
// are), so amount columns are always in whole-token units.
const ERC20_ABI = ['function decimals() view returns (uint8)'];

let provider = null;
const cache = new Map();

async function decimalsOf(token) {
    const key = getAddress(token);
    if (cache.has(key)) return cache.get(key);
    if (!provider) provider = new JsonRpcProvider(config.rpcUrl, config.chainId, { staticNetwork: true });
    const decimals = Number(await new Contract(key, ERC20_ABI, provider).decimals());
    cache.set(key, decimals);
    return decimals;
}

module.exports = { decimalsOf };
