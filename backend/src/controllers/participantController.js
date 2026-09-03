import { Op, Sequelize } from 'sequelize';
import { Participant, Group, Transaction } from '../models/index.js';
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

/** POST /api/participants */
export async function addManualParticipant(req, res, next) {
  try {
    const { group_id, display_name } = req.body;
    if (!group_id || !display_name) {
      throw new ApiError(400, 'Missing group_id or display_name');
    }

    const group = await Group.findByPk(group_id);
    if (!group) {
      throw new ApiError(404, 'Group not found');
    }

    // Generate a mock line user id for manual adds
    const mockUserId = `manual_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const participant = await Participant.create({
      group_id: group.id,
      user_id: mockUserId,
      display_name: cleanStr(display_name, 255),
      is_group_admin: false,
    });

    return ok(res, participant, 'Participant added successfully');
  } catch (err) {
    return next(err);
  }
}

/** PUT /api/participants/:id/admin */
export async function toggleGroupAdmin(req, res, next) {
  try {
    const participant = await Participant.findByPk(req.params.id);
    if (!participant) {
      throw new ApiError(404, 'Participant not found');
    }

    // If making someone admin, we should optionally remove admin from others?
    // Wait, multiple admins are fine according to lineService logic (just first one gets it initially).
    // Let's just toggle the flag.
    participant.is_group_admin = !participant.is_group_admin;
    await participant.save();

    return ok(res, participant, `Admin status updated to ${participant.is_group_admin}`);
  } catch (err) {
    return next(err);
  }
}

/** GET /api/participants/pending */
export async function listPendingSlips(req, res, next) {
  try {
    const pendingSlips = await Participant.findAll({
      where: {
        has_paid: false,
        slip_image: { [Op.ne]: null }
      },
      include: [{ model: Group, as: 'group', attributes: ['id', 'name', 'line_group_id'] }],
      order: [['updated_at', 'DESC']]
    });
    return ok(res, pendingSlips);
  } catch (err) {
    return next(err);
  }
}

/** POST /api/participants/:id/approve */
export async function approveSlip(req, res, next) {
  try {
    const participant = await Participant.findByPk(req.params.id, {
      include: [{ model: Group, as: 'group' }]
    });
    if (!participant) {
      throw new ApiError(404, 'Participant not found');
    }
    
    // อัปเดตให้เป็นจ่ายแล้ว
    participant.has_paid = true;
    await participant.save();

    // บันทึกประวัติการรับยอดลงตาราง Transactions
    await Transaction.create({
      participant_id: participant.id,
      group_id: participant.group_id,
      amount: participant.slip_amount,
      slip_image: participant.slip_image,
      slip_timestamp: participant.slip_timestamp,
      slip_ref: participant.slip_ref,
    });

    return ok(res, participant, 'Slip approved successfully');
  } catch (err) {
    return next(err);
  }
}

/** POST /api/participants/:id/reject */
export async function rejectSlip(req, res, next) {
  try {
    const participant = await Participant.findByPk(req.params.id, {
      include: [{ model: Group, as: 'group' }]
    });
    if (!participant) {
      throw new ApiError(404, 'Participant not found');
    }
    
    // ลบข้อมูลสลิปออก
    participant.has_paid = false;
    participant.slip_image = null;
    participant.slip_amount = null;
    participant.slip_timestamp = null;
    await participant.save();

    // ส่งแจ้งเตือนไปยัง LINE
    const { lineClient } = await import('../services/lineClient.js');
    const { buildRejectSlipFlexMessage } = await import('../services/flexMessages.js');

    if (participant.group && participant.group.line_group_id) {
      let targetId = participant.group.line_group_id;
      if (targetId.startsWith('dm_')) {
        targetId = participant.user_id;
      }

      await lineClient.pushMessage({
        to: targetId,
        messages: [buildRejectSlipFlexMessage(participant.display_name)]
      });
    }

    return ok(res, participant, 'Slip rejected and removed successfully');
  } catch (err) {
    return next(err);
  }
}

