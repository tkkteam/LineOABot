import { ApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';

export function notFound(req, res) {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      details: err.details ?? undefined,
    });
  }

  // Sequelize unique constraint violation (e.g. duplicate registration)
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({ success: false, message: 'Duplicate entry: record already exists' });
  }

  // Sequelize validation error
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      details: err.errors.map((e) => e.message),
    });
  }

  // LINE SDK errors
  if (err.statusCode && err.originalError) {
    return res.status(502).json({
      success: false,
      message: `LINE API error: ${err.message}`,
      details: err.originalError?.message ?? undefined,
    });
  }

  logger.error('[errorHandler] Unhandled error', { message: err.message, stack: err.stack });

  return res.status(500).json({ success: false, message: 'Internal server error' });
}
