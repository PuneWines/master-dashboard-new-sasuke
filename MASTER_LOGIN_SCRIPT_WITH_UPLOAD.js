/**
 * ============================================================
 *   MASTER LOGIN & WHATSAPP SYSTEM — Complete Apps Script
 *   Sheet: "Master Login", "SHOPS", "CONTACTS", "WHATSAPP_HISTORY"
 *   Features: Login, User Management, File Upload, WhatsApp API
 * ============================================================
 */

// Global Configuration
var SHEET_ID = '1bxOa_4GcLPLVsUMNtWm2sL9bO04ThG8P_NsB1TYU3ho';
var LOGIN_TAB_NAME = 'Master Login';
var MASTER_SHEET_NAME = 'MASTER'; // For Shops fallback
var SHOPS_SHEET_NAME = 'SHOPS';
var CONTACTS_SHEET_NAME = 'CONTACTS';
var HISTORY_SHEET_NAME = 'WHATSAPP_HISTORY';

// Column mapping for "Master Login" sheet
var COL = {
  EMPLOYEE_ID: 0,   // A
  USER_NAME: 1,     // B
  DESIGNATION: 2,   // C
  USER_ID: 3,       // D
  PASS: 4,          // E
  ROLE: 5,          // F
  MASTER_PAGE_ACCESS: 6, // G
  TAB_SYSTEM_ACCESS: 7,  // H
  SHOPS_NAME: 8,    // I
  GMAIL_ID: 9,      // J
  NUMBER: 10,       // K
  PHOTO: 11         // L
};

var TOTAL_COLS = 12;

// Google Drive folders
var ADMIN_AVATAR_FOLDER_ID = '145FIQRxwN_omuW2XPHx-Bbk8kFOpzosd';
var WHATSAPP_FILES_FOLDER_ID = '13hi-xRLOEksb7GH9CthczzlNJTWuD4X3'; // Change if needed

/**
 * Helper to safely output JSON/JSONP and force CORS headers
 */
function createResponse(data, e) {
  var callback = e && e.parameter ? e.parameter.callback : null;
  var json = JSON.stringify(data);
  
  if (callback) {
    // Return JSONP for frontend callGAS (script tag injection)
    return ContentService
      .createTextOutput(callback + "(" + json + ")")
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  } else {
    // Return standard JSON
    return ContentService
      .createTextOutput(json)
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handle GET Requests (Fetch data, Login, WhatsApp Shops/History)
 */
function doGet(e) {
  try {
    var params = e.parameter || {};
    var action = (params.action || '').trim();

    // 1. WhatsApp: Get Shop Names
    if (action === 'getShopNames') {
      return createResponse(getShopNames(), e);
    }

    // 2. WhatsApp: Get Contacts by Shop
    if (action === 'getContactsByShop') {
      return createResponse(getContactsByShop(params.shopName), e);
    }

    // 3. WhatsApp: Get History
    if (action === 'getHistory') {
      return createResponse(getHistory(), e);
    }

    // 4. User System: Fetch Sheet Data
    if (action === 'fetch') {
      var sheetName = params.sheet || LOGIN_TAB_NAME;
      var data = fetchSheetDataInternal(sheetName);
      return createResponse(data, e);
    }

    // 5. User System: Fetch All Users
    if (action === 'fetchUsers') {
      return createResponse(fetchAllUsersInternal(), e);
    }

    // 6. User System: Login
    if (params.username && params.password) {
      return createResponse(processLoginInternal(params.username, params.password), e);
    }

    return createResponse({ success: false, error: 'No valid action provided.' }, e);
  } catch (err) {
    return createResponse({ success: false, error: 'doGet error: ' + err.toString() }, e);
  }
}

/**
 * Handle POST Requests (Create/Update Users, Upload Files, Save WhatsApp Record)
 */
function doPost(e) {
  try {
    var payload = {};
    if (e.postData && e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
      } catch (_) {
        payload = {};
      }
    }

    // If payload is empty, try e.parameter (form data)
    if (Object.keys(payload).length === 0 && e.parameter) {
      payload = e.parameter;
      if (payload.data && typeof payload.data === 'string') {
        try { payload.data = JSON.parse(payload.data); } catch (_) { }
      }
      if (payload.rowData && typeof payload.rowData === 'string') {
        try { payload.rowData = JSON.parse(payload.rowData); } catch (_) { }
      }
    }

    var action = payload.action || '';

    // WhatsApp Actions
    if (action === 'submitFormData') return createResponse(submitFormDataInternal(payload), e);
    if (action === 'addNewContact') return createResponse(addNewContactInternal(payload), e);

    // User System Actions
    if (action === 'uploadFile') return createResponse(uploadFileToDriveInternal(payload), e);
    if (action === 'updateCell') return createResponse(updateCellInSheetInternal(payload), e);
    if (action === 'createUser') return createResponse(createUserInternal(payload.data || {}), e);
    if (action === 'updateUser') return createResponse(updateUserInternal(payload.id, payload.data || {}), e);
    if (action === 'deleteUser') return createResponse(deleteUserInternal(payload.id), e);

    // Login Fallback
    if (payload.username !== undefined && payload.password !== undefined) {
      return createResponse(processLoginInternal(payload.username, payload.password), e);
    }

    return createResponse({ success: false, error: 'No valid action in POST. Action: ' + action }, e);
  } catch (err) {
    return createResponse({ success: false, error: 'doPost error: ' + err.toString() }, e);
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// WHATSAPP LOGIC
// ──────────────────────────────────────────────────────────────────────────────

function getShopNames() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(SHOPS_SHEET_NAME) || ss.getSheetByName(MASTER_SHEET_NAME);
  if (!sheet) return [];
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  var data = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  var shops = data.map(function(r) { return String(r[0]).trim(); }).filter(Boolean);
  return shops.filter(function(v, i, a) { return a.indexOf(v) === i; }).sort();
}

function getContactsByShop(shopName) {
  if (!shopName) return [];
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(CONTACTS_SHEET_NAME);
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  
  var contacts = [];
  for (var i = 1; i < data.length; i++) {
    // Assuming: A=ShopName, B=Name, C=Number
    if (String(data[i][0]).trim() === String(shopName).trim()) {
      contacts.push([i, data[i][1], data[i][2]]); 
    }
  }
  return contacts;
}

function getHistory() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(HISTORY_SHEET_NAME);
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  return data.slice(1); // Return everything except header
}

function addNewContactInternal(payload) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(CONTACTS_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(CONTACTS_SHEET_NAME);
    sheet.appendRow(['Shop Name', 'Contact Name', 'Number']);
  }
  sheet.appendRow([payload.shopName, payload.name, payload.number]);
  return { success: true, message: 'Contact added' };
}

