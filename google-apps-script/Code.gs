/**
 * =========================================================================
 * ROUTER DEPT - ระบบสำรองข้อมูลการลาพนักงานสู่ Google Sheets
 * =========================================================================
 * รองรับ 3 ระบบในตัวเดียวกัน:
 * 1. รับข้อมูล Real-time ผ่าน Web App (เมื่อพนักงานยื่นลา / หัวหน้าอนุมัติ)
 * 2. รับคำสั่งซิงค์ข้อมูลทั้งหมดในคลิกเดียวจากปุ่มบนหน้าระบบ (Sync All)
 * 3. สคริปต์ดึงข้อมูลจาก Firebase อัตโนมัติ (Time-driven trigger / กดจากเมนู)
 */

// URL Firebase Realtime Database ของระบบ
const FIREBASE_DB_URL = "https://leave-system-router-default-rtdb.asia-southeast1.firebasedatabase.app/leaveRequests.json";

// ชื่อแท็บใน Google Sheets ที่ต้องการให้บันทึกข้อมูล
const SHEET_NAME = "คำขอลาพนักงาน";

// หัวตารางคอลัมน์
const HEADERS = [
  "รหัสรายการ (ID)",
  "ชื่อ-นามสกุล",
  "ประเภทการลา",
  "วันที่เริ่มลา",
  "วันที่สิ้นสุด",
  "จำนวนวัน",
  "เหตุผลการลา",
  "สถานะคำขอ",
  "วันที่ส่งคำขอ",
  "วันที่ดำเนินการ",
  "สถานะยกเลิก",
  "เหตุผลขอยกเลิก",
  "วันที่ขอยกเลิก",
  "วันที่อนุมัติยกเลิก",
  "ลงโดยหัวหน้างาน",
  "เกินโควตา",
  "เหตุผลเกินโควตา",
  "อัปเดตล่าสุด"
];

/**
 * สร้างเมนูใน Google Sheets เพื่อให้ผู้ใช้งานกดเรียกใช้งานได้ทันที
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu("🏢 ระบบลางาน ROUTER")
    .addItem("🔄 ซิงค์ข้อมูลทั้งหมดจาก Firebase ทันที", "syncFromFirebase")
    .addSeparator()
    .addItem("⏰ ตั้งเวลาซิงค์อัตโนมัติ (ทุก 1 ชั่วโมง)", "setupHourlyTrigger")
    .addItem("⏰ ตั้งเวลาซิงค์อัตโนมัติ (ทุกวัน เวลา 00:00 - 01:00)", "setupDailyTrigger")
    .addItem("❌ ยกเลิกการตั้งเวลาอัตโนมัติทั้งหมด", "clearAllTriggers")
    .addToUi();
}

/**
 * ดึงแท็บ Sheet หากยังไม่มี ให้สร้างขึ้นมาใหม่พร้อมจัดรูปแบบหัวตาราง
 */
function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  
  // ตรวจสอบแถวที่ 1 หากยังไม่มีหัวตาราง ให้สร้าง
  const firstCell = sheet.getRange(1, 1).getValue();
  if (!firstCell) {
    initHeaderRow(sheet);
  }
  return sheet;
}

/**
 * สร้างและตกแต่งหัวตาราง
 */
function initHeaderRow(sheet) {
  const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
  headerRange.setValues([HEADERS]);
  headerRange.setBackground("#0f766e"); // สีเขียวอมฟ้าเข้ม
  headerRange.setFontColor("#ffffff");
  headerRange.setFontWeight("bold");
  headerRange.setHorizontalAlignment("center");
  sheet.setFrozenRows(1);
}

/**
 * แปลงข้อมูล Object คำขอลาเป็น Array สำหรับ 1 แถวใน Sheet
 */
