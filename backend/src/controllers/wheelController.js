import { Group } from '../models/index.js';
import { spinForGroup, getWheelNames } from '../services/wheelService.js';
import { ApiError } from '../utils/ApiError.js';
import { ok } from '../utils/apiResponse.js';
import { requireFields } from '../utils/validators.js';

/**
 * POST /api/wheel/spin
 * Body: { group_id }
 * Runs the fair random draw and returns the winner.
 */
export async function spin(req, res, next) {
  try {
    requireFields(req.body, ['group_id']);
    const groupId = parseInt(req.body.group_id, 10);

    const group = await Group.findByPk(groupId);
    if (!group) throw new ApiError(404, 'Group not found');

    const winner = await spinForGroup(groupId);
    if (!winner) {
      throw new ApiError(400, 'No participants in this group yet');
    }

    return ok(res, {
      id: winner.id,
      group_id: winner.group_id,
      winner_user_id: winner.winner_user_id,
      winner_name: winner.winner_name,
      draw_time: winner.draw_time,
    }, 'Draw completed');
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/wheel/data?group_id=
 * Returns participant names + count for rendering the canvas wheel.
 */
export async function wheelData(req, res, next) {
  try {
    const groupId = parseInt(req.query.group_id, 10);
    if (!groupId) throw new ApiError(400, 'group_id is required');

    const group = await Group.findByPk(groupId);
    if (!group) throw new ApiError(404, 'Group not found');

    const names = await getWheelNames(groupId, 200);
    return ok(res, {
      group_id: groupId,
      group_name: group.name,
      total_participants: names.length,
      names,
    });
  } catch (err) {
    return next(err);
  }
}
