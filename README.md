# 🎯 LINE Lottery — ระบบจับสลากและวงล้อสุ่มรายชื่อผ่าน LINE OA

ระบบจับสลาก / หมุนวงล้อสุ่มรายชื่อ สำหรับ LINE Group โดยให้ **LINE Official Account (LINE OA)** ถูกเชิญเข้ากลุ่มแล้วทำงานเป็น Bot พร้อม **Admin Dashboard** สำหรับจัดการผู้เข้าร่วม, สุ่มผู้โชคดี, ดูประวัติ และส่งออก Excel

```
LINE OA (Group Chat)
      │  สมัคร / ถอนตัว / รายชื่อ / หมุนวงล้อ / ประวัติ / ช่วยเหลือ
      ▼
Messaging API ──► Node.js (Express + LINE SDK) ──► MySQL 8
                        │
                        ▼
              Admin Dashboard (React + Vite + Tailwind + Chart.js)
```

## ✨ คุณสมบัติ

| หมวด | รายละเอียด |
|---|---|
| 🤖 LINE Bot | ตอบอัตโนมัติ: `สมัคร`, `ถอนตัว`, `รายชื่อ`, `หมุนวงล้อ`, `ประวัติ`, `ช่วยเหลือ` |
| 👥 Participants | ดึงชื่อ LINE Profile อัตโนมัติ, ป้องกันสมัครซ้ำ (Unique constraint) |
| 🎡 Wheel Engine | สุ่มแบบ Fair Random ด้วย `crypto.randomInt` — รองรับ 10,000+ คน |
| 🏆 Flex Message | แจ้งผลผู้โชคดีแบบ Flex (รูปถ้วยรางวัล + ปุ่มดูประวัติ) + Loading Animation |
| 📊 Admin Dashboard | สถิติ, กราฟรายวัน (Chart.js), จัดการผู้เข้าร่วม/กลุ่ม/ผู้ชนะ |
| 🎡 Wheel Page | วงล้อ HTML5 Canvas พร้อมเสียงหมุนจริง + ปุ่ม Spin |
| 📥 Export | ส่งออกประวัติผู้โชคดีเป็น CSV (เปิดใน Excel ได้ทันที) |
| 🔐 Security | JWT Auth, RBAC (Admin / Super Admin), bcrypt, Helmet, Rate Limit, XSS sanitize |
| 🐳 Deployment | Docker Compose: nginx + frontend + backend + mysql |

## 📁 โครงสร้างโปรเจกต์

```
├── backend/                # Node.js + Express + Sequelize + LINE SDK
│   └── src/
│       ├── config/         # env config + Sequelize instance
│       ├── models/         # User, Group, Participant, Winner, Event, Setting
│       ├── controllers/    # REST API controllers
│       ├── routes/         # Express routers
│       ├── middleware/     # JWT auth, RBAC, rate limit, error handler
│       ├── services/       # LINE bot, wheel engine, flex messages, settings
│       ├── scripts/        # db sync, seed admin
│       └── app.js / server.js
├── frontend/               # React + Vite + TailwindCSS + Chart.js
│   └── src/
│       ├── api/            # axios client (JWT interceptor)
│       ├── context/        # AuthContext
│       ├── components/     # Layout, Wheel (canvas), LineChart, ...
│       └── pages/          # Login, Dashboard, Participants, DrawWheel, WinnerHistory, Groups, Settings
├── database/
│   └── init.sql            # MySQL 8 schema (run on first compose up)
├── docker/
│   └── nginx/nginx.conf    # reverse proxy
├── docs/                   # เอกสารครบชุด
│   ├── ARCHITECTURE.md     # System Architecture Diagram
│   ├── DATABASE.md         # ER Diagram + Schema
│   ├── API.md              # REST API Documentation
│   ├── LINE_SETUP.md       # LINE Developer ตั้งค่า
│   ├── DEPLOYMENT.md       # คู่มือ Deploy
│   └── BEST_PRACTICES.md   # Production Best Practices
└── docker-compose.yml
```

## 🚀 Quick Start (Docker)

```bash
# 1. ตั้งค่า environment
cp .env.example .env
#   แก้ไข .env: DB_PASSWORD, JWT_SECRET, ADMIN_PASSWORD,
#   LINE_CHANNEL_ACCESS_TOKEN, LINE_CHANNEL_SECRET

# 2. รันระบบ (nginx + frontend + backend + mysql)
docker compose up -d --build

# 3. เข้าใช้งาน
#   Admin Dashboard : http://localhost        (admin / รหัสที่ตั้งใน .env)
#   Health check    : http://localhost/health
```

> ต้องการทดสอบ Webhook ระหว่างพัฒนา? ใช้ **ngrok** — ดู `docs/LINE_SETUP.md`

## 📚 เอกสาร

| เอกสาร | เนื้อหา |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System Architecture Diagram, Data Flow |
| [docs/DATABASE.md](docs/DATABASE.md) | ER Diagram, ตาราง, Indexes, Relationships |
| [docs/API.md](docs/API.md) | REST API ทั้งหมด + Request/Response Example |
| [docs/LINE_SETUP.md](docs/LINE_SETUP.md) | ตั้งค่า LINE Developers Console + Webhook |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Deploy ด้วย Docker Compose, HTTPS, Backup |
| [docs/BEST_PRACTICES.md](docs/BEST_PRACTICES.md) | Production Best Practices |

## 🧪 Dev (ไม่ใช้ Docker)

```bash
# Backend
cd backend
cp .env.example .env      # แก้ DB_HOST=localhost, LINE token
npm install
npm run db:sync           # สร้างตาราง
npm run seed:admin        # สร้าง admin
npm run dev               # http://localhost:3000

# Frontend
cd frontend
npm install
npm run dev               # http://localhost:5173 (proxy /api -> :3000)
```

## 📝 หมายเหตุ

- เวอร์ชันภาษาไทยใช้ปี พ.ศ. ใน Flex Message และประวัติ
- Wheel Page แสดงชื่อสูงสุด 60 ชื่อบนวงล้อ แต่ **การสุ่มใช้ผู้เข้าร่วมทุกคน** (Fair Random เต็มรูปแบบ)
- ผู้สมัครคนแรกของกลุ่มจะกลายเป็น "ผู้ดูแลกลุ่ม" อัตโนมัติ — เฉพาะผู้ดูแลที่ใช้คำสั่ง `หมุนวงล้อ` ได้ (ปิดได้ที่ Settings)
