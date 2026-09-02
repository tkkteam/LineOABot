import { Group, Participant, Winner } from '../models/index.js';
import { lineClient } from './lineClient.js';
import { spinForGroup } from './wheelService.js';
import { getSetting } from './settingsService.js';
import { buildWinnerFlexMessage, textMessage } from './flexMessages.js';
import { logger } from '../utils/logger.js';
import axios from 'axios';
import FormData from 'form-data';
import config from '../config/index.js';
import fs from 'fs';
import path from 'path';

const HELP_TEXT = [
  '🤖 ระบบจับสลากและวงล้อสุ่มรายชื่อ',
  '',
  '📌 คำสั่งที่ใช้ได้:',
  '   สมัคร      ➜ สมัครเข้าร่วมกิจกรรม',
  '   ถอนตัว     ➜ ถอนตัวออกจากรายชื่อ',
  '   รายชื่อ    ➜ ดูรายชื่อผู้เข้าร่วม',
  '   หมุนวงล้อ  ➜ สุ่มผู้โชคดี (เฉพาะผู้ดูแลกลุ่ม)',
  '   ประวัติ    ➜ ดูประวัติผู้โชคดี',
  '   ช่วยเหลือ  ➜ ดูคำสั่งทั้งหมด',
  '📸 ส่งรูปภาพสลิปโอนเงินเพื่อตรวจสอบสลิป',
].join('\n');

