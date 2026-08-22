import { getSettings, setSetting, DEFAULT_SETTINGS } from '../services/settingsService.js';
import { ok } from '../utils/apiResponse.js';
import { cleanStr } from '../utils/validators.js';
import { ApiError } from '../utils/ApiError.js';

const BOOLEAN_KEYS = ['spin_requires_admin', 'winners_can_repeat', 'wheel_enabled'];
const NUMBER_KEYS = ['list_max_lines'];

function validateKey(key) {
  if (!(key in DEFAULT_SETTINGS)) {
    throw new ApiError(400, `Unknown setting key: ${key}`);
  }
}

/** GET /api/settings */
export async function getSettingsHandler(req, res, next) {
  try {
    const settings = await getSettings();
    return ok(res, settings);
  } catch (err) {
    return next(err);
  }
}

/** PUT /api/settings — body: { key, value } */
export async function updateSetting(req, res, next) {
  try {
    const { key, value } = req.body;
    validateKey(key);

    let finalValue = cleanStr(value, 255);
    if (BOOLEAN_KEYS.includes(key)) {
      finalValue = String(finalValue === 'true' || finalValue === '1' || finalValue === true);
    }
    if (NUMBER_KEYS.includes(key)) {
      const n = parseInt(finalValue, 10);
      finalValue = String(Number.isNaN(n) || n < 1 ? DEFAULT_SETTINGS[key] : Math.min(n, 100));
    }

    await setSetting(key, finalValue);
    const settings = await getSettings();
    return ok(res, settings, 'Setting updated');
  } catch (err) {
    return next(err);
  }
}
