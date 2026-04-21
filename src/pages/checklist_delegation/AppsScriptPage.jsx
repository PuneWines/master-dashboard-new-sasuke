import React, { useState } from "react";

// A helper page that shows a complete Google Apps Script you can copy/paste
// into your Script Editor. It includes the clear logic for Column K (Actual)
// when receiving actualDate: "" and clearActual: true from your frontend.
export default function AppsScriptPage() {
  const [copied, setCopied] = useState(false);

  const gasCode = `/**
 * Google Apps Script endpoint for Pune Wines Delegation app
 * - Supports: doGet (fetch data), doPost (uploadFile, updateTaskData, updateSalesData, updateAdminDone)
 * - IMPORTANT: Clears Column K when clearActual === true AND actualDate === ""
 */

function doGet(e) {
  try {
    var params = e.parameter;

    if (params.sheet && params.action === 'fetch') {
      return fetchSheetData(params.sheet);
    } else if (params.sheet) {
      return fetchSheetData(params.sheet);
    }

    return ContentService.createTextOutput("Google Apps Script is running.")
      .setMimeType(ContentService.MimeType.TEXT);
  } catch (error) {
    console.error("Error in doGet:", error);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function fetchSheetData(sheetName) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      throw new Error("Sheet not found: " + sheetName);
    }

    var range = sheet.getDataRange();
    var values = range.getValues();

    var result = {
      table: {
        cols: [
          {label: "Timestamp", type: "string"},
          {label: "Task ID", type: "string"},
          {label: "Firm", type: "string"},
          {label: "Given By", type: "string"},
          {label: "Name", type: "string"},
          {label: "Task Description", type: "string"},
          {label: "Task End Date", type: "string"},
          {label: "Freq", type: "string"},
          {label: "Enable Reminders", type: "string"},
          {label: "Require Attachment", type: "string"},
          {label: "Task End Date", type: "string"},
          {label: "Column L", type: "string"},
          {label: "Status", type: "string"},
          {label: "Remarks", type: "string"},
          {label: "Uploaded Image", type: "string"}
        ],
        rows: values.map(function(row) {
          return { c: row.map(function(cell) { return { v: cell }; }) };
        })
      }
    };

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    console.error("Error fetching sheet data:", error);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function convertDateToGoogleSheets(dateValue) {
  try {
    if (dateValue instanceof Date) return dateValue;
    if (typeof dateValue === 'number') return new Date(dateValue);
    if (typeof dateValue === 'string' && dateValue.trim() !== '') {
      if (dateValue.match(/^\\d{1,2}\\/\\d{1,2}\\/\\d{4}\\s\\d{1,2}:\\d{2}$/)) {
        var parts = dateValue.split(' ');
        var d = parts[0].split('/');
        var t = parts[1].split(':');
        return new Date(parseInt(d[2]), parseInt(d[1]) - 1, parseInt(d[0]), parseInt(t[0]), parseInt(t[1]));
      }
      if (dateValue.match(/^\\d{1,2}\\/\\d{1,2}\\/\\d{4}$/)) {
        var dd = dateValue.split('/');
        return new Date(parseInt(dd[2]), parseInt(dd[1]) - 1, parseInt(dd[0]));
      }
      if (dateValue.match(/^\\d{4}-\\d{2}-\\d{2}$/)) {
        return new Date(dateValue + 'T00:00:00');
      }
    }
    return dateValue;
  } catch (error) {
    console.error("Error converting date:", error);
    return dateValue;
  }
}

function doPost(e) {
  try {
    var params = e.parameter;

    if (params.action === 'uploadFile') {
      var base64Data = params.base64Data;
      var fileName = params.fileName;
      var mimeType = params.mimeType;
      var folderId = params.folderId;
      if (!base64Data || !fileName || !mimeType || !folderId) {
        throw new Error("Missing required parameters for file upload");
      }
      var fileUrl = uploadFileToDrive(base64Data, fileName, mimeType, folderId);
      return ContentService.createTextOutput(JSON.stringify({ success: true, fileUrl: fileUrl }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (params.action === 'updateTaskData') {
      return updateTaskData(params);
    }

    if (params.action === 'updateSalesData') {
      return updateSalesData(params);
    }

    if (params.action === 'updateAdminDone') {
      var sheetName = params.sheetName;
      var rowDataString = params.rowData;
      if (!sheetName || !rowDataString) throw new Error("Missing required parameters for updateAdminDone");
      var result = updateAdminDone(sheetName, rowDataString);
      return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
    }

    if (params.action === 'clearActualColumn') {
      var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(params.sheetName);
      var rowIndex = Number(params.rowIndex);
      if (!sheet) throw new Error("Sheet not found");
      if (!rowIndex || rowIndex < 2) throw new Error("Invalid rowIndex");
      sheet.getRange(rowIndex, 11).clearContent();
      return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
    }

    throw new Error("Unknown action: " + params.action);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: String(error) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function updateTaskData(params) {
  try {
    var sheetName = params.sheetName;
    var rowDataArray = JSON.parse(params.rowData);
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    if (!sheet) throw new Error("Sheet not found: " + sheetName);

    var updateResults = [];

    rowDataArray.forEach(function(taskData, index) {
      var rowIndex = Number(taskData.rowIndex);
      if (!rowIndex || rowIndex < 2) throw new Error("Invalid row index: " + taskData.rowIndex);

      var currentTaskId = sheet.getRange(rowIndex, 2).getValue();
      if (String(currentTaskId).trim() !== String(taskData.taskId).trim()) {
        var correctRow = findRowByTaskId(sheet, taskData.taskId);
        if (correctRow > 0) rowIndex = correctRow; else throw new Error("Task ID mismatch for " + taskData.taskId);
      }

      var rowUpdates = { rowIndex: rowIndex, taskId: taskData.taskId, updates: [] };

      // CLEAR Column K when actualDate === "" and clearActual === true
      if (taskData.clearActual === true && taskData.actualDate === "") {
        sheet.getRange(rowIndex, 11).clearContent();
        rowUpdates.updates.push("Column K (Actual) cleared");
      } else if (taskData.actualDate != null && taskData.actualDate !== "") {
        var actualCell = sheet.getRange(rowIndex, 11);
        var convertedDate = convertDateToGoogleSheets(taskData.actualDate);
        actualCell.setValue(convertedDate);
        actualCell.setNumberFormat('dd/mm/yyyy');
        rowUpdates.updates.push("Column K (Actual): " + taskData.actualDate);
      }

      if (taskData.status !== undefined) {
        sheet.getRange(rowIndex, 13).setValue(taskData.status); // Column M
        rowUpdates.updates.push("Column M (Status): " + taskData.status);
      }
      if (taskData.remarks !== undefined) {
        sheet.getRange(rowIndex, 14).setValue(taskData.remarks); // Column N
        rowUpdates.updates.push("Column N (Remarks): " + taskData.remarks);
      }
      if (taskData.imageUrl !== undefined) {
        sheet.getRange(rowIndex, 15).setValue(taskData.imageUrl); // Column O
        rowUpdates.updates.push("Column O (Image): " + taskData.imageUrl);
      }

      updateResults.push(rowUpdates);
    });

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: "Task data updated successfully",
      updatedRows: rowDataArray.length,
      updateDetails: updateResults
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: String(error) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function updateSalesData(params) {
  // keep your existing implementation here if you use it
  return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'noop' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function updateAdminDone(sheetName, rowDataString) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  var rowDataArray = JSON.parse(rowDataString);
  var updates = [];

  rowDataArray.forEach(function(item) {
    var rowIndex = Number(item.rowIndex);
    if (!rowIndex || rowIndex < 2) throw new Error("Invalid row index in updateAdminDone");

    // Column P (16) in your UI mapping was Admin Done; adjust if needed
    sheet.getRange(rowIndex, 16).setValue(item.adminDoneStatus || 'Done');
    updates.push({ rowIndex: rowIndex, taskId: item.taskId, adminDoneStatus: item.adminDoneStatus || 'Done' });
  });

  return { success: true, updatedRows: rowDataArray.length, updateDetails: updates };
}

function findRowByTaskId(sheet, taskId) {
  var lastRow = sheet.getLastRow();
  for (var i = 2; i <= lastRow; i++) {
    if (String(sheet.getRange(i, 2).getValue()).trim() === String(taskId).trim()) return i;
  }
  return -1;
}

function uploadFileToDrive(base64Data, fileName, mimeType, folderId) {
  var bytes = Utilities.base64Decode(base64Data.split(',')[1] || base64Data);
  var blob = Utilities.newBlob(bytes, mimeType, fileName);
  var folder = DriveApp.getFolderById(folderId);
  var file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return file.getUrl();
}
`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(gasCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      setCopied(false);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold text-purple-700">
        Google Apps Script - Copy & Paste
      </h1>
      <p className="text-sm text-gray-600">
        Paste the following code into your Apps Script project. It supports
        clearing Column K when the frontend sends <code>actualDate: ""</code>{" "}
        with <code>clearActual: true</code>.
      </p>

      <div className="flex gap-2">
        <button
          onClick={copy}
          className="px-3 py-2 text-white bg-purple-600 rounded-md hover:bg-purple-700"
        >
          {copied ? "Copied!" : "Copy Code"}
        </button>
      </div>

      <pre className="overflow-auto p-4 text-xs leading-relaxed text-green-200 bg-gray-900 rounded-md">
        <code>{gasCode}</code>
      </pre>
    </div>
  );
}