/** Normalize raw text: trim, lowercase, strip common prefixes (/, !, #, สลาก, จับสลาก). */
function normalizeCommand(raw) {
  let text = (raw || '').trim().toLowerCase();
  // strip leading symbols
  text = text.replace(/^[/!#@.ฯ\s]+/, '');
  // strip leading "จับสลาก" / "สลาก" words
  text = text.replace(/^(จับสลาก|จับรางวัล|สลาก|สุ่ม)\s*/i, '');
  return text.trim();
}

function routeCommand(normalized) {
  if (['สมัคร', 'สมัครเข้าร่วม', 'register', 'สมัครสมาชิก'].includes(normalized)) return 'register';
  if (['ถอนตัว', 'ถอน', 'withdraw', 'ยกเลิกการสมัคร', 'ลบชื่อ'].includes(normalized)) return 'withdraw';
  if (['รายชื่อ', 'รายชื่อผู้เข้าร่วม', 'list', 'ดูรายชื่อ', 'สมาชิก'].includes(normalized)) return 'list';
  if (['หมุนวงล้อ', 'หมุน', 'spin', 'จับสลาก', 'จับรางวัล', 'สุ่มผู้โชคดี'].includes(normalized)) return 'spin';
  if (['ประวัติ', 'ประวัติผู้โชคดี', 'history', 'ผู้โชคดี', 'winner'].includes(normalized)) return 'history';
  if (['ช่วยเหลือ', 'help', 'menu', 'เมนู', 'คำสั่ง', 'เริ่มต้น'].includes(normalized)) return 'help';
  return null;
}

/** Find or create the Group row for a LINE groupId. */
async function ensureGroup(groupId) {
  let group = await Group.findOne({ where: { line_group_id: groupId } });
  if (!group) {
    group = await Group.create({ line_group_id: groupId, name: '' });
    // Try to enrich with the real group name from LINE API
    try {
      const summary = await lineClient.getGroupSummary(groupId);
      await group.update({ name: summary.groupName || '' });
    } catch (err) {
      logger.warn('[line] could not fetch group summary', { groupId, message: err.message });
    }
  }
  return group;
}

async function getProfileOrFallback(groupId, userId) {
  try {
    const profile = await lineClient.getGroupMemberProfile(groupId, userId);
    return profile.displayName || userId;
  } catch {
    logger.warn('[line] profile fetch failed, using userId', { groupId, userId });
    return `สมาชิก ${userId.slice(-6)}`;
  }
}

/** Reply a single text message safely. */
async function replyText(replyToken, text) {
  try {
    await lineClient.replyMessage({ replyToken, messages: [textMessage(text)] });
  } catch (err) {
    logger.error('[line] reply failed', { message: err.message });
  }
}

// ------------------------------------------------------------------
// Command handlers
// ------------------------------------------------------------------

async function handleRegister(event) {
  const { groupId, userId, replyToken } = event;
  if (!groupId) return replyText(replyToken, 'กรุณาใช้คำสั่งนี้ใน LINE Group');

  const group = await ensureGroup(groupId);
  const displayName = await getProfileOrFallback(groupId, userId);

  let participant = await Participant.findOne({ where: { group_id: group.id, user_id: userId } });
  if (participant) {
    return replyText(replyToken, `คุณ ${displayName} สมัครเข้าร่วมแล้วแล้ว ✅`);
  }

  const count = await Participant.count({ where: { group_id: group.id } });
  try {
    participant = await Participant.create({
      group_id: group.id,
      user_id: userId,
      display_name: displayName,
      is_group_admin: count === 0, // first member becomes group admin
    });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return replyText(replyToken, `คุณ ${displayName} สมัครเข้าร่วมแล้วแล้ว ✅`);
    }
    throw err;
  }

  const rank = count + 1;
  const adminNote = participant.is_group_admin ? '\n\n👑 คุณเป็นผู้ดูแลกลุ่ม สามารถใช้คำสั่ง "หมุนวงล้อ" ได้' : '';
  return replyText(
    replyToken,
    `✅ สมัครเข้าร่วมสำเร็จ!\n\n👤 ชื่อ: ${displayName}\n🎫 ลำดับที่: ${rank}\n\nพิมพ์ "รายชื่อ" เพื่อดูรายชื่อทั้งหมด${adminNote}`,
  );
}

async function handleWithdraw(event) {
  const { groupId, userId, replyToken } = event;
  if (!groupId) return replyText(replyToken, 'กรุณาใช้คำสั่งนี้ใน LINE Group');

  const group = await ensureGroup(groupId);
  const deleted = await Participant.destroy({ where: { group_id: group.id, user_id: userId } });

  if (deleted > 0) {
    return replyText(replyToken, '❌ ถอนตัวออกจากรายชื่อเรียบร้อยแล้ว\n\nพิมพ์ "สมัคร" เพื่อสมัครใหม่ได้ตลอดเวลา');
  }
  return replyText(replyToken, 'คุณยังไม่ได้สมัครเข้าร่วม\nพิมพ์ "สมัคร" เพื่อเข้าร่วม');
}

async function handleList(event) {
  const { groupId, replyToken } = event;
  if (!groupId) return replyText(replyToken, 'กรุณาใช้คำสั่งนี้ใน LINE Group');

  const group = await ensureGroup(groupId);
  const participants = await Participant.findAll({
    where: { group_id: group.id },
    order: [['id', 'ASC']],
  });

  if (participants.length === 0) {
    return replyText(replyToken, '📭 ยังไม่มีผู้เข้าร่วม\nพิมพ์ "สมัคร" เพื่อสมัครเข้าร่วม');
  }

  const maxLines = parseInt(await getSetting('list_max_lines'), 10) || 40;
  const shown = participants.slice(0, maxLines);
  const lines = shown.map((p, i) => `${i + 1}. ${p.display_name}${p.is_group_admin ? ' 👑' : ''}`);
  const moreNote = participants.length > maxLines ? `\n...และอีก ${participants.length - maxLines} คน` : '';

  return replyText(replyToken, `👥 รายชื่อผู้เข้าร่วม (${participants.length} คน)\n\n${lines.join('\n')}${moreNote}`);
}

async function handleSpin(event) {
  const { groupId, userId, replyToken } = event;
  if (!groupId) return replyText(replyToken, 'กรุณาใช้คำสั่งนี้ใน LINE Group');

  const wheelEnabled = (await getSetting('wheel_enabled')) !== 'false';
  if (!wheelEnabled) {
    return replyText(replyToken, '⏸️ ระบบปิดรับการจับสลากชั่วคราว กรุณารอการแจ้งเตือนจากผู้ดูแล');
  }

  const group = await ensureGroup(groupId);
  const me = await Participant.findOne({ where: { group_id: group.id, user_id: userId } });

  const spinRequiresAdmin = (await getSetting('spin_requires_admin')) !== 'false';
  if (spinRequiresAdmin && (!me || !me.is_group_admin)) {
    return replyText(replyToken, '🔒 เฉพาะผู้ดูแลกลุ่มเท่านั้นที่หมุนวงล้อได้\n(ผู้สมัครคนแรกของกลุ่มเป็นผู้ดูแลอัตโนมัติ)');
  }

  const participantCount = await Participant.count({ where: { group_id: group.id } });
  if (participantCount === 0) {
    return replyText(replyToken, '📭 ยังไม่มีผู้เข้าร่วม\nพิมพ์ "สมัคร" เพื่อสมัครเข้าร่วมก่อน');
  }

  // Show the "loading" bubble animation while we draw
  try {
    await lineClient.showLoadingAnimation({ chatId: groupId, loadingSeconds: 20 });
  } catch (err) {
    logger.warn('[line] showLoadingAnimation failed', { message: err.message });
  }

  const winner = await spinForGroup(group.id);
  if (!winner) {
    return replyText(replyToken, '⚠️ ไม่สามารถสุ่มได้ กรุณาลองใหม่อีกครั้ง');
  }

  const flex = buildWinnerFlexMessage({
    winnerName: winner.winner_name,
    drawTime: winner.draw_time,
    groupId: group.line_group_id,
  });

  try {
    await lineClient.replyMessage({ replyToken, messages: [flex] });
  } catch (err) {
    logger.error('[line] flex reply failed', { message: err.message });
  }
}

async function handleHistory(event) {
  const { groupId, replyToken } = event;
  if (!groupId) return replyText(replyToken, 'กรุณาใช้คำสั่งนี้ใน LINE Group');

  const group = await ensureGroup(groupId);
  const winners = await Winner.findAll({
    where: { group_id: group.id },
    order: [['draw_time', 'DESC']],
    limit: 10,
  });

  if (winners.length === 0) {
    return replyText(replyToken, '📭 ยังไม่มีประวัติผู้โชคดี\nพิมพ์ "หมุนวงล้อ" เพื่อเริ่มจับสลาก');
  }

  const lines = winners.map((w, i) => {
    const d = new Date(w.draw_time);
    const date = `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear() + 543}`;
    return `${i + 1}. 🏆 ${w.winner_name} (${date})`;
  });

  return replyText(replyToken, `🏆 ประวัติผู้โชคดี (${winners.length} ล่าสุด)\n\n${lines.join('\n')}`);
}

async function handleSlipImage(event) {
  const { replyToken, source, message } = event;
  try {
    const userId = source.userId;
    const groupId = source.groupId;
    const messageId = message.id;
    
    // ดึงชื่อผู้ใช้จาก LINE
    let displayName = 'ผู้ใช้งาน';
    try {
      if (groupId) {
        const profile = await lineClient.getGroupMemberProfile(groupId, userId);
        displayName = profile.displayName || displayName;
      } else if (userId) {
        const profile = await lineClient.getProfile(userId);
        displayName = profile.displayName || displayName;
      }
    } catch (e) {
      logger.warn('[line] could not fetch profile for slip', { userId, groupId });
    }

    // สร้างโฟลเดอร์สำหรับเก็บสลิปแยกต่างหาก (ถ้ายังไม่มี)
    const slipsDir = path.join(process.cwd(), 'uploads', 'slips');
    if (!fs.existsSync(slipsDir)) {
      fs.mkdirSync(slipsDir, { recursive: true });
    }

    const fileName = `${Date.now()}_${userId}.jpg`;
    const filePath = path.join(slipsDir, fileName);

    // ดาวน์โหลดรูปภาพสลิปจาก LINE
    try {
      const response = await axios({
        method: 'get',
        url: `https://api-data.line.me/v2/bot/message/${messageId}/content`,
        headers: {
          Authorization: `Bearer ${config.line.channelAccessToken}`
        },
        responseType: 'stream'
      });

      const writer = fs.createWriteStream(filePath);
      
      response.data.pipe(writer);
      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });
      logger.info(`[slip] Saved slip image to ${filePath}`);
    } catch (downloadErr) {
      logger.error('[slip] Failed to download slip image', { message: downloadErr.message });
    }

    // ตรวจสอบสลิปด้วย SlipOK API
    if (config.slipok && config.slipok.branchId && config.slipok.apiKey) {
      try {
        const form = new FormData();
        form.append('files', fs.createReadStream(filePath));

        await axios.post(
          `https://api.slipok.com/api/line/apikey/${config.slipok.branchId}`,
          form,
          {
            headers: {
              'x-authorization': config.slipok.apiKey,
              ...form.getHeaders()
            }
          }
        );
        logger.info('[slip] SlipOK verification passed', { userId });
      } catch (err) {
        // หาก API แจ้งว่าไม่ใช่สลิป หรือสลิปไม่ถูกต้อง ให้หยุดการทำงาน (ไม่ตอบกลับใดๆ)
        const slipError = err.response?.data || err.message;
        logger.error('[slip] SlipOK verification failed', { userId, slipError });
        // ชั่วคราว: ตอบกลับ error เพื่อให้แอดมินเห็นว่าเกิดอะไรขึ้น
        await replyText(replyToken, `❌ SlipOK Error: ${JSON.stringify(slipError)}`);
        return; 
      }
    } else {
      // หากยังไม่ได้ใส่ API Key ของ SlipOK บอทจะไม่รู้ว่ารูปไหนคือสลิป 
      // ระบบจะอนุโลมตอบกลับทุกรูปไปก่อนจนกว่าจะใส่ API Key (หรือถ้าอยากให้เงียบไปเลย สามารถมาแก้โค้ดตรงนี้ให้ return; ได้ครับ)
    }

    // สร้าง Flex Message ตอบกลับเมื่อตรวจสอบสลิปผ่านแล้ว
    const flexMessage = {
      type: 'flex',
      altText: `ได้รับแจ้งโอนเงินจากคุณ ${displayName} แล้ว`,
      contents: {
        type: 'bubble',
        size: 'kilo',
        body: {
          type: 'box',
          layout: 'vertical',
          spacing: 'md',
          contents: [
            {
              type: 'text',
              text: '🧾 แจ้งโอนเงินสำเร็จ',
              weight: 'bold',
              color: '#1DB446',
              size: 'xl'
            },
            {
              type: 'text',
              text: `จากคุณ: ${displayName}`,
              size: 'md',
              weight: 'bold',
              color: '#111111',
              wrap: true
            },
            {
              type: 'separator',
              margin: 'md'
            },
            {
              type: 'text',
              text: 'ระบบได้รับรูปสลิปเรียบร้อยแล้ว แอดมินจะทำการตรวจสอบยอดเงินอีกครั้งครับ 🙏',
              size: 'sm',
              color: '#888888',
              wrap: true
            }
          ]
        }
      }
    };

    await lineClient.replyMessage({ replyToken, messages: [flexMessage] });

  } catch (error) {
    logger.error('[slip] verification failed', { message: error.message });
    await replyText(replyToken, '❌ ไม่สามารถบันทึกสลิปได้ชั่วคราว');
  }
}

