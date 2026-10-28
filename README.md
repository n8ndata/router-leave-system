# ROUTER ระบบยื่นใบลา (router-leave-system)

ระบบยื่น/อนุมัติใบลาพนักงาน ฝั่งหน้าเว็บไซต์เดียว (single-file app) + Firebase Realtime Database + ปุ่มสำรองข้อมูลลง Google Sheets ผ่าน Google Apps Script

- เว็บไซต์ใช้งานจริง: https://n8ndata.github.io/router-leave-system/
- ไฟล์หลักของหน้าเว็บ: `index.html` (โค้ด JavaScript ฝังอยู่ในไฟล์เดียวกัน)
- `js/app.js` และ `css/styles.css` ถูกทำให้เป็นเวอร์ชัน "กระจกเงา" (mirror) ของไฟล์ `index.html` เทียบกัน 1:1
- สคริปต์สำรองข้อมูลไป Google Sheets: `google-apps-script/Code.gs`

## Logging การแก้ไข (รอบนี้)

รายการนี้คือสิ่งที่ถูกแก้ไขเรียบร้อยในโค้ดแล้ว

### ด้านความปลอดภัย (Security)

1. **หยุดเก็บรหัสผ่านแบบ plain text**
   - ลบการบันทึก `plainPassword` จากการสร้างบัญชี / แก้ไขบัญชี / เปลี่ยนรหัสผ่านของตนเอง
   - ระบบจะเปิดจอทีเดิมแล้วจะทำการล้างข้อมูล (cleanup) โดยอัตโนมัติ ทั้งลบ `plainPassword` ทิ้งและรวม record ผู้ใช้ชื่อซ้ำเป็นหนึ่งเดียว
   - ตารางจัดการบัญชีไม่เปิดเผยรหัสผ่าน (จะแสดงเป็น "(เก็บแบบเข้ารหัส ไม่แสดง)")
2. **จำกัดสิทธิ**
   - ปุ่ม/สิทธิ "ลบประวัติ" (`delete-history`) อนุญาตเฉพาะโหมดหัวหน้างานหรือผู้ดูแลระบบ (`managerMode || adminMode`)
   - รายการที่อยู่สถานะ "ไม่อนุมัติยกเลิก" (CANCEL_REJECTED) ไม่ให้ลบได้อีกต่อไป (จะยังคงเหลือเป็นประวัติข้อมูล)
3. **คุ้มครอง https endpoint**
   - Google Apps Script URL: เพิ่มระบบ token เสริม (`GSHEET_TOKEN` ฝั่งเว็บ / `WEBHOOK_TOKEN` ฝั่ง Apps Script — ปกติตั้งไว้ว่างจึงปิดการทำงาน) + HTTP fetch timeout 30 วัน
   - รหัสผ่านยังคงถูก hash ด้วย PBKDF2 120,000 รอบ + salt ต่อบัญชี (ตามเดิม)

### ด้านการทำงาน (Functional)

