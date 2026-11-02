'use strict';
require('dotenv').config();

const { formatUnits } = require('ethers');

const config = require('../config');
const abi = require('../abi/TierStaking.json');
const { ready, insertIgnore, TierRecord } = require('../model');
const { startListener } = require('../utils/BaseListener');
const { amountFields } = require('../utils/amount');

const SERVICE_NAME = 'tier';

// TierStaked(account, amount) / TierUnstaked(account, amount)
async function handleLock(event) {
    const { name, args, block, tx, logIndex, ts } = event;
    await insertIgnore(TierRecord, {
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

// TierChanged(account, fromTier, toTier) - no amount.
async function handleTierChanged(event) {
    const { name, args, block, tx, logIndex, ts } = event;
    await insertIgnore(TierRecord, {
        address: args.account,
        method: name,
        ...amountFields(0n, config.GG_DECIMALS),
        tier_from: Number(args.fromTier),
        tier_to: Number(args.toTier),
        block,
        tx,
        log_index: logIndex,
        ts,
    });
    console.log(`[${SERVICE_NAME}] ${name} block=${block} account=${args.account} G${args.fromTier} -> G${args.toTier}`);
}

async function start() {
    await ready;

    await startListener({
        serviceName: SERVICE_NAME,
        startBlock: config.startBlockFor(SERVICE_NAME),
        targets: [
            {
                address: config.addressOf('TIER_STAKING_ADDRESS'),
                abi,
                label: 'TIER_STAKING',
                events: {
                    TierStaked: handleLock,
                    TierUnstaked: handleLock,
                    TierChanged: handleTierChanged,
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
