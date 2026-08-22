import { Setting } from '../models/index.js';

export const DEFAULT_SETTINGS = {
  // Allow any group member to spin, or only the group admin (first registered member)
  spin_requires_admin: 'true',
  // Allow a previous winner to win again in later draws
  winners_can_repeat: 'true',
  // If set to 'false', the bot replies that draws are disabled
  wheel_enabled: 'true',
  // Max participants shown in the LINE "รายชื่อ" reply
  list_max_lines: '40',
};

export async function getSettings() {
  const rows = await Setting.findAll();
  const map = {};
  for (const row of rows) map[row.key] = row.value;
  return { ...DEFAULT_SETTINGS, ...map };
}

export async function getSetting(key) {
  const row = await Setting.findByPk(key);
  return row ? row.value : DEFAULT_SETTINGS[key];
}

export async function setSetting(key, value) {
  await Setting.upsert({ key, value: String(value) });
}

export async function seedDefaultSettings() {
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await setSetting(key, value);
  }
}
