import { Sequelize } from 'sequelize';
import config from './index.js';

export const sequelize = new Sequelize(
  config.db.name,
  config.db.user,
  config.db.password,
  {
    host: config.db.host,
    port: config.db.port,
    dialect: 'mysql',
    logging: config.env === 'development' ? (msg) => console.debug(`[sql] ${msg}`) : false,
    // mysql2 requires an offset (e.g. '+07:00') not an IANA name
    timezone: '+07:00',
    dialectOptions: {
      charset: 'utf8mb4',
      dateStrings: true,
      typeCast: true,
    },
    pool: {
      max: 20,
      min: 0,
      acquire: 60000,
      idle: 10000,
    },
    define: {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
      underscored: true,
    },
  },
);

export async function testConnection() {
  await sequelize.authenticate();
  console.log('[db] MySQL connection OK');
}
