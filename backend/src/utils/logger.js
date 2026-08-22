const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };

function ts() {
  return new Date().toISOString();
}

function log(level, message, meta) {
  const entry = { ts: ts(), level, message };
  if (meta !== undefined) entry.meta = meta;
  const line = `[${entry.ts}] ${level.toUpperCase()} ${message}${meta !== undefined ? ' ' + JSON.stringify(meta) : ''}`;
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (msg, meta) => log('debug', msg, meta),
  info: (msg, meta) => log('info', msg, meta),
  warn: (msg, meta) => log('warn', msg, meta),
  error: (msg, meta) => log('error', msg, meta),
};
