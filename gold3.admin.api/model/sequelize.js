'use strict';
require('dotenv').config();

const { Sequelize } = require('sequelize');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
    throw new Error('DATABASE_URL is not set - copy .env.sample to .env and fill it in');
}

// Same database gold3.sync writes into.
//
// Ownership is split: gold3.sync owns the protocol tables (it runs
// sequelize.sync()), and this service only reads and updates rows in them. The
// tables this service DOES own - gold3_admin_users, gold3_admin_roles, gold3_admin_audit_log - are
// created by its own scripts/init-schema.js, which syncs those models and
// nothing else.
const sequelize = new Sequelize(DATABASE_URL, {
    dialect: 'postgres',
    pool: { max: 10, min: 1, acquire: 60000, idle: 10000 },
    logging: process.env.DB_LOGGING === 'true' ? console.log : false,
});

module.exports = { sequelize };
