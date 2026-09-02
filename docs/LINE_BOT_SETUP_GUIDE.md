# คู่มือการติดตั้งและตั้งค่าระบบ LINE OA Bot (สลิปโอนเงิน + วงล้อสุ่ม) บน AWS

คู่มือฉบับนี้อธิบายตั้งแต่การตั้งค่า LINE Official Account การเช่าเซิร์ฟเวอร์ AWS การใช้ Docker และการผูกโดเมนด้วย Cloudflare เพื่อเปิดใช้งานระบบ Webhook อย่างสมบูรณ์

---

## 1. การตั้งค่า LINE Official Account

เข้าไปที่ [LINE Official Account Manager](https://manager.line.biz/) เลือกบัญชีของคุณ
1. ไปที่เมนู **การตั้งค่า (Settings) -> การตั้งค่าแชท (Chat settings)**
2. เลื่อนหาหัวข้อ **ฟีเจอร์การตอบข้อความ**:
   - **Webhook:** ตั้งเป็น `เปิดใช้งาน (ON)` 🟢
3. เลื่อนหาหัวข้อ **วิธีตอบแชท**:
   - **ข้อความตอบกลับอัตโนมัติ (Auto-reply messages):** ตั้งเป็น `ปิดใช้งาน (Disabled)` ⚪ (สำคัญมาก เพื่อไม่ให้บอทของ LINE แย่งโค้ดเราตอบ)
4. เลื่อนลงมาที่หัวข้อ **แชทกลุ่มหรือแชทหลายคน (Group and multi-person chats)**:
   - เลือก **อนุญาตให้เข้าร่วมกลุ่มและแชทหลายคน** (เพื่อให้ดึงบอทเข้ากลุ่มได้)

---

## 2. การสร้างและตั้งค่า AWS EC2

1. สมัครและล็อกอินเข้าสู่ **AWS Console**
2. ไปที่เมนู **EC2** กดปุ่ม **Launch Instance**
3. **OS Images:** เลือก **Ubuntu** (22.04 LTS หรือ 24.04 LTS) *Free tier eligible*
4. **Instance type:** เลือก **t2.micro** หรือ **t3.micro**
5. **Key pair:** สร้างและดาวน์โหลดไฟล์ `.pem` เก็บไว้
6. **Network settings (Firewall):** 
   - ✅ Allow SSH traffic from Anywhere
   - ✅ Allow HTTP traffic from the internet
   - ✅ Allow HTTPS traffic from the internet
7. กด **Launch instance**

---

## 3. การติดตั้ง Docker และนำโค้ดขึ้น AWS

1. เมื่อ Instance รันแล้ว ให้กดปุ่ม **Connect** มุมขวาบน -> เลือกแท็บ **EC2 Instance Connect** -> กด **Connect** เพื่อเปิดหน้าจอ Terminal สีดำ
2. รันคำสั่งต่อไปนี้ทีละบรรทัดเพื่อติดตั้ง **Docker**:
   ```bash
   sudo apt-get update
   sudo apt-get install -y docker.io docker-compose-v2 git
   sudo systemctl enable docker
   sudo systemctl start docker
   ```
3. ดาวน์โหลดโค้ดโปรเจกต์จาก Github ลงเซิร์ฟเวอร์:
   ```bash
   git clone https://github.com/tkkteam/LineOABot.git
   cd LineOABot
   ```
4. สร้างไฟล์ `.env` เพื่อเก็บ Token ความลับ:
   ```bash
   cp backend/.env.example backend/.env
   nano backend/.env
   ```
   *(นำค่า `LINE_CHANNEL_ACCESS_TOKEN` และ `LINE_CHANNEL_SECRET` จากเว็บ LINE Developers มาใส่)*
5. ก๊อปปี้ไฟล์ `.env` ออกมาไว้ที่หน้าโฟลเดอร์หลักให้ Docker ด้วย:
   ```bash
   cp backend/.env .env
   ```
6. สั่งรันระบบทั้งหมดด้วย Docker:
   ```bash
   sudo docker compose up -d --build
   ```

---

## 4. การชี้โดเมนและทำ HTTPS ด้วย Cloudflare (จำเป็นสำหรับ Webhook)

ระบบ Webhook ของ LINE บังคับใช้ `https://` เท่านั้น จึงต้องใช้ Cloudflare มาช่วยเสก HTTPS ให้ IP ของ AWS
1. เข้าไปที่ [Cloudflare.com](https://dash.cloudflare.com/) กด **Add a Site** และใส่โดเมนเนมของคุณ
2. เลือกแพ็กเกจ **Free**
3. ไปเปลี่ยน **Nameserver** ที่เว็บผู้ให้บริการโดเมนของคุณ ให้เป็นของ Cloudflare
4. เมื่ออัปเดตเสร็จแล้ว ไปที่เมนู **DNS -> Records** ใน Cloudflare
5. กด **Add record**:
   - **Type:** `A`
   - **Name:** `@` (หรือชื่อซับโดเมนตามต้องการ)
   - **IPv4 address:** ใส่ `IP Address ของ AWS` (เช่น 43.211.28.232)
   - **Proxy status:** เปิดเมฆสีส้ม (Proxied) 🟠
   - กด Save
6. ไปที่เมนู **SSL/TLS -> Overview** เลือกระดับความปลอดภัยเป็น **Flexible**

---

## 5. การเชื่อมต่อ Webhook ใน LINE Developers

1. เข้าไปที่ [LINE Developers Console](https://developers.line.biz/)
2. ไปที่แชนเนลของคุณ -> แท็บ **Messaging API**
3. เลื่อนหา **Webhook settings**
4. กด Edit ตรง **Webhook URL** แล้วใส่ลิงก์โดเมนของคุณ (อย่าลืมเติม `/webhook` ต่อท้าย):
   - `https://yourdomain.com/webhook`
5. กด **Update** -> กด **Verify** (ต้องขึ้น Success)
6. เปิดสวิตช์ **Use webhook** ให้เป็นแถบสีเขียว 🟢

**🎉 สิ้นสุดการตั้งค่า ระบบพร้อมทำงาน 100%!**
