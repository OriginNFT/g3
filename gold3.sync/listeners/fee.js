'use strict';
require('dotenv').config();

const { formatUnits } = require('ethers');

const config = require('../config');
const routerAbi = require('../abi/FeeRouter.json');
const executorAbi = require('../abi/BuybackExecutor.json');
const { ready, insertIgnore, FeeRecord } = require('../model');
const { startListener } = require('../utils/BaseListener');
const { tagName } = require('../utils/tags');
const { decimalsOf } = require('../utils/tokenDecimals');

const SERVICE_NAME = 'fee';

// FeeRouted(source, token, to, amount, purpose) - FeeRouter.
async function handleFeeRouted(event) {
    const { name, args, block, tx, logIndex, ts } = event;
    const decimals = await decimalsOf(args.token);
    await insertIgnore(FeeRecord, {
        method: name,
        source_tag: args.source,
        source_name: tagName(args.source),
        purpose_tag: args.purpose,
        purpose_name: tagName(args.purpose),
        token: args.token,
        to_address: args.to,
        amount_raw: args.amount.toString(),
        amount: formatUnits(args.amount, decimals),
        block,
        tx,
        log_index: logIndex,
        ts,
    });
    console.log(
        `[${SERVICE_NAME}] ${name} block=${block} source=${tagName(args.source) || args.source} purpose=${tagName(args.purpose) || args.purpose} ` +
            `token=${args.token} to=${args.to} amount=${formatUnits(args.amount, decimals)}`
    );
}

// BuybackFunded(purpose, token, amount) - BuybackExecutor.
async function handleBuybackFunded(event) {
    const { name, args, block, tx, logIndex, ts } = event;
    const decimals = await decimalsOf(args.token);
    await insertIgnore(FeeRecord, {
        method: name,
        purpose_tag: args.purpose,
        purpose_name: tagName(args.purpose),
        token: args.token,
        amount_raw: args.amount.toString(),
        amount: formatUnits(args.amount, decimals),
        block,
        tx,
        log_index: logIndex,
        ts,
    });
    console.log(`[${SERVICE_NAME}] ${name} block=${block} purpose=${tagName(args.purpose) || args.purpose} token=${args.token} amount=${formatUnits(args.amount, decimals)}`);
}

// BuybackExecuted(tokenIn, tokenOut, amountIn, amountOut) - BuybackExecutor.
async function handleBuybackExecuted(event) {
    const { name, args, block, tx, logIndex, ts } = event;
    const [decimalsIn, decimalsOut] = await Promise.all([decimalsOf(args.tokenIn), decimalsOf(args.tokenOut)]);
    await insertIgnore(FeeRecord, {
        method: name,
        token: args.tokenIn,
        amount_raw: args.amountIn.toString(),
        amount: formatUnits(args.amountIn, decimalsIn),
        token_out: args.tokenOut,
        amount_out_raw: args.amountOut.toString(),
        amount_out: formatUnits(args.amountOut, decimalsOut),
        block,
        tx,
        log_index: logIndex,
        ts,
    });
    console.log(
        `[${SERVICE_NAME}] ${name} block=${block} in=${formatUnits(args.amountIn, decimalsIn)} ${args.tokenIn} ` +
            `out=${formatUnits(args.amountOut, decimalsOut)} ${args.tokenOut}`
    );
}

// TokensBurned(token, amount) - BuybackExecutor.
async function handleTokensBurned(event) {
    const { name, args, block, tx, logIndex, ts } = event;
    const decimals = await decimalsOf(args.token);
    await insertIgnore(FeeRecord, {
        method: name,
        token: args.token,
        amount_raw: args.amount.toString(),
        amount: formatUnits(args.amount, decimals),
        block,
        tx,
        log_index: logIndex,
        ts,
    });
    console.log(`[${SERVICE_NAME}] ${name} block=${block} token=${args.token} amount=${formatUnits(args.amount, decimals)}`);
}

async function start() {
    await ready;

    await startListener({
        serviceName: SERVICE_NAME,
        startBlock: config.startBlockFor(SERVICE_NAME),
        targets: [
            {
                address: config.addressOf('FEE_ROUTER_ADDRESS'),
                abi: routerAbi,
                label: 'FEE_ROUTER',
                events: {
                    FeeRouted: handleFeeRouted,
                },
            },
            {
                address: config.addressOf('BUYBACK_EXECUTOR_ADDRESS'),
                abi: executorAbi,
                label: 'BUYBACK_EXECUTOR',
                events: {
                    BuybackFunded: handleBuybackFunded,
                    BuybackExecuted: handleBuybackExecuted,
                    TokensBurned: handleTokensBurned,
                },
            },
        ],
    });
}

if (require.main === module) {
    start().catch((err) => {
        console.error(`[FATAL] ${SERVICE_NAME}:`, err.message, err);
        process.exit(1);
    });
}

module.exports = { start };
