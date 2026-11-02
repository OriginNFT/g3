'use strict';

const { DataTypes } = require('sequelize');

// Owned by this service. A role is a name plus the permission keys it grants.
//
//   name         the identity, and what helix_admin_users.role stores. There is no
//                rename: renaming would silently orphan every account holding
//                the old name, and "your account has no role" reads as a bug,
//                not as a permission change. Delete and recreate instead -
//                which the API refuses while anyone still holds it.
//   permissions  an array of keys from permissions.js. Validated against that
//                catalogue on write, so a key that grants nothing cannot be
//                stored and mistaken for one that does.
//
// The built-in 'admin' role is NOT a row here. It is defined in code and always
// holds everything, so no edit to this table can remove the last way in.
module.exports = (sequelize) =>
    sequelize.define(
        'AdminRole',
        {
            name: { type: DataTypes.STRING(16), primaryKey: true },
            description: { type: DataTypes.STRING(128), allowNull: true },
            permissions: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
            created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
            updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        },
        {
            tableName: 'gold3_admin_roles',
            underscored: true,
            timestamps: false,
        }
    );
