'use strict';
require('dotenv').config();

const { formatUnits } = require('ethers');

const config = require('../config');
const abi = require('../abi/ComputingVault.json');
const { ready, insertIgnore, PositionRecord, HoldingDay } = require('../model');
const { startListener } = require('../utils/BaseListener');
const { amountFields } = require('../utils/amount');
const { decimalsOf } = require('../utils/tokenDecimals');

const SERVICE_NAME = 'position';

// PositionCreated(positionId, owner, asset, inputAmount, usdtValue, power)
//
// participate() opened a power position: `power` (1e18 = 1 USDT of power) is
// the primary amount; the input is in the asset's own decimals and usdtValue
// is the TWAP value the power was computed from.
async function handlePositionCreated(event) {
    const { name, args, block, tx, logIndex, ts } = event;
    const decimals = await decimalsOf(args.asset);
    await insertIgnore(PositionRecord, {
        address: args.owner,
        method: name,
        ...amountFields(args.power, config.VALUE_DECIMALS),
        position_id: args.positionId.toString(),
        asset: args.asset,
        input_amount_raw: args.inputAmount.toString(),
        input_amount: formatUnits(args.inputAmount, decimals),
        usdt_value: formatUnits(args.usdtValue, config.VALUE_DECIMALS),
        block,
        tx,
        log_index: logIndex,
        ts,
    });
    console.log(
        `[${SERVICE_NAME}] ${name} block=${block} id=${args.positionId} owner=${args.owner} asset=${args.asset} ` +
            `input=${formatUnits(args.inputAmount, decimals)} usdt=${formatUnits(args.usdtValue, config.VALUE_DECIMALS)} ` +
            `power=${formatUnits(args.power, config.VALUE_DECIMALS)}`
    );
}

// TokensBurned(token, from, amount) - the burn half of a GOT2 / GG position.
async function handleTokensBurned(event) {
    const { name, args, block, tx, logIndex, ts } = event;
    const decimals = await decimalsOf(args.token);
    await insertIgnore(PositionRecord, {
        address: args.from,
        method: name,
        ...amountFields(args.amount, decimals),
        token: args.token,
        block,
        tx,
        log_index: logIndex,
        ts,
    });
    console.log(`[${SERVICE_NAME}] ${name} block=${block} from=${args.from} token=${args.token} amount=${formatUnits(args.amount, decimals)}`);
}

// HoldingRewardNotified(dayId, amount) - the GG the vault pulled for the day.
async function handleHoldingRewardNotified(event) {
    const { name, args, block, tx, logIndex, ts } = event;
    await insertIgnore(HoldingDay, {
        method: name,
        day: args.dayId.toString(),
        amount: formatUnits(args.amount, config.GG_DECIMALS),
        block,
        tx,
        log_index: logIndex,
        ts,
    });
    console.log(`[${SERVICE_NAME}] ${name} block=${block} day=${args.dayId} amount=${formatUnits(args.amount, config.GG_DECIMALS)}`);
}

// HoldingRewardClaimed(account, amount) - GG delivered to the turbine.
async function handleHoldingRewardClaimed(event) {
    const { name, args, block, tx, logIndex, ts } = event;
    await insertIgnore(PositionRecord, {
        address: args.account,
        method: name,
        ...amountFields(args.amount, config.GG_DECIMALS),
        block,
        tx,
        log_index: logIndex,
        ts,
    });
    console.log(`[${SERVICE_NAME}] ${name} block=${block} account=${args.account} amount=${formatUnits(args.amount, config.GG_DECIMALS)}`);
}

async function start() {
    await ready;

    await startListener({
        serviceName: SERVICE_NAME,
        startBlock: config.startBlockFor(SERVICE_NAME),
        targets: [
            {
                address: config.addressOf('COMPUTING_VAULT_ADDRESS'),
                abi,
                label: 'COMPUTING_VAULT',
                events: {
                    PositionCreated: handlePositionCreated,
                    TokensBurned: handleTokensBurned,
                    HoldingRewardNotified: handleHoldingRewardNotified,
                    HoldingRewardClaimed: handleHoldingRewardClaimed,
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
