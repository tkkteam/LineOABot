import { Op, Sequelize } from 'sequelize';
import { Group, Participant, Winner } from '../models/index.js';
import { lineClient } from '../services/lineClient.js';
import { ApiError } from '../utils/ApiError.js';
import { ok, paginated } from '../utils/apiResponse.js';
import { cleanStr, parsePositiveInt } from '../utils/validators.js';
import { logger } from '../utils/logger.js';

/** GET /api/groups?search=&page=&pageSize= */
export async function listGroups(req, res, next) {
  try {
    const page = parsePositiveInt(req.query.page, 1);
    const pageSize = parsePositiveInt(req.query.pageSize, 20, 500);

    const where = {};
    if (req.query.search) {
      where.name = { [Op.like]: `%${cleanStr(req.query.search, 255)}%` };
    }

    const { rows, count } = await Group.findAndCountAll({
      where,
      attributes: {
        include: [
          [Sequelize.fn('COUNT', Sequelize.col('participants.id')), 'participant_count'],
          [Sequelize.fn('COUNT', Sequelize.col('winners.id')), 'winner_count'],
        ],
      },
      include: [
        { model: Participant, as: 'participants', attributes: [], required: false },
        { model: Winner, as: 'winners', attributes: [], required: false },
      ],
      group: ['Group.id'],
      subQuery: false,
      order: [['created_at', 'DESC']],
      offset: (page - 1) * pageSize,
      limit: pageSize,
    });

    return paginated(res, { rows, count: count.length, page, pageSize });
  } catch (err) {
    return next(err);
  }
}

/** GET /api/groups/all — simple list (for dropdowns). */
export async function listAllGroups(req, res, next) {
  try {
    const groups = await Group.findAll({
      attributes: ['id', 'name', 'line_group_id', 'created_at'],
      order: [['created_at', 'DESC']],
      raw: true,
    });
    return ok(res, groups);
  } catch (err) {
    return next(err);
  }
}

/** PATCH /api/groups/:id — rename / update group. */
export async function updateGroup(req, res, next) {
  try {
    const group = await Group.findByPk(req.params.id);
    if (!group) throw new ApiError(404, 'Group not found');
    if (req.body.name !== undefined) group.name = cleanStr(req.body.name, 255);
    await group.save();
    return ok(res, group, 'Group updated');
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/groups/:id/sync — refresh group name from LINE API.
 */
export async function syncGroup(req, res, next) {
  try {
    const group = await Group.findByPk(req.params.id);
    if (!group) throw new ApiError(404, 'Group not found');

    try {
      const summary = await lineClient.getGroupSummary(group.line_group_id);
      if (summary.groupName) group.name = summary.groupName;
      await group.save();
      return ok(res, group, 'Group synced from LINE');
    } catch (err) {
      logger.warn('[group] sync failed', { message: err.message });
      throw new ApiError(502, 'Cannot reach LINE API. Make sure the OA is still in the group.');
    }
  } catch (err) {
    return next(err);
  }
}

/** DELETE /api/groups/:id — deletes group + cascade participants/winners/events. */
export async function deleteGroup(req, res, next) {
  try {
    const group = await Group.findByPk(req.params.id);
    if (!group) throw new ApiError(404, 'Group not found');
    await group.destroy(); // cascade via FK ON DELETE CASCADE
    return ok(res, null, 'Group deleted');
  } catch (err) {
    return next(err);
  }
}
