'use strict';

const { DataTypes } = require('sequelize');

// Owned by this service. Every write this API performs lands here first.
//
// This panel sets the numbers that decide what people get paid - a level ratio,
// the reward switch, a per-address override. "Who changed the V4 ratio and what
// was it before" has to be answerable months later, so the row keeps both sides
// of the change, not just the new value.
//
//   entity / entity_id  what was touched, e.g. ('parameter', 'PeerRewardRatio')
//   action              create | update | delete
//   before / after      the row as it stood, as JSON. Null on create/delete
//                       respectively.
module.exports = (sequelize) =>
    sequelize.define(
        'AdminAuditLog',
        {
            id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
            admin_user_id: { type: DataTypes.BIGINT, allowNull: true },
            username: { type: DataTypes.STRING(64), allowNull: false },
            action: { type: DataTypes.STRING(16), allowNull: false },
            entity: { type: DataTypes.STRING(64), allowNull: false },
            entity_id: { type: DataTypes.STRING(128), allowNull: true },
            before: { type: DataTypes.JSONB, allowNull: true },
            after: { type: DataTypes.JSONB, allowNull: true },
            ip: { type: DataTypes.STRING(64), allowNull: true },
            created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        },
        {
            tableName: 'gold3_admin_audit_log',
            underscored: true,
            timestamps: false,
            indexes: [{ fields: ['entity', 'entity_id'] }, { fields: ['username'] }, { fields: ['created_at'] }],
        }
    );
