'use strict';

const { DataTypes } = require('sequelize');

// Owned by this service. Password + TOTP, because the operators share wallets
// but not accounts - an audit entry has to name a person.
//
//   password_hash    scrypt, salt and cost parameters included (utils/password)
//   totp_secret      base32, the seed an authenticator app holds. Secret: never
//                    returned by any route, never logged.
//   totp_last_counter  the newest 30-second counter this user has already
//                    spent. A code at or below it is refused, so one code is
//                    good exactly once instead of for its whole window.
//   enabled          false locks the account out without deleting its history
module.exports = (sequelize) =>
    sequelize.define(
        'AdminUser',
        {
            id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
            username: { type: DataTypes.STRING(64), allowNull: false, unique: true },
            password_hash: { type: DataTypes.STRING(255), allowNull: false },
            totp_secret: { type: DataTypes.STRING(64), allowNull: false },
            totp_last_counter: { type: DataTypes.BIGINT, allowNull: false, defaultValue: 0 },
            role: { type: DataTypes.STRING(16), allowNull: false, defaultValue: 'admin' },
            enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
            last_login_at: { type: DataTypes.DATE, allowNull: true },
            last_login_ip: { type: DataTypes.STRING(64), allowNull: true },
            created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        },
        {
            tableName: 'gold3_admin_users',
            underscored: true,
            timestamps: false,
        }
    );
