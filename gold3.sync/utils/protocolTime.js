'use strict';

const config = require('../config');

// Off-chain mirror of EmissionController's day model.
//
//   - genesis is an SGT 12:00 (UTC 04:00) timestamp, read from the contract
//     by the keeper at startup (EmissionController.genesisTimestamp()) and
//     handed to init(). Day 1 is [genesis, genesis + 86400); day d starts at
//     genesis + (d - 1) * 86400 and ends at genesis + d * 86400 (exclusive).
//   - Before genesis dayOf() / currentDay() answer 0. Index 0 is the
//     pre-genesis sentinel: dayStart / dayEnd throw on it (the contract
//     reverts) and dayEnded answers false for it.
//
// All arguments and results are plain Numbers in seconds / day indexes. A
// bigint or numeric string is accepted and converted. Timestamps are integer
// seconds, never milliseconds. Never compute a day from Date arithmetic
// inline anywhere else - use this.

const DAY_SECONDS = 86400;
const DAY_START_UTC_OFFSET = 4 * 3600;

let genesisTs = 0;

function toNumber(value, label) {
    const n = Number(value);
    if (!Number.isFinite(n)) throw new Error(`protocolTime: ${label} is not a number: ${value}`);
    return n;
}

// Sets the genesis read from the chain. Throws on 0 (not set on chain yet)
// and on a timestamp that is not SGT noon, the same rule as setGenesis().
function init(genesisTimestamp) {
    const ts = toNumber(genesisTimestamp, 'genesisTimestamp');
    if (ts <= 0) throw new Error('protocolTime: genesisTimestamp is 0 - EmissionController.setGenesis() has not run');
    if (ts % DAY_SECONDS !== DAY_START_UTC_OFFSET) throw new Error(`protocolTime: genesis ${ts} is not SGT 12:00`);
    genesisTs = ts;
}

function genesis() {
    if (genesisTs <= 0) throw new Error('protocolTime: init(genesisTimestamp) has not been called');
    return genesisTs;
}

// Current wall clock in whole seconds; the default `now` of every helper.
function nowSeconds() {
    return Math.floor(Date.now() / 1000);
}

// Day index containing `tsSeconds`; 0 before genesis. EmissionController.currentDay at that time.
function dayOf(tsSeconds) {
    const ts = toNumber(tsSeconds, 'timestamp');
    const g = genesis();
    if (ts < g) return 0;
    return Math.floor((ts - g) / DAY_SECONDS) + 1;
}

// Timestamp at which `day` begins (inclusive). Throws for day 0. EmissionController.dayStart.
function dayStart(day) {
    const d = toNumber(day, 'day');
    if (d <= 0) throw new Error('protocolTime: day zero has no start');
    return genesis() + (d - 1) * DAY_SECONDS;
}

// Timestamp at which `day` ends (exclusive). Throws for day 0. EmissionController.dayEnd.
function dayEnd(day) {
    return dayStart(day) + DAY_SECONDS;
}

// Day index of `now` (default: the wall clock); 0 before genesis.
function currentDay(now = nowSeconds()) {
    return dayOf(Math.floor(toNumber(now, 'now')));
}

// True once `day` has fully elapsed (now >= dayEnd(day)); false for day 0.
function dayEnded(day, now = nowSeconds()) {
    if (toNumber(day, 'day') <= 0) return false;
    return toNumber(now, 'now') >= dayEnd(day);
}

// `tsSeconds` as an ISO-8601 string in SGT, e.g. 2026-11-01T12:00:00+08:00 -
// for logs, so a day boundary reads as noon.
function formatSgt(tsSeconds) {
    const ts = Math.floor(toNumber(tsSeconds, 'timestamp'));
    const shifted = new Date((ts + config.SGT_OFFSET_SECONDS) * 1000);
    return `${shifted.toISOString().slice(0, 19)}+08:00`;
}

module.exports = {
    DAY_SECONDS,
    init,
    genesis,
    nowSeconds,
    dayOf,
    dayStart,
    dayEnd,
    currentDay,
    dayEnded,
    formatSgt,
};
