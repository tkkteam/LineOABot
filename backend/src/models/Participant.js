import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const Participant = sequelize.define(
  'Participant',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    group_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      references: { model: 'groups', key: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    user_id: {
      type: DataTypes.STRING(64),
      allowNull: false,
      comment: 'LINE userId of the member',
    },
    display_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'LINE profile display name',
    },
    is_group_admin: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'First registered member of the group, allowed to spin the wheel',
    },
    has_paid: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether this participant has uploaded a valid slip',
    },
    slip_timestamp: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Date and time extracted from slip',
    },
    slip_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Amount extracted from slip',
    },
    slip_image: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Filename of the uploaded slip',
    },
  },
  {
    tableName: 'participants',
    underscored: true,
    indexes: [
      {
        unique: true,
        name: 'uq_participants_group_user',
        fields: ['group_id', 'user_id'],
      },
      { name: 'idx_participants_group', fields: ['group_id'] },
      { name: 'idx_participants_user', fields: ['user_id'] },
    ],
  },
);

export default Participant;
