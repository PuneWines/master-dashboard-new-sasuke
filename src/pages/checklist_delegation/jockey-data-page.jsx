"use client";

import { useState, useEffect } from "react";
import {
  CheckCircle2,
  Upload,
  X,
  Search,
  History,
  ArrowLeft,
  Calendar,
  Check,
} from "lucide-react";
import AdminLayout from "../../components/checklist_delegation/AdminLayout";
import LoadingSpinner from "../../components/checklist_delegation/LoadingSpinner";
import LoadingOverlay from "../../components/checklist_delegation/LoadingOverlay";

import DeleteButton from "../../components/checklist_delegation/DeleteButton";
import ReactDOM from "react-dom";

// Configuration object - Move all configurations here
const CONFIG = {
  // Google Apps Script URL
  APPS_SCRIPT_URL:
    "https://script.google.com/macros/s/AKfycbyBPTmVksbejNrOPNZNHYajQWWLbzA34hshoAPYig99hcqkYuiKy-j5pavsuqeFKIXNFg/exec",

  // Google Drive folder ID for file uploads
  DRIVE_FOLDER_ID: "1fhwpde9ROtn2Kr_-lgT2n6_1cvasrAQt",

  // Sheet name to work with
  SHEET_NAME: "JOCKEY",

  // Page configuration
  PAGE_CONFIG: {
    title: "Jockey Task Data",
    historyTitle: "Jockey Task History",
    description: "Showing today, tomorrow's tasks and past due tasks",
    historyDescription:
      "Read-only view of completed tasks with submission history",
  },
};

