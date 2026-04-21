"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  CheckCircle2,
  Upload,
  X,
  Search,
  History,
  ArrowLeft,
} from "lucide-react";
import AdminLayout from "../../components/checklist_delegation/AdminLayout";
import LoadingOverlay from "../../components/checklist_delegation/LoadingOverlay";

// Configuration object - Move all configurations here
const CONFIG = {
  // Google Apps Script URL
  APPS_SCRIPT_URL:
    "https://script.google.com/macros/s/AKfycbyBPTmVksbejNrOPNZNHYajQWWLbzA34hshoAPYig99hcqkYuiKy-j5pavsuqeFKIXNFg/exec",

  // Google Drive folder ID for file uploads
  DRIVE_FOLDER_ID: "16qPUAozo0cBXjs9fBzLhTUA8eMz1eLDt",

  // Sheet names
  SOURCE_SHEET_NAME: "DELEGATION",
  TARGET_SHEET_NAME: "DELEGATION DONE",

  // Page configuration
  PAGE_CONFIG: {
    title: "DELEGATION Tasks",
    historyTitle: "DELEGATION Task History",
    description: "Showing all pending tasks",
    historyDescription:
      "Read-only view of completed tasks with submission history",
  },
};

// Debounce hook for search optimization
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

function DelegationDataPage() {
  const [accountData, setAccountData] = useState([]);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [additionalData, setAdditionalData] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [remarksData, setRemarksData] = useState({});
  const [historyData, setHistoryData] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [statusData, setStatusData] = useState({});
  const [nextTargetDate, setNextTargetDate] = useState({});
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [userRole, setUserRole] = useState("");
  const [username, setUsername] = useState("");
  const [selectedHistoryItems, setSelectedHistoryItems] = useState(new Set());
  const [isDeletingHistory, setIsDeletingHistory] = useState(false);

  // Debounced search term for better performance
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const formatDateToDDMMYYYY = useCallback((date) => {
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }, []);

  // NEW: Function to create a proper date object for Google Sheets
  const createGoogleSheetsDate = useCallback((date) => {
    // Return a Date object that Google Sheets can properly interpret
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }, []);

  // NEW: Function to format date for Google Sheets submission
  const formatDateForGoogleSheets = useCallback((date) => {
    // Create a properly formatted date string that Google Sheets will recognize as a date
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();

    // Return in format that Google Sheets recognizes as date: DD/MM/YYYY
    // But we'll also include the raw date object for better compatibility
    return {
      formatted: `${day}/${month}/${year}`,
      dateObject: new Date(year, date.getMonth(), date.getDate()),
      // ISO format as fallback
      iso: date.toISOString().split("T")[0],
      // Special format for Google Sheets API
      googleSheetsValue: `=DATE(${year},${month},${day})`,
    };
  }, []);

  // NEW: Function to convert DD/MM/YYYY string to Google Sheets date format
  const convertToGoogleSheetsDate = useCallback(
    (dateString) => {
      if (!dateString || typeof dateString !== "string") return "";

      // If already in DD/MM/YYYY format
      if (dateString.includes("/")) {
        const [day, month, year] = dateString.split("/");
        const date = new Date(year, month - 1, day);
        if (!isNaN(date.getTime())) {
          return formatDateForGoogleSheets(date);
        }
      }

      // If in YYYY-MM-DD format (from HTML date input)
      if (dateString.includes("-")) {
        const [year, month, day] = dateString.split("-");
        const date = new Date(year, month - 1, day);
        if (!isNaN(date.getTime())) {
          return formatDateForGoogleSheets(date);
        }
      }

      return {
        formatted: dateString,
        dateObject: null,
        iso: "",
        googleSheetsValue: dateString,
      };
    },
    [formatDateForGoogleSheets]
  );

  const isEmpty = useCallback((value) => {
    return (
      value === null ||
      value === undefined ||
      (typeof value === "string" && value.trim() === "")
    );
  }, []);

  const handleSelectHistoryItem = useCallback((id, isChecked) => {

    setSelectedHistoryItems((prev) => {
      const newSelected = new Set(prev);

      if (isChecked) {
        newSelected.add(id);
      } else {
        newSelected.delete(id);
      }

      return newSelected;
    });
  }, []);

  const handleHistoryCheckboxClick = useCallback(
    (e, id) => {
      e.stopPropagation();
      const isChecked = e.target.checked;
      handleSelectHistoryItem(id, isChecked);
    },
    [handleSelectHistoryItem]
  );

  const handleSelectAllHistoryItems = useCallback(
    (e) => {
      e.stopPropagation();
      const checked = e.target.checked;

      if (checked) {
        const allIds = historyData.map((item) => item._id);
        setSelectedHistoryItems(new Set(allIds));
      } else {
        setSelectedHistoryItems(new Set());
      }
    },
    [historyData]
  );

  const handleHistoryDelete = async () => {
    const selectedHistoryItemsArray = Array.from(selectedHistoryItems);

    if (selectedHistoryItemsArray.length === 0) {
      alert("Please select at least one item to move back to pending");
      return;
    }

    const confirmClear = window.confirm(
      `This will move ${selectedHistoryItemsArray.length} record(s) from history back to pending tasks. Continue?`
    );
    if (!confirmClear) return;

    setIsDeletingHistory(true);

    try {

      const successfulMoves = [];
      const failedMoves = [];

      // Process each selected history item
      for (const id of selectedHistoryItemsArray) {
        const item = historyData.find((h) => h._id === id);
        if (!item) {
          failedMoves.push({ id, error: "Item not found in history data" });
          continue;
        }

        const taskId = item["col1"];
        if (!taskId) {
          failedMoves.push({ id, error: "No Task ID found" });
          continue;
        }


        const formData = new FormData();
        formData.append("sourceSheetName", CONFIG.SOURCE_SHEET_NAME); // DELEGATION
        formData.append("targetSheetName", CONFIG.TARGET_SHEET_NAME); // DELEGATION DONE
        formData.append("action", "clearColumnLAndDeleteHistory");
        formData.append("taskId", taskId);

        try {
          const response = await fetch(CONFIG.APPS_SCRIPT_URL, {
            method: "POST",
            body: formData,
            headers: {
              Accept: "application/json",
            },
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const responseText = await response.text();

          let result;
          try {
            result = JSON.parse(responseText);
          } catch (parseError) {
            // If it's not JSON, check if it contains success message
            if (responseText.toLowerCase().includes("success")) {
              result = { success: true, message: responseText };
            } else {
              throw new Error(`Invalid JSON response: ${responseText}`);
            }
          }

          if (result.success) {
            successfulMoves.push({ id, taskId, message: result.message });
          } else {
            failedMoves.push({
              id,
              taskId,
              error: result.error || "Unknown error",
            });
          }
        } catch (error) {
          console.error(`Error moving task ${taskId} to pending:`, error);
          failedMoves.push({
            id,
            taskId,
            error: error.message,
          });
        }

        // Small delay to avoid overwhelming the server
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      // Update UI based on results
      if (successfulMoves.length > 0) {
        // Remove successfully moved items from history view IMMEDIATELY
        const successfulIds = successfulMoves.map((item) => item.id);
        setHistoryData((prev) =>
          prev.filter((item) => !successfulIds.includes(item._id))
        );

        // Clear selections
        setSelectedHistoryItems(new Set());

        // Show success message
        setSuccessMessage(
          `✅ Successfully moved ${successfulMoves.length} item(s) back to pending tasks.` +
          (failedMoves.length > 0
            ? ` ${failedMoves.length} item(s) failed.`
            : "")
        );

        // Refresh BOTH pending and history data after 2 seconds
        setTimeout(() => {
          fetchSheetData(); // This will refresh both pending and history
        }, 2000);
      }

      if (failedMoves.length > 0) {
        // Show detailed error for failures
        const errorDetails = failedMoves
          .map((f) => `Task ${f.taskId}: ${f.error}`)
          .join("\n");

        alert(`Some items failed to move:\n\n${errorDetails}`);
      }

      setTimeout(() => setSuccessMessage(""), 8000);
    } catch (error) {
      console.error("Move to pending error:", error);
      alert("Error moving items to pending: " + error.message);
    } finally {
      setIsDeletingHistory(false);
    }
  };

  useEffect(() => {
    const role = sessionStorage.getItem("role");
    const user = sessionStorage.getItem("username");
    setUserRole(role || "");
    setUsername(user || "");
  }, []);

  const parseGoogleSheetsDate = useCallback(
    (dateStr) => {
      if (!dateStr) return "";

      // If it's already in DD/MM/YYYY format, return as is
      if (
        typeof dateStr === "string" &&
        dateStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)
      ) {
        // Ensure proper padding for DD/MM/YYYY format
        const parts = dateStr.split("/");
        if (parts.length === 3) {
          const day = parts[0].padStart(2, "0");
          const month = parts[1].padStart(2, "0");
          const year = parts[2];
          // return `${day}/${month}/${year}`;

          return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
        }
        return dateStr;
      }

      // Handle Google Sheets Date() format
      if (typeof dateStr === "string" && dateStr.startsWith("Date(")) {
        const match = /Date\((\d+),(\d+),(\d+)\)/.exec(dateStr);
        if (match) {
          const year = Number.parseInt(match[1], 10);
          const month = Number.parseInt(match[2], 10);
          const day = Number.parseInt(match[3], 10);
          return `${day.toString().padStart(2, "0")}/${(month + 1)
            .toString()
            .padStart(2, "0")}/${year}`;
        }
      }

      // Handle other date formats
      // Handle Date objects and other date formats
      try {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          // Extract time components
          const hours = date.getHours().toString().padStart(2, "0");
          const minutes = date.getMinutes().toString().padStart(2, "0");
          const seconds = date.getSeconds().toString().padStart(2, "0");

          // Return with time if time exists (not midnight)
          if (hours !== "00" || minutes !== "00" || seconds !== "00") {
            const day = date.getDate().toString().padStart(2, "0");
            const month = (date.getMonth() + 1).toString().padStart(2, "0");
            const year = date.getFullYear();
            return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
          }

          // Otherwise just return date
          return formatDateToDDMMYYYY(date);
        }
      } catch (error) {
        console.error("Error parsing date:", error);
      }

      // If all else fails, return the original string
      return dateStr;
    },
    [formatDateToDDMMYYYY]
  );

  const formatDateForDisplay = useCallback(
    (dateStr) => {
      if (!dateStr) return "—";

      // If it's already in proper DD/MM/YYYY format, return as is
      if (
        typeof dateStr === "string" &&
        dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)
      ) {
        return dateStr;
      }

      // Try to parse and reformat
      return parseGoogleSheetsDate(dateStr) || "—";
    },
    [parseGoogleSheetsDate]
  );

  const parseDateFromDDMMYYYY = useCallback((dateStr) => {
    if (!dateStr || typeof dateStr !== "string") return null;
    const parts = dateStr.split("/");
    if (parts.length !== 3) return null;
    return new Date(parts[2], parts[1] - 1, parts[0]);
  }, []);

  const sortDateWise = useCallback(
    (a, b) => {
      const dateStrA = a["col6"] || "";
      const dateStrB = b["col6"] || "";
      const dateA = parseDateFromDDMMYYYY(dateStrA);
      const dateB = parseDateFromDDMMYYYY(dateStrB);
      if (!dateA) return 1;
      if (!dateB) return -1;
      return dateA.getTime() - dateB.getTime();
    },
    [parseDateFromDDMMYYYY]
  );

  const resetFilters = useCallback(() => {
    setSearchTerm("");
    setStartDate("");
    setEndDate("");
  }, []);

  // Get color based on data from column R
  const getRowColor = useCallback((colorCode) => {
    if (!colorCode) return "bg-white";

    const code = colorCode.toString().toLowerCase();
    switch (code) {
      case "red":
        return "bg-red-50 border-l-4 border-red-400";
      case "yellow":
        return "bg-yellow-50 border-l-4 border-yellow-400";
      case "green":
        return "bg-green-50 border-l-4 border-green-400";
      case "blue":
        return "bg-blue-50 border-l-4 border-blue-400";
      default:
        return "bg-white";
    }
  }, []);


  // Optimized filtered data with debounced search
  const filteredAccountData = useMemo(() => {
    const filtered = debouncedSearchTerm
      ? accountData.filter((account) =>
        Object.values(account).some(
          (value) =>
            value &&
            value
              .toString()
              .toLowerCase()
              .includes(debouncedSearchTerm.toLowerCase())
        )
      )
      : accountData;

    return filtered.sort(sortDateWise);
  }, [accountData, debouncedSearchTerm, sortDateWise]);

  // Updated history filtering with user filter based on column H
  const filteredHistoryData = useMemo(() => {
    return historyData
      .filter((item) => {
        // User filter: For non-admin users, check column H (col7) matches username
        const userMatch =
          userRole.toLowerCase().includes("admin") ||
          (item["col7"] &&
            item["col7"].toLowerCase() === username.toLowerCase());

        if (!userMatch) return false;

        const matchesSearch = debouncedSearchTerm
          ? Object.values(item).some(
            (value) =>
              value &&
              value
                .toString()
                .toLowerCase()
                .includes(debouncedSearchTerm.toLowerCase())
          )
          : true;

        let matchesDateRange = true;
        if (startDate || endDate) {
          const itemDate = parseDateFromDDMMYYYY(item["col0"]);
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

        return matchesSearch && matchesDateRange;
      })
      .sort((a, b) => {
        const dateStrA = a["col0"] || "";
        const dateStrB = b["col0"] || "";
        const dateA = parseDateFromDDMMYYYY(dateStrA);
        const dateB = parseDateFromDDMMYYYY(dateStrB);
        if (!dateA) return 1;
        if (!dateB) return -1;
        return dateB.getTime() - dateA.getTime();
      });
  }, [
    historyData,
    debouncedSearchTerm,
    startDate,
    endDate,
    parseDateFromDDMMYYYY,
    userRole,
    username,
  ]);

  // Optimized data fetching with parallel requests
  const fetchSheetData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Parallel fetch both sheets for better performance
      const [mainResponse, historyResponse] = await Promise.all([
        fetch(
          `${CONFIG.APPS_SCRIPT_URL}?sheet=${CONFIG.SOURCE_SHEET_NAME}&action=searchTasks`
        ),
        fetch(
          `${CONFIG.APPS_SCRIPT_URL}?sheet=${CONFIG.TARGET_SHEET_NAME}&action=searchTasks`
        ).catch(() => null),
      ]);

      if (!mainResponse.ok) {
        throw new Error(`Failed to fetch data: ${mainResponse.status}`);
      }

      // Process main data
      const mainText = await mainResponse.text();
      let data;
      try {
        data = JSON.parse(mainText);
      } catch (parseError) {
        const jsonStart = mainText.indexOf("{");
        const jsonEnd = mainText.lastIndexOf("}");
        if (jsonStart !== -1 && jsonEnd !== -1) {
          const jsonString = mainText.substring(jsonStart, jsonEnd + 1);
          data = JSON.parse(jsonString);
        } else {
          throw new Error("Invalid JSON response from server");
        }
      }

      // Process history data if available
      let processedHistoryData = [];
      if (historyResponse && historyResponse.ok) {
        try {
          const historyText = await historyResponse.text();
          let historyData;
          try {
            historyData = JSON.parse(historyText);
          } catch (parseError) {
            const jsonStart = historyText.indexOf("{");
            const jsonEnd = historyText.lastIndexOf("}");
            if (jsonStart !== -1 && jsonEnd !== -1) {
              const jsonString = historyText.substring(jsonStart, jsonEnd + 1);
              historyData = JSON.parse(jsonString);
            }
          }

          if (historyData && historyData.table && historyData.table.rows) {
            processedHistoryData = historyData.table.rows
              .map((row, rowIndex) => {
                if (rowIndex === 0) return null;

                const rowData = {
                  _id: Math.random().toString(36).substring(2, 15),
                  _rowIndex: rowIndex + 2,
                };

                const rowValues = row.c
                  ? row.c.map((cell) =>
                    cell && cell.v !== undefined ? cell.v : ""
                  )
                  : [];

                // Map all columns including column H (col7) for user filtering and column I (col8) for Task
                rowData["col0"] = rowValues[0]
                  ? parseGoogleSheetsDate(String(rowValues[0]))
                  : "";
                rowData["col1"] = rowValues[1] || "";
                rowData["col2"] = rowValues[2] || "";
                rowData["col3"] = rowValues[3] || "";
                rowData["col4"] = rowValues[4] || "";
                rowData["col5"] = rowValues[5] || "";
                rowData["col6"] = rowValues[6] || "";
                rowData["col7"] = rowValues[7] || ""; // Column H - User name
                rowData["col8"] = rowValues[8] || ""; // Column I - Task
                rowData["col9"] = rowValues[9] || ""; // Column J - Given By

                return rowData;
              })
              .filter((row) => row !== null);
          }
        } catch (historyError) {
          console.error("Error processing history data:", historyError);
        }
      }

      setHistoryData(processedHistoryData);

      // Process main delegation data - REMOVED DATE FILTERING
      const currentUsername = sessionStorage.getItem("username");
      const currentUserRole = sessionStorage.getItem("role");

      const pendingAccounts = [];

      let rows = [];
      if (data.table && data.table.rows) {
        rows = data.table.rows;
      } else if (Array.isArray(data)) {
        rows = data;
      } else if (data.values) {
        rows = data.values.map((row) => ({
          c: row.map((val) => ({ v: val })),
        }));
      }

      rows.forEach((row, rowIndex) => {
        if (rowIndex === 0) return; // Skip header row

        let rowValues = [];
        if (row.c) {
          rowValues = row.c.map((cell) =>
            cell && cell.v !== undefined ? cell.v : ""
          );
        } else if (Array.isArray(row)) {
          rowValues = row;
        } else {
          return;
        }

        const assignedTo = rowValues[4] || "Unassigned";
        const isUserMatch =
          currentUserRole.toLowerCase().includes("admin") ||
          assignedTo.toLowerCase() === currentUsername.toLowerCase();
        if (!isUserMatch && !currentUserRole.toLowerCase().includes("admin")) return;

        // Check conditions: Column K not null and Column L null
        const columnKValue = rowValues[10];
        const columnLValue = rowValues[11];

        const hasColumnK = !isEmpty(columnKValue);
        const isColumnLEmpty = isEmpty(columnLValue);

        if (!hasColumnK || !isColumnLEmpty) {
          return;
        }

        // REMOVED DATE FILTERING - Show all data regardless of date

        const googleSheetsRowIndex = rowIndex + 1;
        const taskId = rowValues[1] || "";
        const stableId = taskId
          ? `task_${taskId}_${googleSheetsRowIndex}`
          : `row_${googleSheetsRowIndex}_${Math.random()
            .toString(36)
            .substring(2, 15)}`;

        const rowData = {
          _id: stableId,
          _rowIndex: googleSheetsRowIndex,
          _taskId: taskId,
        };

        // Map all columns
        for (let i = 0; i < 18; i++) {
          if (i === 0 || i === 6 || i === 10) {
            rowData[`col${i}`] = rowValues[i]
              ? parseGoogleSheetsDate(String(rowValues[i]))
              : "";
          } else {
            rowData[`col${i}`] = rowValues[i] || "";
          }
        }

        pendingAccounts.push(rowData);
      });

      setAccountData(pendingAccounts);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching sheet data:", error);
      setError("Failed to load account data: " + error.message);
      setLoading(false);
    }
  }, [
    formatDateToDDMMYYYY,
    parseGoogleSheetsDate,
    parseDateFromDDMMYYYY,
    isEmpty,
  ]);

  useEffect(() => {
    fetchSheetData();
  }, [fetchSheetData]);

  const handleSelectItem = useCallback((id, isChecked) => {
    setSelectedItems((prev) => {
      const newSelected = new Set(prev);

      if (isChecked) {
        newSelected.add(id);
        setStatusData((prevStatus) => ({ ...prevStatus, [id]: "Done" }));
      } else {
        newSelected.delete(id);
        setAdditionalData((prevData) => {
          const newAdditionalData = { ...prevData };
          delete newAdditionalData[id];
          return newAdditionalData;
        });
        setRemarksData((prevRemarks) => {
          const newRemarksData = { ...prevRemarks };
          delete newRemarksData[id];
          return newRemarksData;
        });
        setStatusData((prevStatus) => {
          const newStatusData = { ...prevStatus };
          delete newStatusData[id];
          return newStatusData;
        });
        setNextTargetDate((prevDate) => {
          const newDateData = { ...prevDate };
          delete newDateData[id];
          return newDateData;
        });
      }

      return newSelected;
    });
  }, []);

  const handleCheckboxClick = useCallback(
    (e, id) => {
      e.stopPropagation();
      const isChecked = e.target.checked;
      handleSelectItem(id, isChecked);
    },
    [handleSelectItem]
  );

  const handleSelectAllItems = useCallback(
    (e) => {
      e.stopPropagation();
      const checked = e.target.checked;

      if (checked) {
        const allIds = filteredAccountData.map((item) => item._id);
        setSelectedItems(new Set(allIds));

        const newStatusData = {};
        allIds.forEach((id) => {
          newStatusData[id] = "Done";
        });
        setStatusData((prev) => ({ ...prev, ...newStatusData }));
      } else {
        setSelectedItems(new Set());
        setAdditionalData({});
        setRemarksData({});
        setStatusData({});
        setNextTargetDate({});
      }
    },
    [filteredAccountData]
  );

  const handleImageUpload = useCallback(async (id, e) => {
    const file = e.target.files[0];
    if (!file) return;

    setAccountData((prev) =>
      prev.map((item) => (item._id === id ? { ...item, image: file } : item))
    );
  }, []);

  const handleStatusChange = useCallback((id, value) => {
    setStatusData((prev) => ({ ...prev, [id]: value }));
    if (value === "Done") {
      setNextTargetDate((prev) => {
        const newDates = { ...prev };
        delete newDates[id];
        return newDates;
      });
    }
  }, []);

  const handleNextTargetDateChange = useCallback((id, value) => {
    setNextTargetDate((prev) => ({ ...prev, [id]: value }));
  }, []);

  const fileToBase64 = useCallback((file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  }, []);

  const toggleHistory = useCallback(() => {
    setShowHistory((prev) => !prev);
    resetFilters();
    // Clear selections when switching views
    setSelectedHistoryItems(new Set());
  }, [resetFilters]);

  const handleSubmit = async () => {
    const selectedItemsArray = Array.from(selectedItems);

    if (selectedItemsArray.length === 0) {
      alert("Please select at least one item to submit");
      return;
    }

    const missingStatus = selectedItemsArray.filter((id) => !statusData[id]);
    if (missingStatus.length > 0) {
      alert(
        `Please select a status for all selected items. ${missingStatus.length} item(s) are missing status.`
      );
      return;
    }

    const missingNextDate = selectedItemsArray.filter(
      (id) => statusData[id] === "Extend date" && !nextTargetDate[id]
    );
    if (missingNextDate.length > 0) {
      alert(
        `Please select a next target date for all items with "Extend date" status. ${missingNextDate.length} item(s) are missing target date.`
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
      // UPDATED: Use the new function to format date properly for Google Sheets
      const dateForSubmission = formatDateForGoogleSheets(today);

      // Process submissions in batches for better performance
      const batchSize = 5;
      for (let i = 0; i < selectedItemsArray.length; i += batchSize) {
        const batch = selectedItemsArray.slice(i, i + batchSize);

        await Promise.all(
          batch.map(async (id) => {
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

            // UPDATED: Use properly formatted date for submission
            // Format the next target date properly if it exists
            let formattedNextTargetDate = "";
            let nextTargetDateForGoogleSheets = null;

            if (nextTargetDate[id]) {
              const convertedDate = convertToGoogleSheetsDate(
                nextTargetDate[id]
              );
              formattedNextTargetDate = convertedDate.formatted;
              nextTargetDateForGoogleSheets = convertedDate.dateObject;
            }

            // Updated to include username in column H and task description in column I when submitting to history
            const newRowData = [
              dateForSubmission.formatted, // Use formatted date string
              item["col1"] || "",
              statusData[id] || "",
              formattedNextTargetDate, // Use properly formatted next target date
              remarksData[id] || "",
              imageUrl,
              "", // Column G
              username, // Column H - Store the logged-in username
              item["col5"] || "", // Column I - Task description from col5
              item["col3"] || "", // Column J - Given By from original task
            ];

            const insertFormData = new FormData();
            insertFormData.append("sheetName", CONFIG.TARGET_SHEET_NAME);
            insertFormData.append("action", "insert");
            insertFormData.append("rowData", JSON.stringify(newRowData));

            // UPDATED: Add comprehensive date format hints for Google Sheets
            insertFormData.append("dateFormat", "DD/MM/YYYY");
            insertFormData.append("timestampColumn", "0"); // Column A - Timestamp
            insertFormData.append("nextTargetDateColumn", "3"); // Column D - Next Target Date

            // Add additional metadata for proper date handling
            const dateMetadata = {
              columns: {
                0: { type: "date", format: "DD/MM/YYYY" }, // Timestamp
                3: { type: "date", format: "DD/MM/YYYY" }, // Next Target Date
              },
            };
            insertFormData.append("dateMetadata", JSON.stringify(dateMetadata));

            // If we have a proper date object for next target date, send it separately
            if (nextTargetDateForGoogleSheets) {
              insertFormData.append(
                "nextTargetDateObject",
                nextTargetDateForGoogleSheets.toISOString()
              );
            }

            return fetch(CONFIG.APPS_SCRIPT_URL, {
              method: "POST",
              body: insertFormData,
            });
          })
        );
      }

      setAccountData((prev) =>
        prev.filter((item) => !selectedItems.has(item._id))
      );

      setSuccessMessage(
        `Successfully processed ${selectedItemsArray.length} task records! Data submitted to ${CONFIG.TARGET_SHEET_NAME} sheet.`
      );
      setSelectedItems(new Set());
      setAdditionalData({});
      setRemarksData({});
      setStatusData({});
      setNextTargetDate({});

      setTimeout(() => {
        fetchSheetData();
      }, 2000);
    } catch (error) {
      console.error("Submission error:", error);
      alert("Failed to submit task records: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };


  const selectedItemsCount = selectedItems.size;
  const selectedHistoryItemsCount = selectedHistoryItems.size;
  return (
    <AdminLayout>
      <LoadingOverlay loading={isSubmitting} />
      <div className="space-y-6">
        <div className="flex flex-col gap-4 justify-between sm:flex-row sm:items-center">
          <h1 className="text-2xl font-bold tracking-tight text-purple-700">
            {showHistory
              ? CONFIG.PAGE_CONFIG.historyTitle
              : CONFIG.PAGE_CONFIG.title}
          </h1>
          <div className="flex flex-wrap space-y-2 space-x-4">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 text-gray-400 transform -translate-y-1/2"
                size={18}
              />
              <input
                type="text"
                placeholder={
                  showHistory ? "Search by Task ID..." : "Search tasks..."
                }
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="py-2 pr-4 pl-10 rounded-md border border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

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

            {/* Clear Button - Only show in history view, after Back to Tasks button */}
            {showHistory && (
              <button
                onClick={handleHistoryDelete}
                disabled={selectedHistoryItemsCount === 0 || isDeletingHistory}
                className="px-4 py-2 text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center">
                  <ArrowLeft className="mr-1 w-4 h-4" />
                  <span>
                    {isDeletingHistory
                      ? "Moving to Pending..."
                      : `Cancle Actual (${selectedHistoryItemsCount})`}
                  </span>
                </div>
              </button>
            )}

            {!showHistory && (
              <button
                onClick={handleSubmit}
                disabled={selectedItemsCount === 0 || isSubmitting}
                className="px-4 py-2 text-white bg-gradient-to-r from-purple-600 to-pink-600 rounded-md hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting
                  ? "Processing..."
                  : `Submit Selected (${selectedItemsCount})`}
              </button>
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
              {showHistory
                ? `Completed ${CONFIG.SOURCE_SHEET_NAME} Tasks`
                : `Pending ${CONFIG.SOURCE_SHEET_NAME} Tasks`}
            </h2>
            <p className="text-sm text-purple-600">
              {showHistory
                ? `${CONFIG.PAGE_CONFIG.historyDescription} for ${userRole === "admin" ? "all" : "your"
                } tasks`
                : CONFIG.PAGE_CONFIG.description}
            </p>
          </div>

          {loading ? (
            <div className="py-10 text-center">
              <div className="inline-block mb-4 w-8 h-8 rounded-full border-t-2 border-b-2 border-purple-500 animate-spin"></div>
              <p className="text-purple-600">Loading task data...</p>
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
            <>
              {/* Simplified History Filters - Only Date Range */}
              <div className="p-4 bg-gray-50 border-b border-purple-100">
                <div className="flex flex-wrap gap-4 justify-between items-center">
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

                  {(startDate || endDate || searchTerm) && (
                    <button
                      onClick={resetFilters}
                      className="px-3 py-1 text-sm text-red-700 bg-red-100 rounded-md hover:bg-red-200"
                    >
                      Clear All Filters
                    </button>
                  )}
                </div>
              </div>

              {/* History Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                        <input
                          type="checkbox"
                          className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                          checked={
                            filteredHistoryData.length > 0 &&
                            selectedHistoryItems.size ===
                            filteredHistoryData.length
                          }
                          onChange={handleSelectAllHistoryItems}
                        />
                      </th>
                      <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                        Timestamp
                      </th>
                      <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                        Task ID
                      </th>
                      <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                        Task
                      </th>
                      <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                        Status
                      </th>
                      <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                        Next Target Date
                      </th>
                      <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                        Remarks
                      </th>
                      <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                        Uploaded Image
                      </th>
                      {userRole === "admin" && (
                        <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                          User
                        </th>
                      )}
                      <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                        Given By
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredHistoryData.length > 0 ? (
                      filteredHistoryData.map((history) => {
                        const isHistorySelected = selectedHistoryItems.has(
                          history._id
                        );
                        return (
                          <tr
                            key={history._id}
                            className={`${isHistorySelected ? "bg-green-50" : ""
                              } hover:bg-gray-50`}
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <input
                                type="checkbox"
                                className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                                checked={isHistorySelected}
                                onChange={(e) =>
                                  handleHistoryCheckboxClick(e, history._id)
                                }
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {history["col0"] || "—"}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {history["col1"] || "—"}
                              </div>
                            </td>
                            <td className="px-6 py-4 min-w-[250px]">
                              <div
                                className="max-w-md text-sm text-gray-900 whitespace-normal break-words"
                                title={history["col8"]}
                              >
                                {history["col8"] || "—"}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${history["col2"] === "Done"
                                  ? "bg-green-100 text-green-800"
                                  : history["col2"] === "Extend date"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-gray-100 text-gray-800"
                                  }`}
                              >
                                {history["col2"] || "—"}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {formatDateForDisplay(history["col3"]) || "—"}
                              </div>
                            </td>
                            <td className="px-6 py-4 bg-purple-50 min-w-[200px]">
                              <div
                                className="max-w-md text-sm text-gray-900 whitespace-normal break-words"
                                title={history["col4"]}
                              >
                                {history["col4"] || "—"}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {history["col5"] ? (
                                <a
                                  href={history["col5"]}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center text-blue-600 underline hover:text-blue-800"
                                >
                                  <img
                                    src={
                                      history["col5"] ||
                                      "/api/placeholder/32/32"
                                    }
                                    alt="Attachment"
                                    className="object-cover mr-2 w-8 h-8 rounded-md"
                                  />
                                  View
                                </a>
                              ) : (
                                <span className="text-gray-400">
                                  No attachment
                                </span>
                              )}
                            </td>
                            {userRole === "admin" && (
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {history["col7"] || "—"}
                                </div>
                              </td>
                            )}
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {history["col9"] || "—"}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td
                          colSpan={userRole === "admin" ? 10 : 9}
                          className="px-6 py-4 text-center text-gray-500"
                        >
                          {searchTerm || startDate || endDate
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
            /* Regular Tasks Table */
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
                          selectedItems.size === filteredAccountData.length
                        }
                        onChange={handleSelectAllItems}
                      />
                    </th>
                    <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                      Task ID
                    </th>
                    <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                      Shop Name
                    </th>
                    <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                      Given By
                    </th>
                    <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                      Name
                    </th>
                    <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                      Task Description
                    </th>
                    <th
                      className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${!accountData["col17"] ? "bg-yellow-50" : ""
                        }`}
                    >
                      Task End Date
                    </th>
                    <th
                      className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${!accountData["col17"] ? "bg-green-50" : ""
                        }`}
                    >
                      Planned Date
                    </th>
                    <th
                      className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${!accountData["col17"] ? "bg-blue-50" : ""
                        }`}
                    >
                      Status
                    </th>
                    <th
                      className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${!accountData["col17"] ? "bg-indigo-50" : ""
                        }`}
                    >
                      Next Target Date
                    </th>
                    <th
                      className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${!accountData["col17"] ? "bg-purple-50" : ""
                        }`}
                    >
                      Remarks
                    </th>
                    <th
                      className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${!accountData["col17"] ? "bg-orange-50" : ""
                        }`}
                    >
                      Upload Image
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAccountData.length > 0 ? (
                    filteredAccountData.map((account) => {
                      const isSelected = selectedItems.has(account._id);
                      const rowColorClass = getRowColor(account["col17"]);
                      return (
                        <tr
                          key={account._id}
                          className={`${isSelected ? "bg-purple-50" : ""
                            } hover:bg-gray-50 ${rowColorClass}`}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                              checked={isSelected}
                              onChange={(e) =>
                                handleCheckboxClick(e, account._id)
                              }
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {account["col1"] || "—"}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {account["col2"] || "—"}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {account["col3"] || "—"}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {account["col4"] || "—"}
                            </div>
                          </td>
                          <td className="px-6 py-4 min-w-[250px]">
                            <div
                              className="max-w-md text-sm text-gray-900 whitespace-normal break-words"
                              title={account["col5"]}
                            >
                              {account["col5"] || "—"}
                            </div>
                          </td>
                          <td
                            className={`px-6 py-4 whitespace-nowrap ${!account["col17"] ? "bg-yellow-50" : ""
                              }`}
                          >
                            <div className="text-sm text-gray-900">
                              {formatDateForDisplay(account["col6"])}
                            </div>
                          </td>
                          <td
                            className={`px-6 py-4 whitespace-nowrap ${!account["col17"] ? "bg-green-50" : ""
                              }`}
                          >
                            <div className="text-sm text-gray-900">
                              {formatDateForDisplay(account["col10"])}
                            </div>
                          </td>
                          <td
                            className={`px-6 py-4 whitespace-nowrap ${!account["col17"] ? "bg-blue-50" : ""
                              }`}
                          >
                            <select
                              disabled={!isSelected}
                              value={statusData[account._id] || ""}
                              onChange={(e) =>
                                handleStatusChange(account._id, e.target.value)
                              }
                              className="px-2 py-1 w-full rounded-md border border-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed"
                            >
                              <option value="">Select</option>
                              <option value="Done">Done</option>
                              <option value="Extend date">Extend date</option>
                            </select>
                          </td>
                          <td
                            className={`px-6 py-4 whitespace-nowrap ${!account["col17"] ? "bg-indigo-50" : ""
                              }`}
                          >
                            <input
                              type="date"
                              disabled={
                                !isSelected ||
                                statusData[account._id] !== "Extend date"
                              }
                              value={
                                nextTargetDate[account._id]
                                  ? (() => {
                                    const dateStr =
                                      nextTargetDate[account._id];
                                    if (dateStr && dateStr.includes("/")) {
                                      const [day, month, year] =
                                        dateStr.split("/");
                                      return `${year}-${month.padStart(
                                        2,
                                        "0"
                                      )}-${day.padStart(2, "0")}`;
                                    }
                                    return dateStr;
                                  })()
                                  : ""
                              }
                              onChange={(e) => {
                                const inputDate = e.target.value;
                                if (inputDate) {
                                  const [year, month, day] =
                                    inputDate.split("-");
                                  const formattedDate = `${day}/${month}/${year}`;
                                  handleNextTargetDateChange(
                                    account._id,
                                    formattedDate
                                  );
                                } else {
                                  handleNextTargetDateChange(account._id, "");
                                }
                              }}
                              className="px-2 py-1 w-full rounded-md border border-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed"
                            />
                          </td>
                          <td
                            className={`px-6 py-4 whitespace-nowrap ${!account["col17"] ? "bg-purple-50" : ""
                              }`}
                          >
                            <input
                              type="text"
                              placeholder="Enter remarks"
                              disabled={!isSelected}
                              value={remarksData[account._id] || ""}
                              onChange={(e) =>
                                setRemarksData((prev) => ({
                                  ...prev,
                                  [account._id]: e.target.value,
                                }))
                              }
                              className="px-2 py-1 w-full rounded-md border border-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed"
                            />
                          </td>
                          <td
                            className={`px-6 py-4 whitespace-nowrap ${!account["col17"] ? "bg-orange-50" : ""
                              }`}
                          >
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
                                className={`flex items-center cursor-pointer ${account["col9"]?.toUpperCase() === "YES"
                                  ? "text-red-600 font-medium"
                                  : "text-purple-600"
                                  } hover:text-purple-800`}
                              >
                                <Upload className="mr-1 w-4 h-4" />
                                <span className="text-xs">
                                  {account["col9"]?.toUpperCase() === "YES"
                                    ? "Required Upload"
                                    : "Upload Image"}
                                  {account["col9"]?.toUpperCase() === "YES" && (
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
                                  disabled={!isSelected}
                                />
                              </label>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan={12}
                        className="px-6 py-4 text-center text-gray-500"
                      >
                        {searchTerm
                          ? "No tasks matching your search"
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

export default DelegationDataPage;
