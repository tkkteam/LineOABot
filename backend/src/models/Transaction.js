import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const Transaction = sequelize.define(
  'Transaction',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    participant_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      references: { model: 'participants', key: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    group_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      references: { model: 'groups', key: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    slip_image: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    slip_timestamp: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    slip_ref: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    approved_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: 'transactions',
    underscored: true,
    indexes: [
      { name: 'idx_transactions_participant', fields: ['participant_id'] },
      { name: 'idx_transactions_group', fields: ['group_id'] },
      { name: 'idx_transactions_approved_at', fields: ['approved_at'] },
    ],
  }
);

export default Transaction;
