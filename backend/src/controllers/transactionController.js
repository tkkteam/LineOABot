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

/** DELETE /api/transactions/:id */
export async function deleteTransaction(req, res, next) {
  try {
    const transaction = await Transaction.findByPk(req.params.id);
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }
    
    // หากลบ Transaction ต้องอัพเดท participant ว่ายังไม่จ่ายด้วยไหม?
    // ปกติประวัติโอนเงิน (Transaction) จะแค่เก็บประวัติ 
    // แต่ถ้าลบ ก็ลบออกไปเลย
    await transaction.destroy();
    
    return res.status(200).json({ success: true, message: 'Transaction deleted successfully' });
  } catch (err) {
    return next(err);
  }
}

/** POST /api/transactions/:id/notify */
export async function notifyTransaction(req, res, next) {
  try {
    const transaction = await Transaction.findByPk(req.params.id, {
      include: [
        { model: Participant, as: 'participant' },
        { model: Group, as: 'group' }
      ]
    });
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    const { lineClient } = await import('../services/lineClient.js');
    const { buildApproveSlipFlexMessage } = await import('../services/flexMessages.js');

    if (transaction.group && transaction.group.line_group_id && transaction.participant) {
      let targetId = transaction.group.line_group_id;
      if (targetId.startsWith('dm_')) {
        targetId = transaction.participant.user_id;
      }

      await lineClient.pushMessage({
        to: targetId,
        messages: [buildApproveSlipFlexMessage(transaction.participant.display_name, transaction.amount)]
      });
    }

    return res.status(200).json({ success: true, message: 'Notification sent successfully' });
  } catch (err) {
    return next(err);
  }
}