function submitFormDataInternal(payload) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(HISTORY_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(HISTORY_SHEET_NAME);
    sheet.appendRow(['Timestamp', 'Shop Name', 'Message', 'Names', 'Numbers', 'Status', 'File Link']);
  }

  var fileUrl = '';
  if (payload.file && payload.file.data) {
    var uploadRes = uploadFileToDriveInternal({
      base64Data: payload.file.data,
      fileName: payload.file.name,
      mimeType: payload.file.type,
      folderId: WHATSAPP_FILES_FOLDER_ID
    });
    if (uploadRes.success) fileUrl = uploadRes.fileUrl;
  }

  var timestamp = Utilities.formatDate(new Date(), "GMT+5:30", "yyyy-MM-dd HH:mm:ss");
  sheet.appendRow([
    timestamp,
    payload.shopName || '',
    payload.message || '',
    payload.names || '',
    payload.numbers || '',
    'Sent', // Default status
    fileUrl
  ]);

  return { success: true, fileUrl: fileUrl, message: 'Record saved' };
}

// ──────────────────────────────────────────────────────────────────────────────
// USER SYSTEM LOGIC (INTERNAL HELPERS)
// ──────────────────────────────────────────────────────────────────────────────

function fetchSheetDataInternal(sheetName) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return { success: false, error: 'Sheet not found' };
  return { success: true, data: sheet.getDataRange().getValues() };
}

function fetchAllUsersInternal() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(LOGIN_TAB_NAME);
  if (!sheet) return { success: false, error: "Sheet not found" };
  var allData = sheet.getDataRange().getValues();
  var users = [];
  for (var i = 1; i < allData.length; i++) {
    var row = allData[i];
    if (row.every(function(cell) { return String(cell).trim() === ''; })) continue;
    var u = getUserFieldByIndex(row);
    users.push({
      id: i, employee_id: u.employee_id, user_name: u.user_name, designation: u.designation,
      user_id: u.user_id, password: u.password, role: u.role, email_id: u.email_id,
      number: u.number, shops_name: u.shops_name, 
      master_page_access: (u.master_page_access.toLowerCase() === 'all' ? ['All'] : u.master_page_access.split(',').map(function(s){return s.trim();}).filter(Boolean)),
      tab_system_access: parseTabAccess(u.tab_system_access),
      admin_photo: u.photo
    });
  }
  return { success: true, data: users };
}

