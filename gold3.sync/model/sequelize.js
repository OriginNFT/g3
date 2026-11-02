'use strict';
require('dotenv').config();

const { Sequelize, Transaction } = require('sequelize');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
    throw new Error('DATABASE_URL is not set - copy .env.sample to .env and fill it in');
}

const sequelize = new Sequelize(DATABASE_URL, {
    dialect: 'postgres',
    pool: { max: 10, min: 1, acquire: 60000, idle: 10000 },
    isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED,
    logging: process.env.DB_LOGGING === 'true' ? console.log : false,
});

module.exports = { sequelize };
