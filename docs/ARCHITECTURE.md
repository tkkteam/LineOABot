# 1. System Architecture Diagram

## ภาพรวม

```
┌──────────────────────────────────────────────────────────────────────┐
│                        LINE Users (Group Chat)                       │
│            พิมพ์: สมัคร / ถอนตัว / รายชื่อ / หมุนวงล้อ / ประวัติ       │
└──────────────────────────────────┬───────────────────────────────────┘
                                   │ LINE Messaging API (HTTPS Webhook)
                                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│                         Nginx Reverse Proxy (:80)                    │
│   /webhook ──────────────► backend:3000 (LINE SDK verify signature)  │
│   /api/*   ──────────────► backend:3000 (REST API)                   │
│   /*       ──────────────► frontend:80  (React SPA static)           │
└──────────────────────────────────────────────────────────────────────┘
                                   │
              ┌────────────────────┴────────────────────┐
              ▼                                         ▼
┌─────────────────────────────┐        ┌─────────────────────────────┐
│   Backend (Node.js/Express) │        │  Frontend (React + Vite)    │
│  ┌───────────────────────┐  │        │  - Admin Dashboard          │
│  │ LINE Bot Service      │  │        │  - Draw Wheel (Canvas)      │
│  │  - Command routing    │  │        │  - Chart.js (สถิติรายวัน)    │
│  │  - Flex Messages      │  │        │  - Axios + JWT              │
│  │  - Loading animation  │  │        └─────────────────────────────┘
│  ├───────────────────────┤  │
│  │ Wheel Engine          │  │
│  │  - crypto.randomInt   │  │
│  │  - fair random (O(1)) │  │
│  ├───────────────────────┤  │
│  │ REST API (JWT/RBAC)   │  │
│  │  - /api/auth          │  │
│  │  - /api/participants  │  │
│  │  - /api/wheel         │  │
│  │  - /api/winners       │  │
│  │  - /api/groups        │  │
│  │  - /api/dashboard     │  │
│  │  - /api/settings      │  │
│  └───────────────────────┘  │
└──────────────┬──────────────┘
               │ Sequelize ORM (pool max 20)
               ▼
┌─────────────────────────────────────────────┐
│              MySQL 8 (utf8mb4)              │
│  users · groups · participants · winners    │
│  events · settings                          │
└─────────────────────────────────────────────┘
```

## Data Flow — LINE Bot

```
1. สมาชิกพิมพ์ "สมัคร" ในกลุ่ม
2. LINE ส่ง Webhook POST /webhook (พร้อม X-Line-Signature)
3. line.middleware() ตรวจสอบ signature → ส่ง event ให้ handleEvent()
4. handleEvent() แยกประเภทคำสั่ง (routeCommand)
5. lineClient.getGroupMemberProfile(groupId, userId) → ดึงชื่อ LINE Profile
6. Participant.findOrCreate() — Unique (group_id, user_id) ป้องกันสมัครซ้ำ
7. replyMessage() ส่งข้อความยืนยันกลับ
```

```
1. ผู้ดูแลพิมพ์ "หมุนวงล้อ"
2. ตรวจสอบสิทธิ์: is_group_admin (หรือ setting spin_requires_admin)
3. lineClient.showLoadingAnimation({ chatId, loadingSeconds: 20 }) → แสดง Animation กำลังสุ่ม
4. Wheel Engine: COUNT(*) → crypto.randomInt(count) → SELECT ... LIMIT 1 OFFSET n
5. Winner.create() บันทึกประวัติ
6. replyMessage() ส่ง Flex Message (รูปถ้วยรางวัล + ชื่อผู้ชนะ + วันที่ + ปุ่มดูประวัติ)
```

## Data Flow — Admin Dashboard

```
1. Admin login → POST /api/auth/login → JWT (เก็บใน localStorage)
2. ทุก request ส่ง Authorization: Bearer <token>
3. authenticate() ตรวจ JWT → requireRole('admin' | 'super_admin')
4. หน้า Draw Wheel: GET /api/wheel/data → วาด Canvas วงล้อ
5. คลิก Spin: POST /api/wheel/spin → สุ่ม + บันทึก → หมุนวงล้อไปยังตำแหน่งผู้ชนะ + เสียง
6. หน้า Winner History: GET /api/winners + GET /api/winners/export (CSV)
```

## เทคโนโลยี

| ชั้น | เทคโนโลยี |
|---|---|
| LINE | Messaging API, Flex Message, Loading Indicator, `@line/bot-sdk` v11 |
| Backend | Node.js 20, Express 5, Sequelize 6 ORM, JWT, bcryptjs, Helmet, express-rate-limit |
| Database | MySQL 8 (utf8mb4_unicode_ci), Foreign Keys + Indexes |
| Frontend | React 19, Vite, TailwindCSS 3, Chart.js 4, Axios, React Router 7 |
| Deploy | Docker, Docker Compose, Nginx reverse proxy |

## Scalability

- **10,000+ ผู้เข้าร่วม**: Wheel Engine ใช้ `crypto.randomInt` + `COUNT(*)/OFFSET` แบบ O(1) — ไม่มี `ORDER BY RAND()` (O(n log n))
- **Multiple instances**: ตั้ง `JWT_SECRET`/`DB` ร่วมกัน, เพิ่ม replica ของ backend หลัง nginx load-balance ได้
- **DB pool**: max 20 connections ต่อ instance
