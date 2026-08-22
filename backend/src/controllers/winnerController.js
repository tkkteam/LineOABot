import { Op } from 'sequelize';
import { Winner, Group } from '../models/index.js';
import { paginated, ok } from '../utils/apiResponse.js';
import { cleanStr, parsePositiveInt } from '../utils/validators.js';

/** GET /api/winners?group_id=&search=&page=&pageSize= */
export async function listWinners(req, res, next) {
  try {
    const page = parsePositiveInt(req.query.page, 1);
    const pageSize = parsePositiveInt(req.query.pageSize, 20, 500);

    const where = {};
    if (req.query.group_id) where.group_id = parseInt(req.query.group_id, 10);
    if (req.query.search) {
      where.winner_name = { [Op.like]: `%${cleanStr(req.query.search, 255)}%` };
    }

    const { rows, count } = await Winner.findAndCountAll({
      where,
      include: [{ model: Group, as: 'group', attributes: ['id', 'name', 'line_group_id'] }],
      order: [['draw_time', 'DESC']],
      offset: (page - 1) * pageSize,
      limit: pageSize,
    });

    return paginated(res, { rows, count, page, pageSize });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/winners/export?group_id=&search=
 * CSV export (UTF-8 BOM) that opens directly in Excel.
 */
export async function exportWinners(req, res, next) {
  try {
    const where = {};
    if (req.query.group_id) where.group_id = parseInt(req.query.group_id, 10);
    if (req.query.search) {
      where.winner_name = { [Op.like]: `%${cleanStr(req.query.search, 255)}%` };
    }

    const winners = await Winner.findAll({
      where,
      order: [['draw_time', 'DESC']],
      raw: true,
    });

    const escapeCsv = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

    const header = ['ลำดับ', 'ชื่อผู้โชคดี', 'LINE User ID', 'กลุ่ม', 'วันที่สุ่ม'];
    const lines = winners.map((w, i) =>
      [
        i + 1,
        escapeCsv(w.winner_name),
        escapeCsv(w.winner_user_id),
        escapeCsv(w.group_name || ''),
        new Date(w.draw_time).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }),
      ].join(','),
    );

    // BOM so Excel detects UTF-8 correctly
    const csv = '\uFEFF' + [header.join(','), ...lines].join('\r\n');
    const date = new Date().toISOString().slice(0, 10);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="winners_${date}.csv"`);
    return res.send(csv);
  } catch (err) {
    return next(err);
  }
}

/** DELETE /api/winners/:id */
export async function deleteWinner(req, res, next) {
  try {
    const winner = await Winner.findByPk(req.params.id);
    if (!winner) return ok(res, null, 'Winner not found');
    await winner.destroy();
    return ok(res, null, 'Winner record deleted');
  } catch (err) {
    return next(err);
  }
}
