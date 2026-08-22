// Standalone DB sync:  npm run db:sync
import { sequelize } from '../config/database.js';
import '../models/index.js';
import { seedDefaultSettings } from '../services/settingsService.js';

async function main() {
  await sequelize.authenticate();
  console.log('[db] connected');
  await sequelize.sync({ alter: false });
  console.log('[db] tables synced');
  await seedDefaultSettings();
  console.log('[db] default settings seeded');
  await sequelize.close();
}

main().catch((err) => {
  console.error('[db] sync failed', err);
  process.exit(1);
});
