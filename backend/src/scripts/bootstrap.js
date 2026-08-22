import bcrypt from 'bcryptjs';
import { User } from '../models/index.js';
import config from '../config/index.js';
import { logger } from '../utils/logger.js';

/**
 * Creates the initial super admin from env vars on first boot.
 * Logs a warning if the default password is still in use.
 */
export async function seedAdminIfNeeded() {
  const count = await User.count();
  if (count > 0) return;

  await User.create({
    username: config.admin.username,
    password_hash: await bcrypt.hash(config.admin.password, 10),
    display_name: 'Super Admin',
    role: 'super_admin',
  });
  logger.info(`[bootstrap] created super admin "${config.admin.username}"`);

  if (['admin123', 'change_me_admin_password_strong'].includes(config.admin.password)) {
    logger.warn('[bootstrap] WARNING: admin is using a default password. Set ADMIN_PASSWORD in .env!');
  }
}
