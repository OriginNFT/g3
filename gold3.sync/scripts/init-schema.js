'use strict';
require('dotenv').config();

// Creates or updates the schema. Run once before starting the listeners:
//   npm run init-schema
//
// This lives outside the listeners on purpose. sequelize.sync() issues
// CREATE TABLE IF NOT EXISTS, and PostgreSQL does not serialise that against a
// concurrent creation of the same table - listeners booting together race,
// and the losers die on a duplicate key in pg_class_relname_nsp_index. Exactly
// one process may own the schema, so it is this one.
const { sequelize, ready } = require('../model');

async function main() {
    // Fail on an unreachable database before attempting any DDL, so the error
    // says "cannot connect" rather than surfacing as a failed CREATE TABLE.
    await ready;
    await sequelize.sync();
    console.log('[SCHEMA] models synced');
}

main()
    .catch((err) => {
        console.error('[FATAL] init-schema:', err.message, err);
        process.exitCode = 1;
    })
    .finally(() => sequelize.close());
