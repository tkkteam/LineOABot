import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const Group = sequelize.define(
  'Group',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    line_group_id: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true,
      comment: 'LINE groupId from Messaging API source.groupId',
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: '',
    },
  },
  {
    tableName: 'groups',
    underscored: true,
  },
);

export default Group;
