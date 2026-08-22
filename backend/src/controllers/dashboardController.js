import { Sequelize, Op } from 'sequelize';
import { Participant, Group, Winner, Event } from '../models/index.js';
import { ok } from '../utils/apiResponse.js';

/** GET /api/dashboard */
export async function dashboardStats(req, res, next) {
  try {
    const [totalParticipants, totalGroups, totalWinners, totalEvents, activeEvents] =
      await Promise.all([
        Participant.count(),
        Group.count(),
        Winner.count(),
        Event.count(),
        Event.count({ where: { status: 'active' } }),
      ]);

    // Daily winners for the last 30 days
    const since = new Date();
    since.setDate(since.getDate() - 29);
    since.setHours(0, 0, 0, 0);

    const [dailyWinners, dailyParticipants] = await Promise.all([
      Winner.findAll({
        attributes: [
          [Sequelize.fn('DATE', Sequelize.col('draw_time')), 'date'],
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
        ],
        where: { draw_time: { [Op.gte]: since } },
        group: [Sequelize.fn('DATE', Sequelize.col('draw_time'))],
        raw: true,
      }),
      Participant.findAll({
        attributes: [
          [Sequelize.fn('DATE', Sequelize.col('created_at')), 'date'],
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
        ],
        where: { created_at: { [Op.gte]: since } },
        group: [Sequelize.fn('DATE', Sequelize.col('created_at'))],
        raw: true,
      }),
    ]);

    // Fill the 30-day series with zeros for missing days
    const series = [];
    const winnerMap = new Map(dailyWinners.map((r) => [r.date, Number(r.count)]));
    const participantMap = new Map(dailyParticipants.map((r) => [r.date, Number(r.count)]));

    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      series.push({
        date: key,
        winners: winnerMap.get(key) ?? 0,
        participants: participantMap.get(key) ?? 0,
      });
    }

    return ok(res, {
      totals: {
        participants: totalParticipants,
        groups: totalGroups,
        winners: totalWinners,
        events: totalEvents,
        active_events: activeEvents,
      },
      daily: series,
    });
  } catch (err) {
    return next(err);
  }
}
