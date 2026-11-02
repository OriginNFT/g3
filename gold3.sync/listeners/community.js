'use strict';
require('dotenv').config();

const { formatUnits } = require('ethers');

const config = require('../config');
const abi = require('../abi/CommunityEngine.json');
const { ready, insertIgnore, CommunityDay, CommunityCredit } = require('../model');
const { startListener } = require('../utils/BaseListener');
const { amountFields } = require('../utils/amount');
const { bucketName } = require('../utils/tags');

const SERVICE_NAME = 'community';

function gg(raw) {
    return formatUnits(raw, config.GG_DECIMALS);
}

// CommunityBudgetAllocated(dayId, expansion, collaboration, contribution, daoBuilding, platform)
async function handleBudgetAllocated(event) {
    const { name, args, block, tx, logIndex, ts } = event;
    await insertIgnore(CommunityDay, {
        method: name,
        day: args.dayId.toString(),
        expansion: gg(args.expansion),
        collaboration: gg(args.collaboration),
        contribution: gg(args.contribution),
        dao_building: gg(args.daoBuilding),
        platform: gg(args.platform),
        block,
        tx,
        log_index: logIndex,
        ts,
    });
    console.log(
        `[${SERVICE_NAME}] ${name} block=${block} day=${args.dayId} expansion=${gg(args.expansion)} collaboration=${gg(args.collaboration)} ` +
            `contribution=${gg(args.contribution)} dao=${gg(args.daoBuilding)} platform=${gg(args.platform)}`
    );
}

// CommunityDayClosed(dayId, credited, leftover)
async function handleDayClosed(event) {
    const { name, args, block, tx, logIndex, ts } = event;
    await insertIgnore(CommunityDay, {
        method: name,
        day: args.dayId.toString(),
        credited: gg(args.credited),
        leftover: gg(args.leftover),
        block,
        tx,
        log_index: logIndex,
        ts,
    });
    console.log(`[${SERVICE_NAME}] ${name} block=${block} day=${args.dayId} credited=${gg(args.credited)} leftover=${gg(args.leftover)}`);
}

// CommunityCredited(dayId, bucket, account, amount)
async function handleCredited(event) {
    const { name, args, block, tx, logIndex, ts } = event;
    const bucket = Number(args.bucket);
    await insertIgnore(CommunityCredit, {
        address: args.account,
        method: name,
        ...amountFields(args.amount, config.GG_DECIMALS),
        day: args.dayId.toString(),
        bucket,
        bucket_name: bucketName(bucket),
        block,
        tx,
        log_index: logIndex,
        ts,
    });
    console.log(`[${SERVICE_NAME}] ${name} block=${block} day=${args.dayId} bucket=${bucketName(bucket) || bucket} account=${args.account} amount=${gg(args.amount)}`);
}

// CommunityPaid(to, amount)
async function handlePaid(event) {
    const { name, args, block, tx, logIndex, ts } = event;
    await insertIgnore(CommunityCredit, {
        address: args.to,
        method: name,
        ...amountFields(args.amount, config.GG_DECIMALS),
        block,
        tx,
        log_index: logIndex,
        ts,
    });
    console.log(`[${SERVICE_NAME}] ${name} block=${block} to=${args.to} amount=${gg(args.amount)}`);
}

async function start() {
    await ready;

    await startListener({
        serviceName: SERVICE_NAME,
        startBlock: config.startBlockFor(SERVICE_NAME),
        targets: [
            {
                address: config.addressOf('COMMUNITY_ENGINE_ADDRESS'),
                abi,
                label: 'COMMUNITY_ENGINE',
                events: {
                    CommunityBudgetAllocated: handleBudgetAllocated,
                    CommunityDayClosed: handleDayClosed,
                    CommunityCredited: handleCredited,
                    CommunityPaid: handlePaid,
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
