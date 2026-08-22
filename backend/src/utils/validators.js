import xss from 'xss';
import { ApiError } from './ApiError.js';

/** Trim + XSS-sanitize a string. Returns '' for null/undefined. */
export function cleanStr(value, maxLength = 255) {
  if (value === null || value === undefined) return '';
  let s = String(value).trim();
  s = xss(s, { whiteList: {}, stripIgnoreTag: true });
  if (s.length > maxLength) s = s.slice(0, maxLength);
  return s;
}

/** Validate that required fields exist, throw ApiError(400) otherwise. */
export function requireFields(body, fields) {
  const missing = fields.filter((f) => {
    const v = body[f];
    return v === undefined || v === null || String(v).trim() === '';
  });
  if (missing.length > 0) {
    throw new ApiError(400, `Missing required field(s): ${missing.join(', ')}`);
  }
}

export function parsePositiveInt(value, fallback = 1, max = 1000) {
  const n = parseInt(value, 10);
  if (Number.isNaN(n) || n < 1) return fallback;
  return Math.min(n, max);
}
