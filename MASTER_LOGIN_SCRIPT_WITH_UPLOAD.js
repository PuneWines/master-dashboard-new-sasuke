/**
 * ============================================================
 *   MASTER LOGIN SYSTEM — Complete Apps Script
 *   Sheet: "Master Login"
 *   PLUS: File Upload & Cell Update functionality
 * ============================================================
 */

// Use var to prevent "Identifier has already been declared" global scope errors in GAS
var SHEET_ID = '1bxOa_4GcLPLVsUMNtWm2sL9bO04ThG8P_NsB1TYU3ho';
var LOGIN_TAB_NAME = 'Master Login';

// MASTER sheet is in the SAME spreadsheet
var MASTER_SHEET_NAME = 'MASTER';

var COL = {
  EMPLOYEE_ID: 0,   // A
  USER_NAME: 1,   // B
  DESIGNATION: 2,   // C
  USER_ID: 3,   // D
  PASS: 4,   // E
  ROLE: 5,   // F
  MASTER_PAGE_ACCESS: 6,   // G
  TAB_SYSTEM_ACCESS: 7,   // H
  SHOPS_NAME: 8,   // I
  GMAIL_ID: 9,   // J
  NUMBER: 10   // K
};

var TOTAL_COLS = 11;

// Google Drive folder for admin avatars
var ADMIN_AVATAR_FOLDER_ID = '145FIQRxwN_omuW2XPHx-Bbk8kFOpzosd';

// Helper to safely output JSON and force CORS headers natively in Apps Script
function createResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  try {
    var params = e.parameter || {};
    var action = (params.action || '').trim();

    // Handle fetch action for any sheet
    if (action === 'fetch') {
      var sheetName = params.sheet || 'Master Login';
      return fetchSheetData(sheetName);
    }

    if (action === 'fetchUsers') return fetchAllUsers();
    if (params.username && params.password) return processLogin(String(params.username).trim(), String(params.password).trim());

    return createResponse({ success: false, error: 'No valid action provided.' });
  } catch (err) {
    return createResponse({ success: false, error: 'doGet error: ' + err.toString() });
  }
}

function doPost(e) {
  try {
    var payload = {};

    // Try to parse JSON first
    if (e.postData && e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
      } catch (_) {
        // If JSON parsing fails, check if it's form data
        payload = {};
      }
    }

    // If payload is empty, try e.parameter (form data)
    if (Object.keys(payload).length === 0 && e.parameter) {
      payload = e.parameter;
      if (payload.data) {
        try { payload.data = JSON.parse(payload.data); } catch (_) { }
      }
    }

    Logger.log('doPost payload action: ' + (payload.action || 'none'));
    Logger.log('doPost payload keys: ' + Object.keys(payload).join(', '));

    // Handle new actions for Admin Avatar Upload
    if (payload.action === 'uploadFile') return uploadFileToDrive(payload);
    if (payload.action === 'updateCell') return updateCellInSheet(payload);

    if (payload.action === 'createUser') return createUser(payload.data || {});
    if (payload.action === 'updateUser') return updateUser(payload.id, payload.data || {});
    if (payload.action === 'deleteUser') return deleteUser(payload.id);

    if (payload.username !== undefined || payload.password !== undefined) {
      return processLogin(String(payload.username || '').trim(), String(payload.password || '').trim());
    }

    return createResponse({ success: false, error: 'No valid action in POST. Action: ' + (payload.action || 'undefined') });
  } catch (err) {
    return createResponse({ success: false, error: 'doPost error: ' + err.toString() });
  }
}

/**
 * ============================================================
 *   NEW: Fetch Sheet Data (for any sheet)
 * ============================================================
 */
function fetchSheetData(sheetName) {
  try {
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      return createResponse({ success: false, error: 'Sheet not found: ' + sheetName });
    }

    var data = sheet.getDataRange().getValues();

    return createResponse({
      success: true,
      data: data,
      sheetName: sheetName,
      message: 'Data fetched successfully'
    });

  } catch (err) {
    Logger.log('Fetch sheet error: ' + err.toString());
    return createResponse({ success: false, error: 'Fetch failed: ' + err.toString() });
  }
}

/**
 * ============================================================
 *   NEW: Upload File to Google Drive
 * ============================================================
 */
