import { Op, Sequelize } from 'sequelize';
import { Participant, Group } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { paginated, ok } from '../utils/apiResponse.js';
import { cleanStr, parsePositiveInt } from '../utils/validators.js';

/** GET /api/participants?group_id=&search=&page=&pageSize= */
export async function listParticipants(req, res, next) {
  try {
    const page = parsePositiveInt(req.query.page, 1);
    const pageSize = parsePositiveInt(req.query.pageSize, 20, 500);

    const where = {};
    if (req.query.group_id) where.group_id = parseInt(req.query.group_id, 10);
    if (req.query.search) {
      where.display_name = { [Op.like]: `%${cleanStr(req.query.search, 255)}%` };
    }

    const { rows, count } = await Participant.findAndCountAll({
      where,
      include: [{ model: Group, as: 'group', attributes: ['id', 'name', 'line_group_id'] }],
      order: [['created_at', 'DESC']],
      offset: (page - 1) * pageSize,
      limit: pageSize,
    });

    return paginated(res, { rows, count, page, pageSize });
  } catch (err) {
    return next(err);
  }
}

/** DELETE /api/participants/:id */
export async function deleteParticipant(req, res, next) {
  try {
    const participant = await Participant.findByPk(req.params.id);
    if (!participant) throw new ApiError(404, 'Participant not found');
    await participant.destroy();
    return ok(res, null, 'Participant removed');
  } catch (err) {
    return next(err);
  }
}

/** GET /api/participants/stats */
export async function participantStats(req, res, next) {
  try {
    const total = await Participant.count();
    const byGroup = await Participant.findAll({
      attributes: [
        'group_id',
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
      ],
      group: ['group_id'],
      raw: true,
    });
    return ok(res, { total, by_group: byGroup });
  } catch (err) {
    return next(err);
  }
}
