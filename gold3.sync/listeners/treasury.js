'use strict';
require('dotenv').config();

const { formatUnits } = require('ethers');

const config = require('../config');
const treasuryAbi = require('../abi/InsuranceTreasury.json');
const reserveAbi = require('../abi/ReserveVault.json');
const protectionAbi = require('../abi/ProtectionVault.json');
const allocationAbi = require('../abi/AllocationVault.json');
const { ready, insertIgnore, TreasuryFlow } = require('../model');
const { startListener } = require('../utils/BaseListener');
const { amountFields } = require('../utils/amount');
const { tagName } = require('../utils/tags');
const { decimalsOf } = require('../utils/tokenDecimals');

const SERVICE_NAME = 'treasury';

let gg = null;
let usdt = null;

function log(event, detail) {
    console.log(`[${SERVICE_NAME}] ${event.label} ${event.name} block=${event.block} ${detail}`);
}

// TreasuryCredited(sourceTag, from, amount) - InsuranceTreasury, GG.
async function handleTreasuryCredited(event) {
    const { name, args, label, block, tx, logIndex, ts } = event;
    await insertIgnore(TreasuryFlow, {
        address: args.from,
        method: name,
        ...amountFields(args.amount, config.GG_DECIMALS),
        contract: label,
        token: gg,
        source_tag: args.sourceTag,
        tag_name: tagName(args.sourceTag),
        block,
        tx,
        log_index: logIndex,
        ts,
    });
    log(event, `tag=${tagName(args.sourceTag) || args.sourceTag} from=${args.from} amount=${formatUnits(args.amount, config.GG_DECIMALS)}`);
}

// TreasuryPaid(to, amount, purpose) - InsuranceTreasury, GG.
async function handleTreasuryPaid(event) {
    const { name, args, label, block, tx, logIndex, ts } = event;
    await insertIgnore(TreasuryFlow, {
        address: args.to,
        method: name,
        ...amountFields(args.amount, config.GG_DECIMALS),
        contract: label,
        token: gg,
        source_tag: args.purpose,
        tag_name: tagName(args.purpose),
        block,
        tx,
        log_index: logIndex,
        ts,
    });
    log(event, `purpose=${tagName(args.purpose) || args.purpose} to=${args.to} amount=${formatUnits(args.amount, config.GG_DECIMALS)}`);
}

// ReserveDeposited(from, amount) / ProtectionDeposited(from, amount) - USDT.
async function handleUsdtDeposited(event) {
    const { name, args, label, block, tx, logIndex, ts } = event;
    await insertIgnore(TreasuryFlow, {
        address: args.from,
        method: name,
        ...amountFields(args.amount, config.USDT_DECIMALS),
        contract: label,
        token: usdt,
        block,
        tx,
        log_index: logIndex,
        ts,
    });
    log(event, `from=${args.from} amount=${formatUnits(args.amount, config.USDT_DECIMALS)}`);
}

// ReserveWithdrawn(to, amount, memo) - USDT.
async function handleReserveWithdrawn(event) {
    const { name, args, label, block, tx, logIndex, ts } = event;
    await insertIgnore(TreasuryFlow, {
        address: args.to,
        method: name,
        ...amountFields(args.amount, config.USDT_DECIMALS),
        contract: label,
        token: usdt,
        memo: args.memo,
        block,
        tx,
        log_index: logIndex,
        ts,
    });
    log(event, `to=${args.to} amount=${formatUnits(args.amount, config.USDT_DECIMALS)} memo=${args.memo}`);
}

// ProtectionBuyExecuted(buyer, path, amountIn, amountOut) - USDT in, path[last] out.
async function handleProtectionBuy(event) {
    const { name, args, label, block, tx, logIndex, ts } = event;
    const path = [...args.path];
    const tokenOut = path[path.length - 1];
    const decimalsOut = await decimalsOf(tokenOut);
    await insertIgnore(TreasuryFlow, {
        address: args.buyer,
        method: name,
        ...amountFields(args.amountIn, config.USDT_DECIMALS),
        contract: label,
        token: usdt,
        path,
        token_out: tokenOut,
        amount_out_raw: args.amountOut.toString(),
        amount_out: formatUnits(args.amountOut, decimalsOut),
        block,
        tx,
        log_index: logIndex,
        ts,
    });
    log(event, `buyer=${args.buyer} in=${formatUnits(args.amountIn, config.USDT_DECIMALS)} out=${formatUnits(args.amountOut, decimalsOut)} ${tokenOut}`);
}

// ProtectionWithdrawn(token, to, amount, memo).
async function handleProtectionWithdrawn(event) {
    const { name, args, label, block, tx, logIndex, ts } = event;
    const decimals = await decimalsOf(args.token);
    await insertIgnore(TreasuryFlow, {
        address: args.to,
        method: name,
        ...amountFields(args.amount, decimals),
        contract: label,
        token: args.token,
        memo: args.memo,
        block,
        tx,
        log_index: logIndex,
        ts,
    });
    log(event, `token=${args.token} to=${args.to} amount=${formatUnits(args.amount, decimals)} memo=${args.memo}`);
}

// AllocationReleased(bucket, to, amount) - AllocationVault, GG.
async function handleAllocationReleased(event) {
    const { name, args, label, block, tx, logIndex, ts } = event;
    await insertIgnore(TreasuryFlow, {
        address: args.to,
        method: name,
        ...amountFields(args.amount, config.GG_DECIMALS),
        contract: label,
        token: gg,
        source_tag: args.bucket,
        tag_name: tagName(args.bucket),
        block,
        tx,
        log_index: logIndex,
        ts,
    });
    log(event, `bucket=${tagName(args.bucket) || args.bucket} to=${args.to} amount=${formatUnits(args.amount, config.GG_DECIMALS)}`);
}

async function start() {
    await ready;

    gg = config.addressOf('GG_ADDRESS');
    usdt = config.addressOf('USDT_ADDRESS');

    await startListener({
        serviceName: SERVICE_NAME,
        startBlock: config.startBlockFor(SERVICE_NAME),
        targets: [
            {
                address: config.addressOf('INSURANCE_TREASURY_ADDRESS'),
                abi: treasuryAbi,
                label: 'INSURANCE_TREASURY',
                events: {
                    TreasuryCredited: handleTreasuryCredited,
                    TreasuryPaid: handleTreasuryPaid,
                },
            },
            {
                address: config.addressOf('RESERVE_VAULT_ADDRESS'),
                abi: reserveAbi,
                label: 'RESERVE_VAULT',
                events: {
                    ReserveDeposited: handleUsdtDeposited,
                    ReserveWithdrawn: handleReserveWithdrawn,
                },
            },
            {
                address: config.addressOf('PROTECTION_VAULT_ADDRESS'),
                abi: protectionAbi,
                label: 'PROTECTION_VAULT',
                events: {
                    ProtectionDeposited: handleUsdtDeposited,
                    ProtectionBuyExecuted: handleProtectionBuy,
                    ProtectionWithdrawn: handleProtectionWithdrawn,
                },
            },
            {
                address: config.addressOf('ALLOCATION_VAULT_ADDRESS'),
                abi: allocationAbi,
                label: 'ALLOCATION_VAULT',
                events: {
                    AllocationReleased: handleAllocationReleased,
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