function rowFromRecord(r) {
  const nowStr = Utilities.formatDate(new Date(), "Asia/Bangkok", "dd/MM/yyyy HH:mm:ss");
  return [
    r.id || "",
    r.empName || "",
    r.leaveType || "",
    r.startDate || "",
    r.endDate || "",
    r.leaveDays != null ? Number(r.leaveDays) : "",
    r.reason || "",
    r.status || "รออนุมัติ",
    r.submittedAt || "",
    r.processedAt || "",
    r.cancelStatus || "",
    r.cancelReason || "",
    r.cancelRequestedAt || "",
    r.cancelProcessedAt || "",
    r.managerEntered ? "ใช่" : "ไม่ใช่",
    r.quotaOverride ? "ใช่" : "ไม่ใช่",
    r.quotaOverrideReason || "",
    nowStr
  ];
}

/**
 * -------------------------------------------------------------
 * 1 & 2. WEB APP HANDLER (สำหรับ Real-time และปุ่มซิงค์บนหน้าเว็บ)
 * -------------------------------------------------------------
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({ status: "error", message: "No post data received" });
    }
    
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;
    const sheet = getOrCreateSheet();

    // กรณีที่ 1: ซิงค์ข้อมูลทั้งหมด (Sync All จากปุ่มหน้าระบบ)
    if (action === "sync_all") {
      const records = payload.records || payload.data || [];
      writeAllRecordsToSheet(sheet, records);
      return jsonResponse({ status: "success", count: records.length, message: "Sync all completed" });
    }
    
    // กรณีที่ 2: อัปเดตหรือเพิ่มรายการเดียว (Real-time Upsert)
    if (action === "upsert") {
      const rec = payload.data;
      if (!rec || !rec.id) {
        return jsonResponse({ status: "error", message: "Record has no ID" });
      }
      upsertSingleRecord(sheet, rec);
      return jsonResponse({ status: "success", id: rec.id, message: "Record upserted" });
    }
    
    // กรณีที่ 3: ลบรายการ (Delete)
    if (action === "delete") {
      const id = payload.data ? payload.data.id : null;
      if (id) {
        deleteRecordById(sheet, id);
      }
      return jsonResponse({ status: "success", id: id, message: "Record removed" });
    }

    return jsonResponse({ status: "ignored", message: "Unknown action" });
  } catch (err) {
    Logger.log("doPost Error: " + err.toString());
    return jsonResponse({ status: "error", error: err.toString() });
  }
}

/**
 * รองรับคำขอ GET สำหรับทดสอบว่า Web App ทำงานได้ปกติ
 */
function doGet(e) {
  return ContentService.createTextOutput("Google Apps Script Web App สำหรับระบบลางาน ROUTER พร้อมทำงาน!")
    .setMimeType(ContentService.MimeType.TEXT);
}

/**
 * เขียนข้อมูลทั้งหมดทับตาราง (คงหัวตารางไว้)
 */
function writeAllRecordsToSheet(sheet, records) {
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
  }
  initHeaderRow(sheet);

  if (!records || records.length === 0) return;

  const rows = records.map(r => rowFromRecord(r));
  sheet.getRange(2, 1, rows.length, HEADERS.length).setValues(rows);

  // จัดกึ่งกลางคอลัมน์สำคัญ
  sheet.getRange(2, 4, rows.length, 3).setHorizontalAlignment("center"); // วันที่เริ่ม วันที่สิ้นสุด จำนวนวัน
  sheet.getRange(2, 8, rows.length, 1).setHorizontalAlignment("center"); // สถานะ
  sheet.getRange(2, 11, rows.length, 1).setHorizontalAlignment("center"); // สถานะยกเลิก
}

/**
 * อัปเดตแถวเดิมหากมี ID อยู่แล้ว หรือต่อท้ายแถวใหม่
 */
function upsertSingleRecord(sheet, rec) {
  const rowData = rowFromRecord(rec);
  const lastRow = sheet.getLastRow();
  
  if (lastRow > 1) {
    const idRange = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (let i = 0; i < idRange.length; i++) {
      if (String(idRange[i][0]) === String(rec.id)) {
        const targetRow = i + 2;
        sheet.getRange(targetRow, 1, 1, HEADERS.length).setValues([rowData]);
        return;
      }
    }
  }
  
  // หากไม่พบ ID เดิม ให้เพิ่มแถวใหม่
  sheet.appendRow(rowData);
}

