import crypto from 'node:crypto';
import { Op } from 'sequelize';
import { Participant, Winner } from '../models/index.js';
import { getSetting } from './settingsService.js';
import { logger } from '../utils/logger.js';

/**
 * Fair Random Wheel Engine
 * -----------------------
 * Picks a winner from all participants of a group with cryptographically
 * secure uniform randomness.
 *
 * Why NOT `ORDER BY RAND()`:
 *   - ORDER BY RAND() forces a full table scan + sort (O(n log n)) and does
 *     not scale to the required 10,000+ participants.
 *   - It uses the PRNG quality of MySQL RAND(), which is not
 *     cryptographically secure.
 *
 * Our approach (O(1) with index):
 *   1. COUNT(*) participants in the group   -> uses the (group_id) index
 *   2. crypto.randomInt(count)              -> cryptographically secure,
 *                                              uniform over [0, count)
 *   3. SELECT ... LIMIT 1 OFFSET random     -> fast, no sort
 *
 * Every participant therefore has exactly 1/count chance of winning.
 */
export async function spinForGroup(groupId) {
  const winnersCanRepeat = (await getSetting('winners_can_repeat')) !== 'false';

  const where = { group_id: groupId };
  let excluded = [];
  if (!winnersCanRepeat) {
    const previous = await Winner.findAll({
      where: { group_id: groupId },
      attributes: ['winner_user_id'],
      raw: true,
    });
    excluded = previous.map((w) => w.winner_user_id);
    if (excluded.length > 0) {
      where.user_id = { [Op.notIn]: excluded };
    }
  }

  const count = await Participant.count({ where });
  if (count === 0) return null;

  // Cryptographically secure uniform random index
  const randomIndex = crypto.randomInt(count);

  const participant = await Participant.findOne({
    where,
    order: [['id', 'ASC']],
    offset: randomIndex,
    limit: 1,
  });

  if (!participant) return null;

  const winner = await Winner.create({
    group_id: groupId,
    winner_user_id: participant.user_id,
    winner_name: participant.display_name,
    draw_time: new Date(),
  });

  logger.info('[wheel] winner drawn', { groupId, winnerId: winner.id, name: winner.winner_name });

  return winner;
}

/** All participant display names of a group (for the canvas wheel page). */
export async function getWheelNames(groupId, limit = 200) {
  const participants = await Participant.findAll({
    where: { group_id: groupId },
    attributes: ['display_name'],
    order: [['id', 'ASC']],
    limit,
    raw: true,
  });
  return participants.map((p) => p.display_name);
}
