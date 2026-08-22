import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * JWT authentication middleware.
 * Expects: Authorization: Bearer <token>
 */
export function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;

  if (!token) {
    return next(new ApiError(401, 'Unauthorized: missing token'));
  }

  try {
    req.user = jwt.verify(token, config.jwt.secret);
    return next();
  } catch {
    return next(new ApiError(401, 'Unauthorized: invalid or expired token'));
  }
}

/**
 * Role Based Access Control (RBAC).
 * Usage: router.get('/', authenticate, requireRole('admin', 'super_admin'), handler)
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(new ApiError(401, 'Unauthorized'));
    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, 'Forbidden: insufficient role'));
    }
    return next();
  };
}

/** Convenience: super admin only. */
export const requireSuperAdmin = requireRole('super_admin');
