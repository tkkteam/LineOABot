import { Op } from 'sequelize';
import { Transaction, Participant, Group } from '../models/index.js';
import { paginated } from '../utils/apiResponse.js';
import { parsePositiveInt } from '../utils/validators.js';

/** GET /api/transactions?month=YYYY-MM&page=1&pageSize=20 */
export async function listTransactions(req, res, next) {
  try {
    const page = parsePositiveInt(req.query.page, 1);
    const pageSize = parsePositiveInt(req.query.pageSize, 20, 500);
    const { month } = req.query; // format: 'YYYY-MM'

    const where = {};
    
    // Filter by month (approved_at)
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const startDate = new Date(`${month}-01T00:00:00.000Z`);
      const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 1); // First day of next month
      where.approved_at = {
        [Op.gte]: startDate,
        [Op.lt]: endDate
      };
    }

    const { rows, count } = await Transaction.findAndCountAll({
      where,
      include: [
        { model: Participant, as: 'participant', attributes: ['id', 'display_name', 'user_id'] },
        { model: Group, as: 'group', attributes: ['id', 'name', 'line_group_id'] }
      ],
      order: [['approved_at', 'DESC']],
      offset: (page - 1) * pageSize,
      limit: pageSize,
    });

    return paginated(res, { rows, count, page, pageSize });
  } catch (err) {
    return next(err);
  }
}