// ------------------------------------------------------------------
// Main event dispatcher
// ------------------------------------------------------------------

/**
 * Handle a single LINE webhook event.
 * Supports: message (text), join (bot added to group).
 */
export async function handleEvent(event) {
  // Bot joined a group -> welcome
  if (event.type === 'join' || (event.type === 'memberJoined' && event.joined?.type === 'group')) {
    const groupId = event.source?.groupId;
    if (groupId) {
      await ensureGroup(groupId);
      return replyText(event.replyToken, HELP_TEXT);
    }
    return;
  }

  // Handle Slip Image Verification
  if (event.type === 'message' && event.message.type === 'image') {
    return await handleSlipImage(event);
  }

  if (event.type !== 'message' || event.message.type !== 'text') {
    return; // ignore other non-text messages (stickers, videos, etc.)
  }

  const source = event.source || {};
  if (source.type !== 'group') {
    // Direct message to the bot
    if (event.replyToken) {
      return replyText(event.replyToken, '🤖 สวัสดีครับ!\n\nระบบนี้ใช้งานใน LINE Group เป็นหลัก หรือส่งรูปสลิปโอนเงินมาเพื่อตรวจสอบได้เลยครับ\n\nพิมพ์ "ช่วยเหลือ" เพื่อดูคำสั่งทั้งหมด');
    }
    return;
  }

  const command = routeCommand(normalizeCommand(event.message.text));
  if (!command) return; // ignore unrelated conversation text

  logger.info('[line] command received', { command, groupId: source.groupId, userId: source.userId });

  const ctx = {
    groupId: source.groupId,
    userId: source.userId,
    replyToken: event.replyToken,
    event,
  };

  try {
    switch (command) {
      case 'register':
        return await handleRegister(ctx);
      case 'withdraw':
        return await handleWithdraw(ctx);
      case 'list':
        return await handleList(ctx);
      case 'spin':
        return await handleSpin(ctx);
      case 'history':
        return await handleHistory(ctx);
      case 'help':
        return await replyText(ctx.replyToken, HELP_TEXT);
      default:
        return;
    }
  } catch (err) {
    logger.error('[line] command error', { command, message: err.message, stack: err.stack });
    try {
      await replyText(ctx.replyToken, '⚠️ เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
    } catch {
      // ignore
    }
  }
}

