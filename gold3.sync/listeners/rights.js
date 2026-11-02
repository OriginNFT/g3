'use strict';
require('dotenv').config();

const { formatUnits } = require('ethers');

const config = require('../config');
const ledgerAbi = require('../abi/NFTRightsLedger.json');
const claimAbi = require('../abi/ClaimController.json');
const { ready, insertIgnore, RightsRecord } = require('../model');
const { startListener } = require('../utils/BaseListener');
const { amountFields } = require('../utils/amount');
const { decimalsOf } = require('../utils/tokenDecimals');

const SERVICE_NAME = 'rights';

function usdt(raw) {
    return formatUnits(raw, config.VALUE_DECIMALS);
}

// RightsCreated(account, asset, burnedAmount, usdtValue, rights)
async function handleRightsCreated(event) {
    const { name, args, block, tx, logIndex, ts } = event;
    const decimals = await decimalsOf(args.asset);
    await insertIgnore(RightsRecord, {
        address: args.account,
        method: name,
        ...amountFields(args.rights, config.VALUE_DECIMALS),
        asset: args.asset,
        burned_amount_raw: args.burnedAmount.toString(),
        burned_amount: formatUnits(args.burnedAmount, decimals),
        usdt_value: usdt(args.usdtValue),
        block,
        tx,
        log_index: logIndex,
        ts,
    });
    console.log(
        `[${SERVICE_NAME}] ${name} block=${block} account=${args.account} asset=${args.asset} burned=${formatUnits(args.burnedAmount, decimals)} ` +
            `usdt=${usdt(args.usdtValue)} rights=${usdt(args.rights)}`
    );
}

// TokensBurned(token, from, amount)
async function handleTokensBurned(event) {
    const { name, args, block, tx, logIndex, ts } = event;
    const decimals = await decimalsOf(args.token);
    await insertIgnore(RightsRecord, {
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

// RightsConsumed(account, rights)
async function handleRightsConsumed(event) {
    const { name, args, block, tx, logIndex, ts } = event;
    await insertIgnore(RightsRecord, {
        address: args.account,
        method: name,
        ...amountFields(args.rights, config.VALUE_DECIMALS),
        block,
        tx,
        log_index: logIndex,
        ts,
    });
    console.log(`[${SERVICE_NAME}] ${name} block=${block} account=${args.account} rights=${usdt(args.rights)}`);
}

// CommunityGGClaimed(account, ggAmount, ggPrice, rightsDeducted) - ClaimController.
async function handleCommunityGGClaimed(event) {
    const { name, args, block, tx, logIndex, ts } = event;
    await insertIgnore(RightsRecord, {
        address: args.account,
        method: name,
        ...amountFields(args.ggAmount, config.GG_DECIMALS),
        gg_price: usdt(args.ggPrice),
        rights_deducted: usdt(args.rightsDeducted),
        block,
        tx,
        log_index: logIndex,
        ts,
    });
    console.log(
        `[${SERVICE_NAME}] ${name} block=${block} account=${args.account} gg=${formatUnits(args.ggAmount, config.GG_DECIMALS)} ` +
            `price=${usdt(args.ggPrice)} rights=${usdt(args.rightsDeducted)}`
    );
}

async function start() {
    await ready;

    await startListener({
        serviceName: SERVICE_NAME,
        startBlock: config.startBlockFor(SERVICE_NAME),
        targets: [
            {
                address: config.addressOf('NFT_RIGHTS_LEDGER_ADDRESS'),
                abi: ledgerAbi,
                label: 'NFT_RIGHTS_LEDGER',
                events: {
                    RightsCreated: handleRightsCreated,
                    RightsConsumed: handleRightsConsumed,
                    TokensBurned: handleTokensBurned,
                },
            },
            {
                address: config.addressOf('CLAIM_CONTROLLER_ADDRESS'),
                abi: claimAbi,
                label: 'CLAIM_CONTROLLER',
                events: {
                    CommunityGGClaimed: handleCommunityGGClaimed,
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