function processLoginInternal(inputId, inputPass) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(LOGIN_TAB_NAME);
  var allData = sheet.getDataRange().getValues();
  for (var i = 1; i < allData.length; i++) {
    var row = allData[i];
    if (String(row[COL.USER_ID]).trim() === String(inputId).trim() && String(row[COL.PASS]).trim() === String(inputPass).trim()) {
      var u = getUserFieldByIndex(row);
      var role = u.role.toLowerCase();
      var access = role === 'admin' ? 'all' : [u.master_page_access, u.tab_system_access].filter(Boolean).join(',');
      return { success: true, user_name: u.user_name, role: u.role, employee_id: u.employee_id, page_access: access, photo: u.photo };
    }
  }
  return { success: false, error: 'Invalid Credentials' };
}

function uploadFileToDriveInternal(payload) {
  try {
    var folder = DriveApp.getFolderById(payload.folderId || ADMIN_AVATAR_FOLDER_ID);
    var blob = Utilities.newBlob(Utilities.base64Decode(payload.base64Data), payload.mimeType || 'image/jpeg', payload.fileName || 'file');
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    var fileId = file.getId();
    // Return original URL in the format requested: {https://drive.google.com/open?id=...}
    var fileUrl = '{https://drive.google.com/open?id=' + fileId + '}';
    
    return { success: true, fileUrl: fileUrl, fileId: fileId };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

function updateCellInSheetInternal(payload) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(payload.sheetName);
  if (!sheet) return { success: false, error: 'Sheet not found' };
  sheet.getRange(parseInt(payload.rowIndex), parseInt(payload.columnIndex)).setValue(payload.value);
  SpreadsheetApp.flush();
  return { success: true, message: 'Cell updated' };
}

function createUserInternal(d) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(LOGIN_TAB_NAME);
  sheet.appendRow(prepareRowArray(d));
  return { success: true };
}

function updateUserInternal(id, d) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(LOGIN_TAB_NAME);
  sheet.getRange(parseInt(id) + 1, 1, 1, TOTAL_COLS).setValues([prepareRowArray(d)]);
  return { success: true };
}

function deleteUserInternal(id) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(LOGIN_TAB_NAME);
  sheet.deleteRow(parseInt(id) + 1);
  return { success: true };
}

// ──────────────────────────────────────────────────────────────────────────────
// CORE HELPERS
// ──────────────────────────────────────────────────────────────────────────────

function prepareRowArray(d) {
  var row = new Array(TOTAL_COLS).fill('');
  row[COL.EMPLOYEE_ID] = d.employee_id || '';
  row[COL.USER_NAME] = d.user_name || '';
  row[COL.DESIGNATION] = d.designation || '';
  row[COL.USER_ID] = d.user_id || '';
  row[COL.PASS] = d.password || '';
  row[COL.ROLE] = d.role || 'Employee';
  row[COL.MASTER_PAGE_ACCESS] = Array.isArray(d.master_page_access) ? d.master_page_access.join(',') : '';
  row[COL.TAB_SYSTEM_ACCESS] = formatTabAccessInternal(d.tab_system_access);
  row[COL.SHOPS_NAME] = d.shops_name || '';
  row[COL.GMAIL_ID] = d.email_id || '';
  row[COL.NUMBER] = d.number || '';
  row[COL.PHOTO] = d.photo || d.photo_url || d.admin_photo || '';
  return row;
}

function getUserFieldByIndex(row) {
  return {
    employee_id: String(row[COL.EMPLOYEE_ID] || '').trim(), 
    user_name: String(row[COL.USER_NAME] || '').trim(),
    designation: String(row[COL.DESIGNATION] || '').trim(), 
    user_id: String(row[COL.USER_ID] || '').trim(),
    password: String(row[COL.PASS] || '').trim(), 
    role: String(row[COL.ROLE] || '').trim(),
    master_page_access: String(row[COL.MASTER_PAGE_ACCESS] || '').trim(), 
    tab_system_access: String(row[COL.TAB_SYSTEM_ACCESS] || '').trim(),
    shops_name: String(row[COL.SHOPS_NAME] || '').trim(), 
    email_id: String(row[COL.GMAIL_ID] || '').trim(),
    number: String(row[COL.NUMBER] || '').trim(),
    photo: String(row[COL.PHOTO] || '').trim()
  };
}

function formatTabAccessInternal(access) {
  if (!access || typeof access !== 'object') return '';
  return Object.entries(access)
    .filter(function(e) { return Array.isArray(e[1]) && e[1].length > 0; })
    .map(function(e) { return e[0] + ' : ' + e[1].join(','); })
    .join('; ');
}

function parseTabAccess(raw) {
  var res = {};
  if (!raw || raw.toLowerCase() === 'all') return res;
  raw.split(';').forEach(function(e) {
    var parts = e.split(':');
    if (parts.length < 2) return;
    var page = parts[0].trim();
    var tabs = parts[1].split(',').map(function(t){return t.trim();}).filter(Boolean);
    if (page && tabs.length > 0) res[page] = tabs;
  });
  return res;
}
