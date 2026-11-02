'use strict';
require('dotenv').config();

const { formatUnits } = require('ethers');

const config = require('../config');
const abi = require('../abi/EmissionController.json');
const { ready, insertIgnore, EmissionDay } = require('../model');
const { startListener } = require('../utils/BaseListener');

const SERVICE_NAME = 'emission';

function gg(raw) {
    return formatUnits(raw, config.GG_DECIMALS);
}

// DailySettled(dayId, dayBudget, holdingAmount, communityAmount, unusedAmount)
async function handleDailySettled(event) {
    const { name, args, block, tx, logIndex, ts } = event;
    await insertIgnore(EmissionDay, {
        method: name,
        day: args.dayId.toString(),
        day_budget: gg(args.dayBudget),
        holding_amount: gg(args.holdingAmount),
        community_amount: gg(args.communityAmount),
        unused_amount: gg(args.unusedAmount),
        block,
        tx,
        log_index: logIndex,
        ts,
    });
    console.log(
        `[${SERVICE_NAME}] ${name} block=${block} day=${args.dayId} budget=${gg(args.dayBudget)} ` +
            `holding=${gg(args.holdingAmount)} community=${gg(args.communityAmount)} unused=${gg(args.unusedAmount)}`
    );
}

// GenesisSet(genesisTimestamp, phaseEndDay[5])
async function handleGenesisSet(event) {
    const { name, args, block, tx, logIndex, ts } = event;
    const phaseEndDays = [...args.phaseEndDay].map((d) => d.toString());
    await insertIgnore(EmissionDay, {
        method: name,
        day: null,
        genesis_timestamp: args.genesisTimestamp.toString(),
        phase_end_days: phaseEndDays,
        block,
        tx,
        log_index: logIndex,
        ts,
    });
    console.log(`[${SERVICE_NAME}] ${name} block=${block} genesis=${args.genesisTimestamp} phaseEndDays=[${phaseEndDays.join(',')}]`);
}

async function start() {
    await ready;

    await startListener({
        serviceName: SERVICE_NAME,
        startBlock: config.startBlockFor(SERVICE_NAME),
        targets: [
            {
                address: config.addressOf('EMISSION_CONTROLLER_ADDRESS'),
                abi,
                label: 'EMISSION_CONTROLLER',
                events: {
                    DailySettled: handleDailySettled,
                    GenesisSet: handleGenesisSet,
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
