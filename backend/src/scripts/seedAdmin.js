// Standalone admin seeder:  npm run seed:admin
import bcrypt from 'bcryptjs';
import { sequelize } from '../config/database.js';
import { User } from '../models/index.js';
import config from '../config/index.js';

async function main() {
  await sequelize.authenticate();
  await sequelize.sync();

  const existing = await User.findOne({ where: { username: config.admin.username } });
  if (existing) {
    console.log(`[seed] admin "${config.admin.username}" already exists, skipping`);
  } else {
    await User.create({
      username: config.admin.username,
      password_hash: await bcrypt.hash(config.admin.password, 10),
      display_name: 'Super Admin',
      role: 'super_admin',
    });
    console.log(`[seed] created super admin "${config.admin.username}"`);
    if (config.admin.password === 'admin123' || config.admin.password === 'change_me_admin_password_strong') {
      console.warn('[seed] WARNING: using default admin password. Change ADMIN_PASSWORD in .env!');
    }
  }

  await sequelize.close();
}

main().catch((err) => {
  console.error('[seed] failed', err);
  process.exit(1);
});