/**
 * ลบรายการออกจาก Sheet ตาม ID
 */
function deleteRecordById(sheet, id) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return;
  
  const idRange = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (let i = 0; i < idRange.length; i++) {
    if (String(idRange[i][0]) === String(id)) {
      const targetRow = i + 2;
      sheet.deleteRow(targetRow);
      return;
    }
  }
}

/**
 * -------------------------------------------------------------
 * 3. ดึงข้อมูลจาก FIREBASE อัตโนมัติ (Automated Pull / Trigger)
 * -------------------------------------------------------------
 */
function syncFromFirebase() {
  const ui = SpreadsheetApp.getActiveSpreadsheet();
  try {
    const options = {
      method: "get",
      muteHttpExceptions: true
    };
    const response = UrlFetchApp.fetch(FIREBASE_DB_URL, options);
    const code = response.getResponseCode();
    if (code !== 200) {
      const errMsg = "ไม่สามารถเชื่อมต่อ Firebase ได้ (HTTP " + code + "): " + response.getContentText();
      Logger.log(errMsg);
      try { SpreadsheetApp.getUi().alert("❌ ข้อผิดพลาด", errMsg, SpreadsheetApp.getUi().ButtonSet.OK); } catch(e){}
      return;
    }

    const data = JSON.parse(response.getContentText());
    const sheet = getOrCreateSheet();

    if (!data) {
      Logger.log("ไม่พบข้อมูลใน Firebase หรือตารางว่างเปล่า");
      writeAllRecordsToSheet(sheet, []);
      try { ui.toast("ไม่พบข้อมูลคำขอลาในระบบ", "แจ้งเตือน", 3); } catch(e){}
      return;
    }

    // แปลง Object จาก Firebase เป็น Array
    const records = Object.entries(data)
      .filter(([id, val]) => val && typeof val === "object")
      .map(([id, val]) => Object.assign({ id }, val))
      .sort((a, b) => String(b.submittedAt || "").localeCompare(String(a.submittedAt || "")));

    writeAllRecordsToSheet(sheet, records);

    const msg = "ดึงข้อมูลจาก Firebase สำเร็จ: ทั้งหมด " + records.length + " รายการ";
    Logger.log(msg);
    try { ui.toast(msg, "สำเร็จ", 5); } catch(e){}
  } catch (err) {
    Logger.log("syncFromFirebase Error: " + err.toString());
    try { SpreadsheetApp.getUi().alert("เกิดข้อผิดพลาดในการดึงข้อมูล: " + err.toString()); } catch(e){}
  }
}

/**
 * -------------------------------------------------------------
 * ตัวช่วยตั้งค่าเวลาอัตโนมัติ (Trigger Management)
 * -------------------------------------------------------------
 */
function setupHourlyTrigger() {
  clearAllTriggers();
  ScriptApp.newTrigger("syncFromFirebase")
    .timeBased()
    .everyHours(1)
    .create();
  SpreadsheetApp.getUi().alert("✅ ตั้งเวลาซิงค์ข้อมูลจาก Firebase อัตโนมัติทุก 1 ชั่วโมงเรียบร้อยแล้ว");
}

function setupDailyTrigger() {
  clearAllTriggers();
  ScriptApp.newTrigger("syncFromFirebase")
    .timeBased()
    .everyDays(1)
    .atHour(0)
    .create();
  SpreadsheetApp.getUi().alert("✅ ตั้งเวลาซิงค์ข้อมูลจาก Firebase อัตโนมัติทุกวัน (เวลาประมาณ 00:00 - 01:00) เรียบร้อยแล้ว");
}

function clearAllTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "syncFromFirebase") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