1. **เรียงลำดับรายการลาถูกต้อง** — เดิมเรียงด้วยข้อความวันที่ภาษาไทยที่แสดง (`dd/mm/ค.ศ.ไทย`) ซึ่งเรียงเองแบบไม่ถูกต้อง ปัจจุบันใช้ `submittedAtISO` ที่รูปแบบถูกต้องแทน
2. **สถิติจำนวนวันลาต่อเดือน** — `statsDaysOf()` นับเฉพาะวันที่อยู่ในเดือนที่เลือกรายงาน (กรณีขอจอช่วงข้ามเดือน) + เว้นเสาร์-อาทิตย์ตามตัวช้อยส์
3. **ห้องรออนุมัติ (รายการใหม่)** ไม่นับรายการที่เอาไปรอการอนุมัติการยกเลิกอีกต่อไป (จะไม่แสดงซ้ำ 2 ตาราง)
4. **คิวโควตา (แอดมินกรอกลาแทน)** — กรณีจอช่วงของตัวเอง (`ownOverlap`) นับเป็น "เกินโควตา" และต้องอนุญาต/อธิบายเหตุผล
5. **ไม่อนุมัติการยกเลิก** คืนสถานะหลังบ้านให้กลับไป "อนุมัติ" ให้ถูกต้อง (เดิมถ้าเป็น PENDING จะทำให้สถานะค้างผิด statusBefore ไม่ถูกบันทึกหมด)
6. **อนุมัติ/ไม่อนุมัติ** เพิ่มการบันทึก `processedAtISO` (ใช้เรียง log สำหรับข้อมูลย้อนหลัง)
7. **เพิ่ม field พวกยกเลิก / ไฟล์ CSV** ที่เคยหายไป เพิ่มคอลัมน์เหล่านี้
8. **กันจอซ้ำ (duplicate-request)** สำหรับ URL API แบบ double-insert
9. **แสดงตัวเลือกพนักงานจากฐานข้อมูล("dynamic list")** ไม่ใช้ array เก่าแข็ง (`EMPLOYEE_LIST`)
10. **ลบโค้ดตาย (dead code)** ชุดยืนยันด้วย `employeeCredentials`/`verifyEmployeeTransaction` ที่ไม่ถูกใช้อีกต่อไป — คืนเป็นธีมการ hash แบบหลักในบ้าน `users/` เทียบกัน
11. **แก้ scroll/zoom มือถือ** — หยุดบังคับ `user-scalable=no` (ตามการเข้าถึง i18n ภาษาไทย)

### ด้านคุณภาพ (Quality)

- dedupe change listeners ที่ถูกต่อซ้ำในหน้าจอเลือกพนักงาน
- แก้ double-escape HTML (`escapeHTML` ซ้อนใน `textContent`)

## ขั้นตอนยกระดับความปลอดภัยที่คุณ (เจ้าของระบบ) ต้องทำเอง

### 1) ตั้งค่า Firebase Security Rules (สำคัญมาก — ข้อมูลอยู่แบบเปิด)

ฐานข้อมูลเดี๋ยวนี้อ่าน/เขียนได้โดยสาธารณะ (สิ่งที่ตรวจพบผ่าน REST API โดยไม่ต้อง login)

- เปิด [Firebase Console](https://console.firebase.google.com/) → โปรเจกต์ → **Realtime Database** → **Rules**
- คัดลอกเนื้อหาในไฟล์ `firebase.rules.json` (อยู่ที่ root ของโปรเจกต์นี้) ไปแปะแทนทั้งหมด → กด **Publish**
- กฎชุดนี้ (a) ล็อคฐานข้อมูล default เป็น closed, (b) บังคับ record `users/…` ห้ามมี field `plainPassword` และต้องมี `hash`+`salt` เป็น string — ป้องกันการกลับไปกลับมาบันทึกรหัสผ่านแบบเปิด, (c) ห้ามอ่าน/เขียน `employeeCredentials` (สคริปต์ทิ้งไปใช้ไม่ได้อีกแล้ว)
- **ระยะยาว**: ปกติควรอัปเกรดเป็นระบบ login จริงด้วย Firebase Authentication แล้วเปิดใช้กฎ `auth != null` ด้านล่างเป็นแนวทาง
  - `leaveRequests`, `activityLog`, `users`: อ่าน/เขียนแบบ `auth != null` + ตรวจสอบ token/admin ผ่าน custom claims หรือบัญชีรายการ `users/<key>/role`
  - ตอนนั้นต้องแก้ `index.html` ให้โหลด `firebase-auth-compat.js` และเพิ่ม flow Sign-in จริง

### 2) เปิดใช้ Token ป้องกัน Google Apps Script Web App (แนะนำ)

ระบบทำให้ optional ไว้ให้แล้ว ดูรายละเอียดได้ที่ `google-apps-script/README.md`

### 3) Deploy ผ่าน GitHub Pages

- ขณะนี้เว็บไซต์เสิร์ฟจาก GitHub repository `n8ndata/router-leave-system`
- หลังแก้โค้ด: commit + push ทั้ง `index.html`, `js/app.js`, `css/styles.css` แล้วรอ GitHub Pages rebuild
- ไฟล์ `index.html` เป็นต้นฉบับ (source of truth); ถ้าแก้ JS แบบเดียว ให้ copy ตามไปไว้ทั้งสองแห่งเสมอ