function JockeyDataPage() {
  const [accountData, setAccountData] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [sheetHeaders, setSheetHeaders] = useState([]);
  const [additionalData, setAdditionalData] = useState({});
  const [remarksData, setRemarksData] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState([]);
  const [historyData, setHistoryData] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [membersList, setMembersList] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedHistoryItems, setSelectedHistoryItems] = useState([]);
  const [markingAsDone, setMarkingAsDone] = useState(false);
  const [isDeletingHistory, setIsDeletingHistory] = useState(false);
  const [userRole, setUserRole] = useState("");
  const [confirmationModal, setConfirmationModal] = useState({
    isOpen: false,
    itemCount: 0,
  });

  // Format date as DD/MM/YYYY
  const formatDateToDDMMYYYY = (date) => {
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Check if a value is empty or null
  const isEmpty = (value) => {
    return (
      value === null ||
      value === undefined ||
      (typeof value === "string" && value.trim() === "")
    );
  };

  // Safe access to cell value
  const getCellValue = (row, index) => {
    if (!row || !row.c || index >= row.c.length) return null;
    const cell = row.c[index];
    return cell && "v" in cell ? cell.v : null;
  };

  useEffect(() => {
    const role = sessionStorage.getItem("role");
    setUserRole(role || "");
  }, []);

  // Parse Google Sheets Date format into a proper date string
  const parseGoogleSheetsDate = (dateStr) => {
    if (!dateStr) return "";

    if (typeof dateStr === "string" && dateStr.startsWith("Date(")) {
      // Handle Google Sheets Date(year,month,day) format
      const match = /Date\((\d+),(\d+),(\d+)\)/.exec(dateStr);
      if (match) {
        const year = parseInt(match[1], 10);
        const month = parseInt(match[2], 10); // 0-indexed in Google's format
        const day = parseInt(match[3], 10);

        // Format as DD/MM/YYYY
        return `${day.toString().padStart(2, "0")}/${(month + 1)
          .toString()
          .padStart(2, "0")}/${year}`;
      }
    }

    // If it's already in DD/MM/YYYY format, return as is
    if (typeof dateStr === "string" && dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      return dateStr;
    }

    // If we get here, try to parse as a date and format
    try {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return formatDateToDDMMYYYY(date);
      }
    } catch (e) {
      console.error("Error parsing date:", e);
    }

    // Return original if parsing fails
    return dateStr;
  };

  // Parse date from DD/MM/YYYY format
  const parseDateFromDDMMYYYY = (dateStr) => {
    if (!dateStr || typeof dateStr !== "string") return null;
    const parts = dateStr.split("/");
    if (parts.length !== 3) return null;
    return new Date(parts[2], parts[1] - 1, parts[0]);
  };

  // Format date from yyyy-mm-dd to DD/MM/YYYY
  const formatDateFromHTML = (dateStr) => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length !== 3) return "";
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  // Custom date sorting function
  const sortDateWise = (a, b) => {
    // Ensure we're looking at column H (index 7)
    const dateStrA = a["col7"] || "";
    const dateStrB = b["col7"] || "";

    const dateA = parseDateFromDDMMYYYY(dateStrA);
    const dateB = parseDateFromDDMMYYYY(dateStrB);

    // Handle cases where dates might be null or invalid
    if (!dateA) return 1;
    if (!dateB) return -1;

    // Compare dates directly
    return dateA.getTime() - dateB.getTime();
  };

  // Reset all filters
  const resetFilters = () => {
    setSearchTerm("");
    setSelectedMembers([]);
    setStartDate("");
    setEndDate("");
  };

  // Update filteredAccountData calculation
  const filteredAccountData = searchTerm
    ? accountData
      .filter((account) =>
        Object.values(account).some(
          (value) =>
            value &&
            value.toString().toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
      .sort(sortDateWise)
    : accountData.sort(sortDateWise);

  // Update filteredHistoryData calculation to include member and date filtering
  const filteredHistoryData = historyData
    .filter((item) => {
      // Text search filter
      const matchesSearch = searchTerm
        ? Object.values(item).some(
          (value) =>
            value &&
            value.toString().toLowerCase().includes(searchTerm.toLowerCase())
        )
        : true;

      // Member filter (Column E - index 4)
      const matchesMember =
        selectedMembers.length > 0
          ? selectedMembers.includes(item["col4"])
          : true;

      // Date range filter (Column M - index 12)
      let matchesDateRange = true;
      if (startDate || endDate) {
        const itemDate = parseDateFromDDMMYYYY(item["col12"]);

        if (!itemDate) return false;

        if (startDate) {
          const startDateObj = new Date(startDate);
          startDateObj.setHours(0, 0, 0, 0);
          if (itemDate < startDateObj) matchesDateRange = false;
        }

        if (endDate) {
          const endDateObj = new Date(endDate);
          endDateObj.setHours(23, 59, 59, 999);
          if (itemDate > endDateObj) matchesDateRange = false;
        }
      }

      return matchesSearch && matchesMember && matchesDateRange;
    })
    .sort((a, b) => {
      // Sort by submission date (Column M - index 12)
      const dateStrA = a["col12"] || "";
      const dateStrB = b["col12"] || "";
      const dateA = parseDateFromDDMMYYYY(dateStrA);
      const dateB = parseDateFromDDMMYYYY(dateStrB);
      // Most recent first
      if (!dateA) return 1;
      if (!dateB) return -1;
      return dateB.getTime() - dateA.getTime();
    });

  // Calculate task statistics for history view
  const getTaskStatistics = () => {
    // Calculate total tasks completed
    const totalCompleted = historyData.length;

    // If members are selected, calculate tasks by selected members
    const memberStats =
      selectedMembers.length > 0
        ? selectedMembers.reduce((stats, member) => {
          const memberTasks = historyData.filter(
            (task) => task["col4"] === member
          ).length;
          return {
            ...stats,
            [member]: memberTasks,
          };
        }, {})
        : {};

    // Calculate total of filtered tasks (when search and/or member filters are applied)
    const filteredTotal = filteredHistoryData.length;

    return {
      totalCompleted,
      memberStats,
      filteredTotal,
    };
  };

  // Handle member selection function with checkboxes
  const handleMemberSelection = (member) => {
    setSelectedMembers((prev) => {
      // If member is already selected, remove it, otherwise add it
      if (prev.includes(member)) {
        return prev.filter((item) => item !== member);
      } else {
        return [...prev, member];
      }
    });
  };

  // Handle delete actual date for specific row in history table
  const handleDeleteActual = async (itemId, rowIndex) => {
    try {
      // Show confirmation dialog
      const confirmDelete = window.confirm(
        "Are you sure you want to clear the Actual date for this task? This action cannot be undone."
      );

      if (!confirmDelete) return;

      // Prepare data to clear col12 (Actual column) for this specific row
      const formData = new FormData();
      formData.append("sheetName", "JOCKEY");
      formData.append("action", "clearActualColumn");
      formData.append("rowIndex", rowIndex.toString());
      formData.append("taskId", itemId);

      const response = await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!result.success) {
        const errMsg = (result.error || "").toLowerCase();
        if (errMsg.includes("unknown action")) {
          // Fallback: use updateSalesData with empty todayDate (Column M)
          const fd = new FormData();
          fd.append("sheetName", "JOCKEY");
          fd.append("action", "updateSalesData");
          fd.append(
            "rowData",
            JSON.stringify([
              {
                taskId: itemId,
                rowIndex: rowIndex,
                additionalInfo: "",
                imageData: null,
                imageUrl: "",
                todayDate: "", // clear Actual (M)
                doneStatus: "",
              },
            ])
          );

          const resp = await fetch(APPS_SCRIPT_URL, {
            method: "POST",
            body: fd,
          });
          const resJson = await resp.json();
          if (!resJson.success) {
            throw new Error(
              resJson.error ||
              "Failed to clear Actual date using fallback method"
            );
          }
        } else {
          throw new Error(result.error || "Failed to clear actual date");
        }
      }

      // Refresh data so the row moves back to Pending
      await fetchSheetData();
      setSuccessMessage("Actual date cleared successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error("Error clearing actual date:", error);
      alert("Failed to clear actual date: " + error.message);
    }
  };

  // Modified handleMarkMultipleDone function
  const handleMarkMultipleDone = async () => {
    if (selectedHistoryItems.length === 0) {
      setSuccessMessage("Please select at least one item to mark as done");
      return;
    }

    if (markingAsDone) return;

    // Open confirmation modal
    setConfirmationModal({
      isOpen: true,
      itemCount: selectedHistoryItems.length,
    });
  };

  // Confirmation modal component
  const ConfirmationModal = ({ isOpen, itemCount, onConfirm, onCancel }) => {
    if (!isOpen) return null;

    return (
      <div className="flex fixed inset-0 z-50 justify-center items-center bg-black bg-opacity-50">
        <div className="p-6 mx-4 w-full max-w-md bg-white rounded-lg shadow-xl">
          <div className="flex justify-center items-center mb-4">
            <div className="p-3 mr-4 text-yellow-600 bg-yellow-100 rounded-full">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-800">
              Mark Items as Done
            </h2>
          </div>

          <p className="mb-6 text-center text-gray-600">
            Are you sure you want to mark {itemCount}{" "}
            {itemCount === 1 ? "item" : "items"} as done?
          </p>

          <div className="flex justify-center space-x-4">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md transition-colors hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 text-white bg-green-600 rounded-md transition-colors hover:bg-green-700"
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Confirmation handler
  const confirmMarkDone = async () => {
    // Close the modal
    setConfirmationModal({ isOpen: false, itemCount: 0 });

    setMarkingAsDone(true);

    try {
      // Prepare submission data for multiple items
      const submissionData = selectedHistoryItems.map((historyItem) => ({
        taskId: historyItem._id,
        rowIndex: historyItem._rowIndex,
        additionalInfo: "", // Additional info column (Column O)
        imageData: null, // No new image
        imageUrl: "", // Column P
        todayDate: "", // Column M
        doneStatus: "DONE", // Specifically for Column Q
      }));

      const formData = new FormData();
      formData.append("sheetName", "JOCKEY");
      formData.append("action", "updateSalesData");
      formData.append("rowData", JSON.stringify(submissionData));

      const response = await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        // Remove the marked tasks from history data
        setHistoryData((prev) =>
          prev.filter(
            (item) =>
              !selectedHistoryItems.some(
                (selectedItem) => selectedItem._id === item._id
              )
          )
        );

        // Clear selected items
        setSelectedHistoryItems([]);

        setSuccessMessage(
          `Successfully marked ${selectedHistoryItems.length} items as done!`
        );

        // Refresh data after a short delay
        setTimeout(() => {
          fetchSheetData();
        }, 2000);
      } else {
        throw new Error(result.error || "Failed to mark items as done");
      }
    } catch (error) {
      console.error("Error marking tasks as done:", error);
      setSuccessMessage(`Failed to mark tasks as done: ${error.message}`);
    } finally {
      setMarkingAsDone(false);
    }
  };

  // NEW: Clear Actual (Column K) for selected history items
  const handleHistoryDelete = async () => {
    const selectedHistoryItemsArray = Array.from(selectedHistoryItems);

    if (selectedHistoryItemsArray.length === 0) {
      alert("Please select at least one item to delete Actual date (Column K)");
      return;
    }

    const confirmClear = window.confirm(
      "This will clear the Actual date (Column K) for the selected record(s). Data will NOT be deleted. Continue?"
    );
    if (!confirmClear) return;

    setIsDeletingHistory(true);
    try {
      // Strategy: Use empty string to clear Column K
      const rowDataClear = selectedHistoryItemsArray
        .map((item) => {
          if (!item) return null;
          return {
            taskId: item._id,
            rowIndex: item._rowIndex,
            clearActual: true,
            actualDate: "",
          };
        })
        .filter(Boolean);

      if (rowDataClear.length > 0) {
        const formData = new FormData();
        formData.append("sheetName", "JOCKEY");
        formData.append("action", "updateTaskData");
        formData.append("rowData", JSON.stringify(rowDataClear));

        const response = await fetch(APPS_SCRIPT_URL, {
          method: "POST",
          body: formData,
          mode: "cors",
          headers: { Accept: "application/json" },
        });

        if (response.ok) {
          const responseText = await response.text();
          let result;
          try {
            result = JSON.parse(responseText);
          } catch (parseError) {
            if (responseText.toLowerCase().includes("success")) {
              result = { success: true, message: responseText };
            } else {
              throw new Error(`Invalid response: ${responseText}`);
            }
          }

          if (result.success) {
            // Give Apps Script a moment to update, then refresh
            await new Promise((resolve) => setTimeout(resolve, 2000));
            await fetchSheetData();

            setSelectedHistoryItems([]);
            setSuccessMessage(
              `Successfully cleared Actual date (Column K) for ${selectedHistoryItemsArray.length} item(s). Items moved back to pending tasks.`
            );
            setTimeout(() => setSuccessMessage(""), 5000);
          } else {
            throw new Error(result.error || "Failed to clear Actual date");
          }
        } else {
          throw new Error("Failed to clear Actual date");
        }
      }
    } catch (error) {
      alert("Error clearing Actual date: " + error.message);
    } finally {
      setIsDeletingHistory(false);
    }
  };

  // Fetch sheet data function
  const fetchSheetData = async () => {
    try {
      setLoading(true);
      // Clear existing data before fetching to prevent duplicates
      const pendingAccounts = [];
      const historyRows = [];

      const response = await fetch(
        `https://docs.google.com/spreadsheets/d/1a1jPYstX2Wy778hD9OpM_PZkYE3KGktL0JxSL8dJiTY/gviz/tq?tqx=out:json&sheet=JOCKEY`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.status}`);
      }

      const text = await response.text();
      const jsonStart = text.indexOf("{");
      const jsonEnd = text.lastIndexOf("}");
      const jsonString = text.substring(jsonStart, jsonEnd + 1);
      const data = JSON.parse(jsonString);

      const username = sessionStorage.getItem("username");
      const userRole = sessionStorage.getItem("role");

      // Extract headers
      const headers = data.table.cols
        .map((col, index) => ({
          id: `col${index}`,
          label: col.label || `Column ${index + 1}`,
          type: col.type,
        }))
        .filter((header) => header.label !== "");

      setSheetHeaders(headers);

      // Get today and tomorrow's dates
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);

      const todayStr = formatDateToDDMMYYYY(today);
      const tomorrowStr = formatDateToDDMMYYYY(tomorrow);

      console.log("Filtering dates:", { todayStr, tomorrowStr });

      // Debugging array to track row filtering
      const debugRows = [];

      // Track all unique members for filtering
      const membersSet = new Set();

      // Process all rows
      data.table.rows.forEach((row, rowIndex) => {
        if (rowIndex === 0) return;

        // For non-admin users, filter by username in Column E (index 4)
        const assignedTo = getCellValue(row, 4) || "Unassigned";
        membersSet.add(assignedTo); // Add to members list for dropdown

        const isUserMatch =
          userRole === "admin" ||
          assignedTo.toLowerCase() === username.toLowerCase();

        // If not a match and not admin, skip this row
        if (!isUserMatch && userRole !== "admin") return;

        // Safely get values from columns L, M, P, and Q
        const columnLValue = getCellValue(row, 11);
        const columnMValue = getCellValue(row, 12);
        const columnPValue = getCellValue(row, 15);
        const columnQValue = getCellValue(row, 16);

        // Skip rows marked as DONE in column Q
        if (columnQValue && columnQValue.toString().trim() === "DONE") {
          return;
        }

        // Convert column L value to string and format properly
        let rowDateStr = columnLValue ? String(columnLValue).trim() : "";
        let formattedRowDate = parseGoogleSheetsDate(rowDateStr);

        // Create row data object
        const rowData = {
          _id: Math.random().toString(36).substring(2, 15),
          _rowIndex: rowIndex + 2, // +2 for header row and 1-indexing
        };

        // Populate row data dynamically with proper date formatting
        headers.forEach((header, index) => {
          const cellValue = getCellValue(row, index);

          // If this is a date column, format properly
          if (
            header.type === "date" ||
            (cellValue && String(cellValue).startsWith("Date("))
          ) {
            rowData[header.id] = cellValue
              ? parseGoogleSheetsDate(String(cellValue))
              : "";
          } else if (
            header.type === "number" &&
            cellValue !== null &&
            cellValue !== ""
          ) {
            // Handle numeric values
            rowData[header.id] = cellValue;
          } else {
            // Handle all other values
            rowData[header.id] = cellValue !== null ? cellValue : "";
          }
        });

        // Check if column L is not null/empty and column M is null/empty
        const hasColumnL = !isEmpty(columnLValue);
        const isColumnMEmpty = isEmpty(columnMValue);

        // For pending tasks: Column L is not null and column M is null
        if (hasColumnL && isColumnMEmpty) {
          // Filter for today and tomorrow OR past dates
          if (
            formattedRowDate === todayStr ||
            formattedRowDate === tomorrowStr ||
            parseDateFromDDMMYYYY(formattedRowDate) <= today
          ) {
            debugRows.push({
              rowIndex,
              hasColumnL,
              isColumnMEmpty,
              formattedRowDate,
              todayStr,
              tomorrowStr,
              matches:
                formattedRowDate === todayStr ||
                formattedRowDate === tomorrowStr,
            });

            pendingAccounts.push(rowData);
          }
        }
        // For history: Both column L and M are not null
        else if (hasColumnL && !isColumnMEmpty) {
          historyRows.push(rowData);
        }
      });

      // Set debug information for display
      setDebugInfo(debugRows);

      // Set members list from all unique values in column E
      setMembersList(Array.from(membersSet).sort());

      // Set account data and history data separately to avoid duplication
      setAccountData(pendingAccounts);
      setHistoryData(historyRows);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching sheet data:", error);
      setError("Failed to load account data");
      setLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchSheetData();
  }, []);

  const handleSelectItem = (id) => {
    setSelectedItems((prev) => {
      const isSelected = prev.includes(id);
      if (isSelected) {
        const newAdditionalData = { ...additionalData };
        delete newAdditionalData[id];
        setAdditionalData(newAdditionalData);
        return prev.filter((itemId) => itemId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // Handle image upload
  const handleImageUpload = async (id, e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Store file in state temporarily
    setAccountData((prev) =>
      prev.map((item) => (item._id === id ? { ...item, image: file } : item))
    );
  };

  // Convert file to base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  // Handle toggle history view
  const toggleHistory = () => {
    setShowHistory((prev) => !prev);
    resetFilters(); // Reset all filters when toggling views
  };

  // Handle submit selected items
  const handleSubmit = async () => {
    const selectedItemsArray = Array.from(selectedItems);

    if (selectedItemsArray.length === 0) {
      alert("Please select at least one item to submit");
      return;
    }

    const missingRemarks = selectedItemsArray.filter((id) => {
      const additionalStatus = additionalData[id];
      const remarks = remarksData[id];
      return additionalStatus === "No" && (!remarks || remarks.trim() === "");
    });

    if (missingRemarks.length > 0) {
      alert(
        `Please provide remarks for items marked as "No". ${missingRemarks.length} item(s) are missing remarks.`
      );
      return;
    }

    const missingRequiredImages = selectedItemsArray.filter((id) => {
      const item = accountData.find((account) => account._id === id);
      const requiresAttachment =
        item["col9"] && item["col9"].toUpperCase() === "YES";
      return requiresAttachment && !item.image;
    });

    if (missingRequiredImages.length > 0) {
      alert(
        `Please upload images for all required attachments. ${missingRequiredImages.length} item(s) are missing required images.`
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const today = new Date();
      // Format the date as DD/MM/YYYY HH:MM:SS
      const day = today.getDate().toString().padStart(2, "0");
      const month = (today.getMonth() + 1).toString().padStart(2, "0");
      const year = today.getFullYear();
      const hours = today.getHours().toString().padStart(2, "0");
      const minutes = today.getMinutes().toString().padStart(2, "0");
      const seconds = today.getSeconds().toString().padStart(2, "0");
      const todayFormatted = `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;

      // Now handle the background submission to Google Sheets
      const submissionData = await Promise.all(
        selectedItemsArray.map(async (id) => {
          const item = accountData.find((account) => account._id === id);

          let imageUrl = "";

          if (item.image instanceof File) {
            try {
              const base64Data = await fileToBase64(item.image);

              const uploadFormData = new FormData();
              uploadFormData.append("action", "uploadFile");
              uploadFormData.append("base64Data", base64Data);
              uploadFormData.append(
                "fileName",
                `task_${item["col1"]}_${Date.now()}.${item.image.name
                  .split(".")
                  .pop()}`
              );
              uploadFormData.append("mimeType", item.image.type);
              uploadFormData.append("folderId", CONFIG.DRIVE_FOLDER_ID);

              const uploadResponse = await fetch(CONFIG.APPS_SCRIPT_URL, {
                method: "POST",
                body: uploadFormData,
              });

              const uploadResult = await uploadResponse.json();
              if (uploadResult.success) {
                imageUrl = uploadResult.fileUrl;
              }
            } catch (uploadError) {
              console.error("Error uploading image:", uploadError);
            }
          }

          return {
            taskId: item["col1"],
            rowIndex: item._rowIndex,
            actualDate: todayFormatted,
            status: additionalData[id] || "",
            remarks: remarksData[id] || "",
            imageUrl: imageUrl,
          };
        })
      );

      // Submit to Google Sheets
      const formData = new FormData();
      formData.append("sheetName", CONFIG.SHEET_NAME);
      formData.append("action", "updateTaskData");
      formData.append("rowData", JSON.stringify(submissionData));

      const response = await fetch(CONFIG.APPS_SCRIPT_URL, {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        // Prepare submitted items for history
        const submittedItemsForHistory = selectedItemsArray.map((id) => {
          const item = accountData.find((account) => account._id === id);
          const subData = submissionData.find(d => d.taskId === item["col1"] && d.rowIndex === item._rowIndex);
          return {
            ...item,
            col10: todayFormatted,
            col12: additionalData[id] || "",
            col13: remarksData[id] || "",
            col14: subData.imageUrl || (item.image && typeof item.image === "string" ? item.image : ""),
          };
        });

        // UPDATE state ONLY AFTER success
        setAccountData((prev) =>
          prev.filter((item) => !selectedItemsArray.includes(item._id))
        );

        setHistoryData((prev) => [...submittedItemsForHistory, ...prev]);

        // Clear selections and form data
        setSelectedItems([]);
        setAdditionalData({});
        setRemarksData({});

        setSuccessMessage(
          `Successfully processed ${selectedItemsArray.length} task records! Data posted to sheet.`
        );

        // Auto-clear success message after 5 seconds
        setTimeout(() => {
          setSuccessMessage("");
        }, 5000);
      } else {
        throw new Error(result.error || "Failed to post data to sheet");
      }
    } catch (error) {
      console.error("Submission error:", error);
      alert("Error submitting data: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminLayout>
      <LoadingOverlay loading={isSubmitting} />
      <div className="space-y-6">
        <div className="flex flex-col gap-4 justify-between sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold tracking-tight text-purple-700">
              {showHistory
                ? CONFIG.PAGE_CONFIG.historyTitle
                : CONFIG.PAGE_CONFIG.title}
            </h1>
            {(isSubmitting || isSubmittingHistory) && (
              <LoadingSpinner />
            )}
          </div>


          <div className="flex space-x-4">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 text-gray-400 transform -translate-y-1/2"
                size={18}
              />
              <input
                type="text"
                placeholder={
                  showHistory ? "Search history..." : "Search transactions..."
                }
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="py-2 pr-4 pl-10 rounded-md border border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* History Toggle Button */}
            {userRole === "admin" && (
              <button
                onClick={toggleHistory}
                className="px-4 py-2 text-white bg-gradient-to-r from-blue-500 to-indigo-600 rounded-md hover:from-blue-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                {showHistory ? (
                  <div className="flex items-center">
                    <ArrowLeft className="mr-1 w-4 h-4" />
                    <span>Back to Tasks</span>
                  </div>
                ) : (
                  <div className="flex items-center">
                    <History className="mr-1 w-4 h-4" />
                    <span>View History</span>
                  </div>
                )}
              </button>
            )}

            {/* Delete Button - Only show in history view */}
            {showHistory && (
              <DeleteButton
                onClick={handleHistoryDelete}
                disabled={selectedHistoryItems.length === 0 || isDeletingHistory}
                loading={isDeletingHistory}
              />
            )}

            {/* Submit Button - Only show when not in history view */}
            {!showHistory && (
              <button
                onClick={handleSubmit}
                disabled={selectedItems.length === 0 || isSubmitting}
                className="px-4 py-2 text-white bg-gradient-to-r from-purple-600 to-pink-600 rounded-md hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting
                  ? "Processing..."
                  : `Submit Selected (${selectedItems.length})`}
              </button>
            )}

            {/* Submit Button for History View - Only show when items are selected */}
            {showHistory && selectedHistoryItems.length > 0 && (
              <div className="fixed right-10 top-40 z-50">
                <button
                  onClick={handleMarkMultipleDone}
                  disabled={markingAsDone}
                  className="px-4 py-2 text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {markingAsDone
                    ? "Processing..."
                    : `Mark ${selectedHistoryItems.length} Items as Done`}
                </button>
              </div>
            )}
          </div>
        </div>

        {successMessage && (
          <div className="flex justify-between items-center px-4 py-3 text-green-700 bg-green-50 rounded-md border border-green-200">
            <div className="flex items-center">
              <CheckCircle2 className="mr-2 w-5 h-5 text-green-500" />
              {successMessage}
            </div>
            <button
              onClick={() => setSuccessMessage("")}
              className="text-green-500 hover:text-green-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        <div className="overflow-hidden bg-white rounded-lg border border-purple-200 shadow-md">
          <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-100">
            <h2 className="font-medium text-purple-700">
              {showHistory ? "Completed Admin Records" : "Admin Records"}
            </h2>
            <p className="text-sm text-purple-600">
              {showHistory
                ? "Showing all completed records with submission dates"
                : "Showing today and tomorrow's records with pending submissions"}
            </p>
          </div>

          {loading ? (
            <div className="py-10 text-center">
              <div className="inline-block mb-4 w-8 h-8 rounded-full border-t-2 border-b-2 border-purple-500 animate-spin"></div>
              <p className="text-purple-600">Loading account data...</p>
            </div>
          ) : error ? (
            <div className="p-4 text-center text-red-800 bg-red-50 rounded-md">
              {error}{" "}
              <button
                className="ml-2 underline"
                onClick={() => window.location.reload()}
              >
                Try again
              </button>
            </div>
          ) : showHistory ? (
            // History Table
            <>
              {/* Filters Section */}
              <div className="p-4 bg-gray-50 border-b border-purple-100">
                <div className="flex flex-wrap gap-4 justify-between items-center">
                  {/* Member filter checkboxes */}
                  <div className="flex flex-col">
                    <div className="flex items-center mb-2">
                      <span className="text-sm font-medium text-purple-700">
                        Filter by Member:
                      </span>
                    </div>
                    <div className="flex overflow-y-auto flex-wrap gap-3 p-2 max-h-32 bg-white rounded-md border border-gray-200">
                      {membersList.map((member, idx) => (
                        <div key={idx} className="flex items-center">
                          <input
                            id={`member-${idx}`}
                            type="checkbox"
                            className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                            checked={selectedMembers.includes(member)}
                            onChange={() => handleMemberSelection(member)}
                          />
                          <label
                            htmlFor={`member-${idx}`}
                            className="ml-2 text-sm text-gray-700"
                          >
                            {member}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Date Range Filter */}
                  <div className="flex flex-col">
                    <div className="flex items-center mb-2">
                      <span className="text-sm font-medium text-purple-700">
                        Filter by Date Range:
                      </span>
                    </div>
                    <div className="flex gap-2 items-center">
                      <div className="flex items-center">
                        <label
                          htmlFor="start-date"
                          className="mr-1 text-sm text-gray-700"
                        >
                          From
                        </label>
                        <input
                          id="start-date"
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="p-1 text-sm rounded-md border border-gray-200"
                        />
                      </div>
                      <div className="flex items-center">
                        <label
                          htmlFor="end-date"
                          className="mr-1 text-sm text-gray-700"
                        >
                          To
                        </label>
                        <input
                          id="end-date"
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="p-1 text-sm rounded-md border border-gray-200"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Clear Filters Button */}
                  {(selectedMembers.length > 0 ||
                    startDate ||
                    endDate ||
                    searchTerm) && (
                      <button
                        onClick={resetFilters}
                        className="px-3 py-1 text-sm text-red-700 bg-red-100 rounded-md hover:bg-red-200"
                      >
                        Clear All Filters
                      </button>
                    )}
                </div>
              </div>
              <ConfirmationModal
                isOpen={confirmationModal.isOpen}
                itemCount={confirmationModal.itemCount}
                onConfirm={confirmMarkDone}
                onCancel={() =>
                  setConfirmationModal({ isOpen: false, itemCount: 0 })
                }
              />

              {/* Task Completion Statistics */}
              <div className="p-4 bg-blue-50 border-b border-purple-100">
                <div className="flex flex-col">
                  <h3 className="mb-2 text-sm font-medium text-blue-700">
                    Task Completion Statistics:
                  </h3>
                  <div className="flex flex-wrap gap-4">
                    <div className="px-3 py-2 bg-white rounded-md shadow-sm">
                      <span className="text-xs text-gray-500">
                        Total Completed
                      </span>
                      <div className="text-lg font-semibold text-blue-600">
                        {getTaskStatistics().totalCompleted}
                      </div>
                    </div>

                    {(selectedMembers.length > 0 ||
                      startDate ||
                      endDate ||
                      searchTerm) && (
                        <div className="px-3 py-2 bg-white rounded-md shadow-sm">
                          <span className="text-xs text-gray-500">
                            Filtered Results
                          </span>
                          <div className="text-lg font-semibold text-blue-600">
                            {getTaskStatistics().filteredTotal}
                          </div>
                        </div>
                      )}

                    {/* Individual member stats */}
                    {selectedMembers.map((member) => (
                      <div
                        key={member}
                        className="px-3 py-2 bg-white rounded-md shadow-sm"
                      >
                        <span className="text-xs text-gray-500">{member}</span>
                        <div className="text-lg font-semibold text-indigo-600">
                          {getTaskStatistics().memberStats[member]}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {/* Add checkbox column as first column */}
                      <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                        <input
                          type="checkbox"
                          className="w-4 h-4 text-green-600 rounded border-gray-300 focus:ring-green-500"
                          checked={
                            filteredHistoryData.length > 0 &&
                            selectedHistoryItems.length ===
                            filteredHistoryData.length
                          }
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedHistoryItems(filteredHistoryData);
                            } else {
                              setSelectedHistoryItems([]);
                            }
                          }}
                        />
                      </th>
                      {/* Render headers for columns B to P - EXCLUDE column N and Q */}
                      {sheetHeaders.slice(1, 13).map((header) => (
                        <th
                          key={header.id}
                          className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider
                            ${header.id === "col11" ? "bg-yellow-50" : ""}
                            ${header.id === "col12" ? "bg-green-50" : ""}
                          `}
                        >
                          {header.label}
                        </th>
                      ))}

                      {/* Skip column N (index 13) and show O and P */}
                      {sheetHeaders.slice(14, 16).map((header) => (
                        <th
                          key={header.id}
                          className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider
                            ${header.id === "col14" ? "bg-blue-50" : ""}
                            ${header.id === "col15" ? "bg-purple-50" : ""}
                          `}
                        >
                          {header.label}
                        </th>
                      ))}
                      <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredHistoryData.length > 0 ? (
                      filteredHistoryData.map((history) => (
                        <tr key={history._id} className="hover:bg-gray-50">
                          {/* Add checkbox in first column */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              className="w-4 h-4 text-green-600 rounded border-gray-300 focus:ring-green-500"
                              checked={selectedHistoryItems.some(
                                (item) => item._id === history._id
                              )}
                              onChange={() => {
                                setSelectedHistoryItems((prev) =>
                                  prev.some((item) => item._id === history._id)
                                    ? prev.filter(
                                      (item) => item._id !== history._id
                                    )
                                    : [...prev, history]
                                );
                              }}
                            />
                          </td>
                          {/* Render data for columns B to M */}
                          {sheetHeaders.slice(1, 13).map((header) => (
                            <td
                              key={header.id}
                              className={`px-6 py-4 whitespace-nowrap
                                ${header.id === "col11" ? "bg-yellow-50" : ""}
                                ${header.id === "col12" ? "bg-green-50" : ""}
                              `}
                            >
                              <div className="text-sm text-gray-900">
                                {history[header.id] || "—"}
                              </div>
                            </td>
                          ))}

                          {/* Skip column N (index 13) and show O and P */}
                          {sheetHeaders.slice(14, 16).map((header) => (
                            <td
                              key={header.id}
                              className={`px-6 py-4 whitespace-nowrap
                                ${header.id === "col14" ? "bg-blue-50" : ""}
                                ${header.id === "col15" ? "bg-purple-50" : ""}
                              `}
                            >
                              <div className="text-sm text-gray-900">
                                {history[header.id] || "—"}
                              </div>
                            </td>
                          ))}

                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() =>
                                handleDeleteActual(
                                  history._id,
                                  history._rowIndex
                                )
                              }
                              className="flex items-center px-3 py-1 text-red-600 rounded-md transition-colors duration-200 hover:text-red-800 hover:bg-red-50"
                              title="Clear Actual Date"
                            >
                              <X className="mr-1 w-4 h-4" />
                              <span className="text-sm">Clear Actual</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={sheetHeaders.length + 2}
                          className="px-6 py-4 text-center text-gray-500"
                        >
                          {searchTerm ||
                            selectedMembers.length > 0 ||
                            startDate ||
                            endDate
                            ? "No historical records matching your filters"
                            : "No completed records found"}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            // Regular Tasks Table
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                        checked={
                          filteredAccountData.length > 0 &&
                          selectedItems.length === filteredAccountData.length
                        }
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedItems(
                              filteredAccountData.map((item) => item._id)
                            );
                          } else {
                            setSelectedItems([]);
                            setAdditionalData({});
                          }
                        }}
                      />
                    </th>
                    {/* Render headers for columns B to K */}
                    {sheetHeaders.slice(1, 11).map((header) => (
                      <th
                        key={header.id}
                        className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase"
                      >
                        {header.label}
                      </th>
                    ))}
                    <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                      Upload Image
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAccountData.length > 0 ? (
                    filteredAccountData.map((account) => (
                      <tr
                        key={account._id}
                        className={`${selectedItems.includes(account._id)
                          ? "bg-purple-50"
                          : ""
                          } hover:bg-gray-50`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                            checked={selectedItems.includes(account._id)}
                            onChange={() => handleSelectItem(account._id)}
                          />
                        </td>
                        {/* Render data for columns B to K */}
                        {sheetHeaders.slice(1, 11).map((header) => (
                          <td
                            key={header.id}
                            className="px-6 py-4 whitespace-nowrap"
                          >
                            <div className="text-sm text-gray-900">
                              {account[header.id] || "—"}
                            </div>
                          </td>
                        ))}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select
                            disabled={!selectedItems.includes(account._id)}
                            value={additionalData[account._id] || ""}
                            onChange={(e) =>
                              setAdditionalData((prev) => ({
                                ...prev,
                                [account._id]: e.target.value,
                              }))
                            }
                            className="px-2 py-1 w-full rounded-md border border-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed"
                          >
                            <option value="">Select...</option>
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                          </select>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {account.image ? (
                            <div className="flex items-center">
                              <img
                                src={
                                  typeof account.image === "string"
                                    ? account.image
                                    : URL.createObjectURL(account.image)
                                }
                                alt="Receipt"
                                className="object-cover mr-2 w-10 h-10 rounded-md"
                              />
                              <div className="flex flex-col">
                                <span className="text-xs text-gray-500">
                                  {account.image instanceof File
                                    ? account.image.name
                                    : "Uploaded Receipt"}
                                </span>
                                {account.image instanceof File ? (
                                  <span className="text-xs text-green-600">
                                    Ready to upload
                                  </span>
                                ) : (
                                  <button
                                    className="text-xs text-purple-600 hover:text-purple-800"
                                    onClick={() =>
                                      window.open(account.image, "_blank")
                                    }
                                  >
                                    View Full Image
                                  </button>
                                )}
                              </div>
                            </div>
                          ) : (
                            <label
                              className={`flex items-center cursor-pointer ${account["col10"]?.toUpperCase() === "YES"
                                ? "text-red-600 font-medium"
                                : "text-purple-600"
                                } hover:text-purple-800`}
                            >
                              <Upload className="mr-1 w-4 h-4" />
                              <span className="text-xs">
                                {account["col10"]?.toUpperCase() === "YES"
                                  ? "Required Upload"
                                  : "Upload Receipt Image"}
                                {account["col10"]?.toUpperCase() === "YES" && (
                                  <span className="ml-1 text-red-500">*</span>
                                )}
                              </span>
                              <input
                                type="file"
                                className="hidden"
                                accept="image/*"
                                onChange={(e) =>
                                  handleImageUpload(account._id, e)
                                }
                                disabled={!selectedItems.includes(account._id)}
                              />
                            </label>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={sheetHeaders.length + 3}
                        className="px-6 py-4 text-center text-gray-500"
                      >
                        {searchTerm
                          ? "No transactions matching your search"
                          : "No pending tasks found for today, tomorrow, or past due dates"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

export default JockeyDataPage;
