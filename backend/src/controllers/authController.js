import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User } from '../models/index.js';
import config from '../config/index.js';
import { ApiError } from '../utils/ApiError.js';
import { ok, created } from '../utils/apiResponse.js';
import { cleanStr, requireFields } from '../utils/validators.js';

function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn },
  );
}

function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    display_name: user.display_name,
    role: user.role,
    is_active: user.is_active,
    created_at: user.created_at,
  };
}

/** POST /api/auth/login */
export async function login(req, res, next) {
  try {
    requireFields(req.body, ['username', 'password']);
    const { username, password } = req.body;

    const user = await User.findOne({ where: { username: cleanStr(username, 64) } });
    if (!user || !user.is_active) {
      throw new ApiError(401, 'Invalid username or password');
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      throw new ApiError(401, 'Invalid username or password');
    }

    const token = signToken(user);
    return ok(res, { token, user: publicUser(user) }, 'Login successful');
  } catch (err) {
    return next(err);
  }
}

/** GET /api/auth/me */
export async function me(req, res, next) {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) throw new ApiError(404, 'User not found');
    return ok(res, publicUser(user));
  } catch (err) {
    return next(err);
  }
}

/** POST /api/auth/change-password */
export async function changePassword(req, res, next) {
  try {
    requireFields(req.body, ['current_password', 'new_password']);
    const { current_password: current, new_password: nextPwd } = req.body;

    if (String(nextPwd).length < 8) {
      throw new ApiError(400, 'New password must be at least 8 characters');
    }

    const user = await User.findByPk(req.user.id);
    const match = await bcrypt.compare(current, user.password_hash);
    if (!match) throw new ApiError(400, 'Current password is incorrect');

    user.password_hash = await bcrypt.hash(nextPwd, 10);
    await user.save();
    return ok(res, null, 'Password updated');
  } catch (err) {
    return next(err);
  }
}

// ---------------- User management (super admin only) ----------------

/** GET /api/auth/users */
export async function listUsers(req, res, next) {
  try {
    const users = await User.findAll({ order: [['id', 'ASC']] });
    return ok(res, users.map(publicUser));
  } catch (err) {
    return next(err);
  }
}

/** POST /api/auth/users */
export async function createUser(req, res, next) {
  try {
    requireFields(req.body, ['username', 'password', 'display_name']);
    const { username, password, display_name: displayName } = req.body;
    const role = req.body.role === 'super_admin' ? 'super_admin' : 'admin';

    if (String(password).length < 8) {
      throw new ApiError(400, 'Password must be at least 8 characters');
    }

    const existing = await User.findOne({ where: { username: cleanStr(username, 64) } });
    if (existing) throw new ApiError(409, 'Username already exists');

    const user = await User.create({
      username: cleanStr(username, 64),
      password_hash: await bcrypt.hash(password, 10),
      display_name: cleanStr(displayName, 255),
      role,
    });
    return created(res, publicUser(user), 'User created');
  } catch (err) {
    return next(err);
  }
}

/** PATCH /api/auth/users/:id */
export async function updateUser(req, res, next) {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) throw new ApiError(404, 'User not found');

    if (req.body.display_name !== undefined) {
      user.display_name = cleanStr(req.body.display_name, 255);
    }
    if (req.body.role !== undefined) {
      if (!['admin', 'super_admin'].includes(req.body.role)) {
        throw new ApiError(400, 'Invalid role');
      }
      user.role = req.body.role;
    }
    if (req.body.is_active !== undefined) {
      user.is_active = Boolean(req.body.is_active);
    }
    if (req.body.password) {
      if (String(req.body.password).length < 8) {
        throw new ApiError(400, 'Password must be at least 8 characters');
      }
      user.password_hash = await bcrypt.hash(req.body.password, 10);
    }
    await user.save();
    return ok(res, publicUser(user), 'User updated');
  } catch (err) {
    return next(err);
  }
}

/** DELETE /api/auth/users/:id */
export async function deleteUser(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (id === req.user.id) throw new ApiError(400, 'You cannot delete your own account');

    const user = await User.findByPk(id);
    if (!user) throw new ApiError(404, 'User not found');
    await user.destroy();
    return ok(res, null, 'User deleted');
  } catch (err) {
    return next(err);
  }
}
