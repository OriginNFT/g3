'use strict';
require('dotenv').config();

// Creates the three tables this service owns: gold3_admin_users,
// gold3_admin_roles and gold3_admin_audit_log.
//   npm run init-schema
//
// Deliberately syncs ONLY OWNED_MODELS. Every other table this panel reads or
// edits (gold3_community_queue and the rest of the protocol tables) belongs
// to gold3.sync - a sync() from here could create an out-of-date version of one
// of them and hide the drift.
const { sequelize, ready, OWNED_MODELS } = require('../model');

async function main() {
    // Fail on an unreachable database before attempting any DDL, so the error
    // says "cannot connect" rather than surfacing as a failed CREATE TABLE.
    await ready;

    for (const model of OWNED_MODELS) {
        await model.sync();
        console.log(`[SCHEMA] ${model.getTableName()} ready`);
    }
    console.log('[SCHEMA] done');
}

main()
    .catch((err) => {
        console.error('[FATAL] init-schema:', err.message, err);
        process.exitCode = 1;
    })
    .finally(() => sequelize.close());
