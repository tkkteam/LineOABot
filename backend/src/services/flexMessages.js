import config from '../config/index.js';

function formatThaiDate(date) {
  const d = new Date(date);
  const months = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
  ];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} น.`;
}

/**
 * Winner Flex Message:
 *  - trophy hero image
 *  - winner name
 *  - date & time
 *  - "ดูประวัติ" button (deep link to admin history page)
 */
export function buildWinnerFlexMessage({ winnerName, drawTime, groupId }) {
  const historyUri = `${config.urls.frontend}/winners?group=${groupId}`;

  return {
    type: 'flex',
    altText: `🏆 ผู้โชคดีคือ ${winnerName}`,
    contents: {
      type: 'bubble',
      hero: {
        type: 'image',
        url: config.line.trophyImageUrl,
        size: 'full',
        aspectRatio: '20:13',
        aspectMode: 'cover',
        backgroundColor: '#FDE68A',
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'text',
            text: '🎯 ผลการจับสลาก',
            align: 'center',
            size: 'sm',
            color: '#9CA3AF',
          },
          {
            type: 'text',
            text: '🏆 ผู้โชคดีคือ',
            align: 'center',
            size: 'md',
            color: '#6B7280',
          },
          {
            type: 'text',
            text: winnerName,
            align: 'center',
            size: 'xl',
            weight: 'bold',
            color: '#111827',
            wrap: true,
          },
          {
            type: 'text',
            text: `📅 ${formatThaiDate(drawTime)}`,
            align: 'center',
            size: 'xs',
            color: '#9CA3AF',
          },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'primary',
            height: 'sm',
            action: {
              type: 'uri',
              label: 'ดูประวัติผู้โชคดี',
              uri: historyUri,
            },
          },
        ],
      },
    },
  };
}

/** Simple text reply helper. */
export function textMessage(text) {
  return { type: 'text', text };
}

/** Reject Slip Flex Message */
export function buildRejectSlipFlexMessage(displayName) {
  return {
    type: 'flex',
    altText: `❌ ปฏิเสธการรับยอดของ ${displayName || 'ผู้ใช้'}`,
    contents: {
      type: 'bubble',
      size: 'mega',
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: [
          {
            type: 'text',
            text: '❌ ปฏิเสธการรับยอด',
            weight: 'bold',
            color: '#EF4444',
            size: 'lg',
            align: 'center'
          },
          {
            type: 'separator',
            margin: 'md'
          },
          {
            type: 'text',
            text: `ผู้ใช้: ${displayName || 'คุณ'}`,
            size: 'sm',
            color: '#374151',
            weight: 'bold',
            align: 'center'
          },
          {
            type: 'text',
            text: 'แอดมินยังไม่ได้รับเงิน หรือสลิปที่ส่งไม่ถูกต้อง',
            size: 'sm',
            color: '#111827',
            wrap: true,
            margin: 'md',
            align: 'center'
          },
          {
            type: 'text',
            text: 'กรุณาติดต่อแอดมินอีกครั้งเพื่อตรวจสอบ',
            size: 'xs',
            color: '#6B7280',
            wrap: true,
            margin: 'sm',
            align: 'center'
          }
        ]
      }
    }
  };
}
