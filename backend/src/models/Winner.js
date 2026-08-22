import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const Winner = sequelize.define(
  'Winner',
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
    winner_user_id: {
      type: DataTypes.STRING(64),
      allowNull: false,
      comment: 'LINE userId of the winner',
    },
    winner_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    draw_time: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: 'When the draw happened',
    },
  },
  {
    tableName: 'winners',
    underscored: true,
    indexes: [
      { name: 'idx_winners_group_draw', fields: ['group_id', 'draw_time'] },
      { name: 'idx_winners_name', fields: ['winner_name'] },
    ],
  },
);

export default Winner;