function uploadFileToDrive(payload) {
  try {
    var base64Data = payload.base64Data;
    var fileName = payload.fileName || 'uploaded_file';
    var mimeType = payload.mimeType || 'image/jpeg';
    var folderId = payload.folderId || ADMIN_AVATAR_FOLDER_ID;

    if (!base64Data) {
      return createResponse({ success: false, error: 'No base64 data provided' });
    }

    // Decode base64 data
    var decodedBytes = Utilities.base64Decode(base64Data);
    var blob = Utilities.newBlob(decodedBytes, mimeType, fileName);

    // Get folder and create file
    var folder = DriveApp.getFolderById(folderId);
    var file = folder.createFile(blob);

    // Make file publicly accessible (anyone with link can view)
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    var fileUrl = file.getUrl();
    var fileId = file.getId();

    return createResponse({
      success: true,
      fileUrl: fileUrl,
      fileId: fileId,
      fileName: fileName,
      message: 'File uploaded successfully'
    });

  } catch (err) {
    Logger.log('Upload error: ' + err.toString());
    return createResponse({ success: false, error: 'Upload failed: ' + err.toString() });
  }
}

/**
 * ============================================================
 *   NEW: Update Cell in Sheet
 * ============================================================
 */
function updateCellInSheet(payload) {
  try {
    var sheetName = payload.sheetName;
    var rowIndex = parseInt(payload.rowIndex);
    var columnIndex = parseInt(payload.columnIndex);
    var value = payload.value;

    if (!sheetName || !rowIndex || !columnIndex) {
      return createResponse({
        success: false,
        error: 'Missing required parameters: sheetName, rowIndex, columnIndex'
      });
    }

    // Open the spreadsheet (MASTER sheet is in the same spreadsheet)
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      return createResponse({ success: false, error: 'Sheet not found: ' + sheetName });
    }

    Logger.log('Updating cell: Row=' + rowIndex + ', Col=' + columnIndex + ', Value=' + value);

    // Update the cell (rowIndex and columnIndex are 1-based)
    var cell = sheet.getRange(rowIndex, columnIndex);
    cell.setValue(value);

    // Force flush to ensure the change is saved immediately
    SpreadsheetApp.flush();

    return createResponse({
      success: true,
      message: 'Cell updated successfully',
      sheetName: sheetName,
      rowIndex: rowIndex,
      columnIndex: columnIndex,
      value: value
    });

  } catch (err) {
    Logger.log('Update cell error: ' + err.toString());
    return createResponse({ success: false, error: 'Update failed: ' + err.toString() });
  }
}

/**
 * ============================================================
 *   EXISTING FUNCTIONS (UNCHANGED)
 * ============================================================
 */

function processLogin(inputId, inputPass) {
  if (!inputId || !inputPass) return createResponse({ success: false, error: 'User Id and Password required.' });

  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(LOGIN_TAB_NAME);
  if (!sheet) return createResponse({ success: false, error: "Sheet not found." });

  var allData = sheet.getDataRange().getValues();
  if (allData.length < 2) return createResponse({ success: false, error: 'No user data.' });

  var userRow = null;
  for (var i = 1; i < allData.length; i++) {
    var row = allData[i];
    if (String(row[COL.USER_ID] || '').trim() === inputId && String(row[COL.PASS] || '').trim() === inputPass) {
      userRow = row; break;
    }
  }

  if (!userRow) return createResponse({ success: false, error: 'Invalid Credentials.' });

  var u = getUserFieldByIndex(userRow);
  var role = u.role.toLowerCase();
  var pageAccess = role === 'admin' ? 'all' : [u.master_page_access, u.tab_system_access].filter(Boolean).join(',');

  return createResponse({
    success: true, user_name: u.user_name, employee_id: u.employee_id, role: u.role,
    designation: u.designation, shop_name: u.shops_name, email_id: u.email_id,
    number: u.number, page_access: pageAccess
  });
}

function fetchAllUsers() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(LOGIN_TAB_NAME);
  if (!sheet) return createResponse({ success: false, error: "Sheet not found." });

  var allData = sheet.getDataRange().getValues();
  var users = [];

  for (var i = 1; i < allData.length; i++) {
    var row = allData[i];
    if (row.every(function (cell) { return String(cell).trim() === ''; })) continue;

    var u = getUserFieldByIndex(row);
    var masterArr = (u.master_page_access && u.master_page_access.toLowerCase() === 'all')
      ? ['All'] : (u.master_page_access ? u.master_page_access.split(',').map(function (s) { return s.trim(); }).filter(Boolean) : []);

    users.push({
      id: i, employee_id: u.employee_id, user_name: u.user_name, designation: u.designation,
      user_id: u.user_id, password: u.password, role: u.role, email_id: u.email_id,
      number: u.number, shops_name: u.shops_name, master_page_access: masterArr,
      tab_system_access: parseTabAccess(u.tab_system_access)
    });
  }
  return createResponse({ success: true, data: users });
}

function createUser(d) {
  try {
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sheet = ss.getSheetByName(LOGIN_TAB_NAME);
    if (!sheet) return createResponse({ success: false, error: "Sheet not found." });

    var rowData = prepareRowArray(d);
    sheet.appendRow(rowData);
    return createResponse({ success: true, message: 'User created' });
  } catch (e) {
    return createResponse({ success: false, error: e.toString() });
  }
}

function updateUser(id, d) {
  try {
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sheet = ss.getSheetByName(LOGIN_TAB_NAME);
    if (!sheet) return createResponse({ success: false, error: "Sheet not found." });

    var rowIndex = parseInt(id) + 1; // Since id is index 'i' from fetchAllUsers, and rows are 1-based
    var rowData = prepareRowArray(d);

    sheet.getRange(rowIndex, 1, 1, TOTAL_COLS).setValues([rowData]);
    return createResponse({ success: true, message: 'User updated' });
  } catch (e) {
    return createResponse({ success: false, error: e.toString() });
  }
}

function deleteUser(id) {
  try {
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sheet = ss.getSheetByName(LOGIN_TAB_NAME);
    if (!sheet) return createResponse({ success: false, error: "Sheet not found." });

    var rowIndex = parseInt(id) + 1;
    sheet.deleteRow(rowIndex);
    return createResponse({ success: true, message: 'User deleted' });
  } catch (e) {
    return createResponse({ success: false, error: e.toString() });
  }
}

/** 
 * Helper to convert object data into an array matching the column order 
 */
function prepareRowArray(d) {
  var masterStr = Array.isArray(d.master_page_access) ? d.master_page_access.join(',') : '';
  var tabStr = (d.tab_system_access && typeof d.tab_system_access === 'object') ?
    Object.entries(d.tab_system_access)
      .filter(function (entry) { return Array.isArray(entry[1]) && entry[1].length > 0; })
      .map(function (entry) { return entry[0] + ' : ' + entry[1].join(','); })
      .join('; ') : '';

  var row = new Array(TOTAL_COLS).fill('');
  row[COL.EMPLOYEE_ID] = d.employee_id || '';
  row[COL.USER_NAME] = d.user_name || '';
  row[COL.DESIGNATION] = d.designation || '';
  row[COL.USER_ID] = d.user_id || '';
  row[COL.PASS] = d.password || '';
  row[COL.ROLE] = d.role || 'Employee';
  row[COL.MASTER_PAGE_ACCESS] = masterStr;
  row[COL.TAB_SYSTEM_ACCESS] = tabStr;
  row[COL.SHOPS_NAME] = d.shops_name || '';
  row[COL.GMAIL_ID] = d.email_id || '';
  row[COL.NUMBER] = d.number || '';
  return row;
}

function getUserFieldByIndex(row) {
  return {
    employee_id: String(row[COL.EMPLOYEE_ID] || '').trim(), user_name: String(row[COL.USER_NAME] || '').trim(),
    designation: String(row[COL.DESIGNATION] || '').trim(), user_id: String(row[COL.USER_ID] || '').trim(),
    password: String(row[COL.PASS] || '').trim(), role: String(row[COL.ROLE] || '').trim(),
    master_page_access: String(row[COL.MASTER_PAGE_ACCESS] || '').trim(), tab_system_access: String(row[COL.TAB_SYSTEM_ACCESS] || '').trim(),
    shops_name: String(row[COL.SHOPS_NAME] || '').trim(), email_id: String(row[COL.GMAIL_ID] || '').trim(),
    number: String(row[COL.NUMBER] || '').trim()
  };
}

function parseTabAccess(raw) {
  var result = {};
  if (!raw || raw.toLowerCase() === 'all') return result;
  raw.split(';').forEach(function (entry) {
    var colonIdx = entry.indexOf(':');
    if (colonIdx === -1) return;
    var page = entry.substring(0, colonIdx).trim();
    var tabs = entry.substring(colonIdx + 1).split(',').map(function (t) { return t.trim(); }).filter(Boolean);
    if (page && tabs.length > 0) result[page] = tabs;
  });
  return result;
}
