"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  CheckCircle2,
  Upload,
  X,
  Search,
  History,
  ArrowLeft,
} from "lucide-react";
import AdminLayout from "../../components/checklist_delegation/AdminLayout";
import LoadingSpinner from "../../components/checklist_delegation/LoadingSpinner";
import LoadingOverlay from "../../components/checklist_delegation/LoadingOverlay";


// Configuration object - Move all configurations here
const CONFIG = {
  // Google Apps Script URL
  APPS_SCRIPT_URL:
    "https://script.google.com/macros/s/AKfycbyBPTmVksbejNrOPNZNHYajQWWLbzA34hshoAPYig99hcqkYuiKy-j5pavsuqeFKIXNFg/exec",

  // Google Drive folder ID for file uploads
  DRIVE_FOLDER_ID: "1fhwpde9ROtn2Kr_-lgT2n6_1cvasrAQt",

  // Sheet name to work with
  SHEET_NAME: "KUNAL ULWE",

  // Page configuration
  PAGE_CONFIG: {
    title: "Checklist Tasks",
    historyTitle: "Checklist Task History",
    description: "Showing today, tomorrow's tasks and past due tasks",
    historyDescription:
      "Read-only view of completed tasks with submission history",
  },
};

function DirectorDataPage() {
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
  const [membersList, setMembersList] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [userRole, setUserRole] = useState("");
  const [username, setUsername] = useState("");

  // NEW: History-specific state
  const [selectedHistoryItems, setSelectedHistoryItems] = useState(new Set());
  const [isSubmittingHistory, setIsSubmittingHistory] = useState(false);
  const [isDeletingHistory, setIsDeletingHistory] = useState(false);

  // Add this state at the top of your component
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [currentCameraAccountId, setCurrentCameraAccountId] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [selectedPendingMembers, setSelectedPendingMembers] = useState([]);

  const [pendingStartDate, setPendingStartDate] = useState("");
  const [pendingEndDate, setPendingEndDate] = useState("");

  // Add these new state variables after existing states
  const [selectedDeleteItems, setSelectedDeleteItems] = useState(new Set());
  const [deleteRemarks, setDeleteRemarks] = useState("");
  const [isDeletingPending, setIsDeletingPending] = useState(false);

  // Add these functions to your component
  const startCamera = async (accountId) => {
    try {
      setCurrentCameraAccountId(accountId);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });

      setCameraStream(stream);
      setCameraModalOpen(true);

      // Add a slight delay to ensure modal is open before assigning stream
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current
              .play()
              .catch((err) => console.error("Video play error:", err));
          };
        }
      }, 100);
    } catch (err) {
      console.error("Camera error:", err);
      // Fallback to file input
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.capture = "environment";
      input.onchange = (e) => handleImageUpload(accountId, e);
      input.click();
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setCameraModalOpen(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas
        .getContext("2d")
        .drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(
        (blob) => {
          const file = new File([blob], `camera-capture-${Date.now()}.jpg`, {
            type: "image/jpeg",
          });
          const fakeEvent = { target: { files: [file] } };
          handleImageUpload(currentCameraAccountId, fakeEvent);
          stopCamera();
        },
        "image/jpeg",
        0.9
      );
    }
  };

  const formatDateToDDMMYYYY = (date) => {
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const isEmpty = (value) => {
    return (
      value === null ||
      value === undefined ||
      (typeof value === "string" && value.trim() === "")
    );
  };

  useEffect(() => {
    const role = sessionStorage.getItem("role");
    const user = sessionStorage.getItem("username");
    setUserRole(role || "");
    setUsername(user || "");
  }, []);

  const parseGoogleSheetsDate = (dateStr) => {
    if (!dateStr) return "";

    // Handle DD/MM/YYYY HH:MM:SS format - show both date and time
    if (
      typeof dateStr === "string" &&
      dateStr.match(/^\d{2}\/\d{2}\/\d{4}\s\d{2}:\d{2}:\d{2}$/)
    ) {
      // Extract date and time parts
      const [datePart, timePart] = dateStr.split(" ");
      const [hours, minutes, seconds] = timePart.split(":");
      return `${datePart} ${hours}:${minutes}`; // Return date with time (HH:MM format)
    }

    // Handle DD/MM/YYYY HH:MM format
    if (
      typeof dateStr === "string" &&
      dateStr.match(/^\d{2}\/\d{2}\/\d{4}\s\d{2}:\d{2}$/)
    ) {
      return dateStr; // Return as is
    }

    // Handle DD/MM/YYYY format (existing functionality)
    if (typeof dateStr === "string" && dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      return dateStr;
    }

    // Handle Google Sheets Date() format
    if (typeof dateStr === "string" && dateStr.startsWith("Date(")) {
      const match = /Date\((\d+),(\d+),(\d+),(\d+),(\d+),(\d+)\)/.exec(dateStr);
      if (match) {
        const year = Number.parseInt(match[1], 10);
        const month = Number.parseInt(match[2], 10);
        const day = Number.parseInt(match[3], 10);
        const hours = Number.parseInt(match[4], 10);
        const minutes = Number.parseInt(match[5], 10);
        const seconds = Number.parseInt(match[6], 10);

        const formattedDate = `${day.toString().padStart(2, "0")}/${(month + 1)
          .toString()
          .padStart(2, "0")}/${year}`;

        // Include time if available
        if (hours !== undefined && minutes !== undefined) {
          return `${formattedDate} ${hours
            .toString()
            .padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
        }
        return formattedDate;
      }
    }

    // Try to parse as regular date
    try {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        const day = date.getDate().toString().padStart(2, "0");
        const month = (date.getMonth() + 1).toString().padStart(2, "0");
        const year = date.getFullYear();
        const hours = date.getHours().toString().padStart(2, "0");
        const minutes = date.getMinutes().toString().padStart(2, "0");

        return `${day}/${month}/${year} ${hours}:${minutes}`;
      }
    } catch (error) {
      console.error("Error parsing date:", error);
    }

    return dateStr;
  };

  const parseDateFromDDMMYYYY = (dateStr) => {
    if (!dateStr || typeof dateStr !== "string") return null;

    try {
      // Handle DD/MM/YYYY format
      if (dateStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
        const parts = dateStr.split("/");
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        return new Date(year, month, day);
      }

      // Handle DD/MM/YYYY HH:MM format
      if (dateStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}\s\d{1,2}:\d{2}$/)) {
        const [datePart, timePart] = dateStr.split(" ");
        const parts = datePart.split("/");
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        const [hours, minutes] = timePart.split(":");
        return new Date(year, month, day, parseInt(hours), parseInt(minutes));
      }

      // Handle DD/MM/YYYY HH:MM:SS format
      if (dateStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}\s\d{1,2}:\d{2}:\d{2}$/)) {
        const [datePart, timePart] = dateStr.split(" ");
        const parts = datePart.split("/");
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        const [hours, minutes, seconds] = timePart.split(":");
        return new Date(
          year,
          month,
          day,
          parseInt(hours),
          parseInt(minutes),
          parseInt(seconds)
        );
      }

      // Try as native Date object
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date;
      }

      return null;
    } catch (error) {
      console.error("Error parsing date:", error, "Input:", dateStr);
      return null;
    }
  };

  const sortDateWise = (a, b) => {
    const dateStrA = a["col6"] || "";
    const dateStrB = b["col6"] || "";
    const dateA = parseDateFromDDMMYYYY(dateStrA);
    const dateB = parseDateFromDDMMYYYY(dateStrB);
    if (!dateA) return 1;
    if (!dateB) return -1;
    return dateA.getTime() - dateB.getTime();
  };

  const resetFilters = () => {
    setSearchTerm("");
    setSelectedMembers([]);
    setStartDate("");
    setEndDate("");
    setPendingStartDate(""); // ADD THIS
    setPendingEndDate("");
    setSelectedPendingMembers([]);
  };

  // Memoized filtered data to prevent unnecessary re-renders
  // const filteredAccountData = useMemo(() => {
  //   const filtered = searchTerm
  //     ? accountData.filter((account) =>
  //         Object.values(account).some(
  //           (value) =>
  //             value &&
  //             value.toString().toLowerCase().includes(searchTerm.toLowerCase())
  //         )
  //       )
  //     : accountData;

  //   return filtered.sort(sortDateWise);
  // }, [accountData, searchTerm]);

  const filteredAccountData = useMemo(() => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const filtered = accountData.filter((account) => {
      // Search filter
      const matchesSearch = searchTerm
        ? Object.values(account).some(
          (value) =>
            value &&
            value.toString().toLowerCase().includes(searchTerm.toLowerCase())
        )
        : true;

      // Date range filter
      let matchesDateRange = true;
      const taskDate = parseDateFromDDMMYYYY(account["col6"]);

      if (pendingStartDate || pendingEndDate) {
        // If user has selected date filters, use them
        if (!taskDate) return false;

        if (pendingStartDate) {
          const startDateObj = new Date(pendingStartDate);
          startDateObj.setHours(0, 0, 0, 0);
          if (taskDate < startDateObj) matchesDateRange = false;
        }

        if (pendingEndDate) {
          const endDateObj = new Date(pendingEndDate);
          endDateObj.setHours(23, 59, 59, 999);
          if (taskDate > endDateObj) matchesDateRange = false;
        }
      } else {
        // If no date filter selected, default to showing only up to today
        if (taskDate) {
          const normalizedTaskDate = new Date(taskDate);
          normalizedTaskDate.setHours(0, 0, 0, 0);
          const normalizedToday = new Date(today);
          normalizedToday.setHours(0, 0, 0, 0);

          if (normalizedTaskDate > normalizedToday) {
            matchesDateRange = false;
          }
        }
      }

      // Member filter (Name column - col4)
      const matchesMember =
        selectedPendingMembers.length > 0
          ? selectedPendingMembers.includes(account["col4"])
          : true;

      return matchesSearch && matchesDateRange && matchesMember;
    });

    return filtered.sort(sortDateWise);
  }, [
    accountData,
    searchTerm,
    pendingStartDate,
    pendingEndDate,
    selectedPendingMembers,
  ]);

  const filteredHistoryData = useMemo(() => {
    return historyData
      .filter((item) => {
        const matchesSearch = searchTerm
          ? Object.values(item).some(
            (value) =>
              value &&
              value
                .toString()
                .toLowerCase()
                .includes(searchTerm.toLowerCase())
          )
          : true;

        const matchesMember =
          selectedMembers.length > 0
            ? selectedMembers.includes(item["col4"])
            : true;

        let matchesDateRange = true;
        if (startDate || endDate) {
          const itemDate = parseDateFromDDMMYYYY(item["col10"]);
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

        // NEW: Filter out rows where both Column K and Column P are not null
        const columnK = item["col10"]; // Actual date
        const columnP = item["col15"]; // Admin done status

        // Hide if both Column K and Column P have values
        if (!isEmpty(columnK) && !isEmpty(columnP)) {
          return false;
        }

        return matchesSearch && matchesMember && matchesDateRange;
      })
      .sort((a, b) => {
        const dateStrA = a["col10"] || "";
        const dateStrB = b["col10"] || "";
        const dateA = parseDateFromDDMMYYYY(dateStrA);
        const dateB = parseDateFromDDMMYYYY(dateStrB);
        if (!dateA) return 1;
        if (!dateB) return -1;
        return dateB.getTime() - dateA.getTime();
      });
  }, [historyData, searchTerm, selectedMembers, startDate, endDate]);

  const handlePendingDelete = async () => {
    const selectedDeleteItemsArray = Array.from(selectedDeleteItems);

    if (selectedDeleteItemsArray.length === 0) {
      alert("Please select at least one item to delete");
      return;
    }

    if (!deleteRemarks || deleteRemarks.trim() === "") {
      alert("Please provide delete remarks for the selected items");
      return;
    }

    const confirmDelete = window.confirm(
      `This will delete ${selectedDeleteItemsArray.length} task(s) and move them to 'Deleted_Checklist_Tasks' sheet. Continue?`
    );
    if (!confirmDelete) return;

    setIsDeletingPending(true);
    try {
      const timestamp = new Date();
      const formattedTimestamp = formatDateToDDMMYYYY(timestamp);

      // Prepare data for deletion
      const deleteData = selectedDeleteItemsArray.map((id) => {
        const item = accountData.find((account) => account._id === id);
        return {
          timestamp: formattedTimestamp,
          deleteRemarks: deleteRemarks,
          taskId: item["col1"],
          shopName: item["col2"],
          givenBy: item["col3"],
          name: item["col4"],
          taskDescription: item["col5"],
          taskStartDate: item["col6"],
          freq: item["col7"],
          enableReminders: item["col8"],
          requireAttachment: item["col9"],
          rowIndex: item._rowIndex,
        };
      });

      // Submit to Google Sheets
      const formData = new FormData();
      formData.append("action", "deletePendingTasks");
      formData.append("sourceSheetName", CONFIG.SHEET_NAME);
      formData.append("targetSheetName", "Deleted_Checklist_Tasks");
      formData.append("deleteData", JSON.stringify(deleteData));

      const response = await fetch(CONFIG.APPS_SCRIPT_URL, {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        // Remove deleted items from local state
        setAccountData((prev) =>
          prev.filter((item) => !selectedDeleteItems.has(item._id))
        );

        // Clear selections
        setSelectedDeleteItems(new Set());
        setDeleteRemarks("");

        // Show success message
        setSuccessMessage(
          `Successfully deleted ${selectedDeleteItemsArray.length} task(s) and moved to Deleted_Checklist_Tasks!`
        );
        setTimeout(() => setSuccessMessage(""), 5000);

        // Refresh data
        await fetchSheetData();
      } else {
        throw new Error(result.error || "Failed to delete tasks");
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert("Error deleting tasks: " + error.message);
    } finally {
      setIsDeletingPending(false);
    }
  };

  const getTaskStatistics = () => {
    const totalCompleted = historyData.length;
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
    const filteredTotal = filteredHistoryData.length;

    return {
      totalCompleted,
      memberStats,
      filteredTotal,
    };
  };

  const handleMemberSelection = (member) => {
    setSelectedMembers((prev) => {
      if (prev.includes(member)) {
        return prev.filter((item) => item !== member);
      } else {
        return [...prev, member];
      }
    });
  };

  const getFilteredMembersList = () => {
    if (userRole.toLowerCase().includes("admin")) {
      return membersList;
    } else {
      return membersList.filter(
        (member) => member.toLowerCase() === username.toLowerCase()
      );
    }
  };

  const fetchSheetData = useCallback(async () => {
    try {
      setLoading(true);
      const pendingAccounts = [];
      const historyRows = [];

      const response = await fetch(
        `${CONFIG.APPS_SCRIPT_URL}?sheet=${CONFIG.SHEET_NAME}&action=searchTasks`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.status}`);
      }

      const text = await response.text();
      let data;

      try {
        data = JSON.parse(text);
      } catch (parseError) {
        const jsonStart = text.indexOf("{");
        const jsonEnd = text.lastIndexOf("}");
        if (jsonStart !== -1 && jsonEnd !== -1) {
          const jsonString = text.substring(jsonStart, jsonEnd + 1);
          data = JSON.parse(jsonString);
        } else {
          throw new Error("Invalid JSON response from server");
        }
      }

      const currentUsername = sessionStorage.getItem("username");
      const currentUserRole = sessionStorage.getItem("role");

      const today = new Date();
      today.setHours(23, 59, 59, 999); // End of today

      console.log("Date filtering - Today (end of day):", today);

      const membersSet = new Set();

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
        if (rowIndex === 0) return;

        let rowValues = [];
        if (row.c) {
          rowValues = row.c.map((cell) =>
            cell && cell.v !== undefined ? cell.v : ""
          );
        } else if (Array.isArray(row)) {
          rowValues = row;
        } else {
          console.log("Unknown row format:", row);
          return;
        }

        const assignedTo = rowValues[4] || "Unassigned";
        membersSet.add(assignedTo);

        const isUserMatch =
          currentUserRole.toLowerCase().includes("admin") ||
          assignedTo.toLowerCase() === currentUsername.toLowerCase();
        if (!isUserMatch && !currentUserRole.toLowerCase().includes("admin")) return;

        const columnGValue = rowValues[6];
        const columnKValue = rowValues[10];
        const columnMValue = rowValues[12];

        if (columnMValue && columnMValue.toString().trim() === "DONE") {
          return;
        }

        const rowDateStr = columnGValue ? String(columnGValue).trim() : "";
        const formattedRowDate = parseGoogleSheetsDate(rowDateStr);

        const googleSheetsRowIndex = rowIndex + 1;

        // Create stable unique ID using task ID and row index
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

        const columnHeaders = [
          { id: "col0", label: "Timestamp", type: "string" },
          { id: "col1", label: "Task ID", type: "string" },
          { id: "col2", label: "Firm", type: "string" },
          { id: "col3", label: "Given By", type: "string" },
          { id: "col4", label: "Name", type: "string" },
          { id: "col5", label: "Task Description", type: "string" },
          { id: "col6", label: "Task End Date", type: "date" },
          { id: "col7", label: "Freq", type: "string" },
          { id: "col8", label: "Enable Reminders", type: "string" },
          { id: "col9", label: "Require Attachment", type: "string" },
          { id: "col10", label: "Actual", type: "date" },
          { id: "col11", label: "Column L", type: "string" },
          { id: "col12", label: "Status", type: "string" },
          { id: "col13", label: "Remarks", type: "string" },
          { id: "col14", label: "Uploaded Image", type: "string" },
          { id: "col15", label: "Admin Done", type: "string" }, // NEW: Column P
        ];

        columnHeaders.forEach((header, index) => {
          const cellValue = rowValues[index];
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
            rowData[header.id] = cellValue;
          } else {
            rowData[header.id] = cellValue !== null ? cellValue : "";
          }
        });

        console.log(
          `Row ${rowIndex}: Task ID = ${rowData.col1}, Start Date = ${rowData.col6}, Actual Date = ${rowData.col10}`
        );

        const hasColumnG = !isEmpty(columnGValue);
        const isColumnKEmpty = isEmpty(columnKValue);

        // CHANGED: Show only tasks from previous dates up to today (excluding tomorrow)
        // if (hasColumnG && isColumnKEmpty) {
        //   const rowDate = parseDateFromDDMMYYYY(formattedRowDate);

        //   if (rowDate) {
        //     // Compare dates with time included
        //     const isPastOrToday = rowDate <= today;

        //     console.log(
        //       `Date check - Row: ${formattedRowDate}, Today: ${today}, IsPastOrToday: ${isPastOrToday}`
        //     );

        //     if (isPastOrToday) {
        //       pendingAccounts.push(rowData);
        //       console.log(
        //         `✅ ADDED to pending (Past & Today): ${rowData.col5} (Date: ${formattedRowDate})`
        //       );
        //     } else {
        //       console.log(
        //         `❌ SKIPPED - Future date (tomorrow): ${rowData.col5} (Date: ${formattedRowDate})`
        //       );
        //     }
        //   } else {
        //     console.log(`❌ Could not parse date: ${formattedRowDate}`);
        //   }
        // }

        // Show tasks based on date filters (if no filter, show up to today)
        if (hasColumnG && isColumnKEmpty) {
          pendingAccounts.push(rowData); // Add all tasks, filtering will happen in filteredAccountData
        } else if (hasColumnG && !isColumnKEmpty) {
          const isUserHistoryMatch =
            currentUserRole.toLowerCase().includes("admin") ||
            assignedTo.toLowerCase() === currentUsername.toLowerCase();
          if (isUserHistoryMatch) {
            historyRows.push(rowData);
          }
        } else {
          console.log(
            `❌ SKIPPED - Column G empty or Column K filled: ${rowData.col5}`
          );
        }
      });

      console.log(
        `Final results - Pending (Past & Today): ${pendingAccounts.length}, History: ${historyRows.length}`
      );

      setMembersList(Array.from(membersSet).sort());
      setAccountData(pendingAccounts);
      setHistoryData(historyRows);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching sheet data:", error);
      setError("Failed to load account data: " + error.message);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSheetData();
  }, [fetchSheetData]);

  // Checkbox handlers with better state management
  const handleSelectItem = useCallback((id, isChecked) => {
    console.log(`Checkbox action: ${id} -> ${isChecked}`);

    setSelectedItems((prev) => {
      const newSelected = new Set(prev);

      if (isChecked) {
        newSelected.add(id);
      } else {
        newSelected.delete(id);
        // Clean up related data when unchecking
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
      }

      return newSelected;
    });
  }, []);

  const handleCheckboxClick = useCallback(
    (e, id) => {
      e.stopPropagation();
      const isChecked = e.target.checked;
      console.log(`Checkbox clicked: ${id}, checked: ${isChecked}`);
      handleSelectItem(id, isChecked);
    },
    [handleSelectItem]
  );

  const handleSelectAllItems = useCallback(
    (e) => {
      e.stopPropagation();
      const checked = e.target.checked;
      console.log(`Select all clicked: ${checked}`);

      if (checked) {
        const allIds = filteredAccountData.map((item) => item._id);
        setSelectedItems(new Set(allIds));
        console.log(`Selected all items: ${allIds}`);
      } else {
        setSelectedItems(new Set());
        setAdditionalData({});
        setRemarksData({});
        console.log("Cleared all selections");
      }
    },
    [filteredAccountData]
  );

  // NEW: History checkbox handlers
  const handleSelectHistoryItem = useCallback((id, isChecked) => {
    console.log(`History checkbox action: ${id} -> ${isChecked}`);

    setSelectedHistoryItems((prev) => {
      const newSelected = new Set(prev);

      if (isChecked) {
        newSelected.add(id);
      } else {
        newSelected.delete(id);
      }

      console.log(`Updated history selection: ${Array.from(newSelected)}`);
      return newSelected;
    });
  }, []);

  const handleHistoryCheckboxClick = useCallback(
    (e, id) => {
      e.stopPropagation();
      const isChecked = e.target.checked;
      console.log(`History checkbox clicked: ${id}, checked: ${isChecked}`);
      handleSelectHistoryItem(id, isChecked);
    },
    [handleSelectHistoryItem]
  );

  const handleSelectAllHistoryItems = useCallback(
    (e) => {
      e.stopPropagation();
      const checked = e.target.checked;
      console.log(`Select all history clicked: ${checked}`);

      if (checked) {
        const allIds = filteredHistoryData.map((item) => item._id);
        setSelectedHistoryItems(new Set(allIds));
        console.log(`Selected all history items: ${allIds}`);
      } else {
        setSelectedHistoryItems(new Set());
        console.log("Cleared all history selections");
      }
    },
    [filteredHistoryData]
  );

  const handleImageUpload = async (id, e) => {
    const file = e.target.files[0];
    if (!file) return;

    console.log(`Image upload for: ${id}`);
    setAccountData((prev) =>
      prev.map((item) => (item._id === id ? { ...item, image: file } : item))
    );
  };

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  const toggleHistory = () => {
    setShowHistory((prev) => !prev);
    resetFilters();
    // Clear selections when switching views
    setSelectedItems(new Set());
    setSelectedHistoryItems(new Set());
    setAdditionalData({});
    setRemarksData({});
  };

  // Clear only Column K (Actual) for selected history items
  const handleHistoryDelete = async () => {
    const selectedHistoryItemsArray = Array.from(selectedHistoryItems);

    if (selectedHistoryItemsArray.length === 0) {
      alert("Please select at least one item to clear Actual date (Column K)");
      return;
    }

    const confirmClear = window.confirm(
      `This will clear the Actual date (Column K) for ${selectedHistoryItemsArray.length} selected record(s). Data will NOT be deleted. Continue?`
    );
    if (!confirmClear) return;

    setIsDeletingHistory(true);
    try {
      const rowDataClear = selectedHistoryItemsArray
        .map((id) => {
          const item = historyData.find((history) => history._id === id);
          if (!item) return null;
          return {
            taskId: item["col1"],
            rowIndex: item._rowIndex,
            clearActual: true,
            actualDate: "",
          };
        })
        .filter(Boolean);

      if (rowDataClear.length === 0) {
        setIsDeletingHistory(false);
        return;
      }

      const formData = new FormData();
      formData.append("sheetName", CONFIG.SHEET_NAME);
      formData.append("action", "updateTaskData");
      formData.append("rowData", JSON.stringify(rowDataClear));

      const response = await fetch(CONFIG.APPS_SCRIPT_URL, {
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
          // Allow Apps Script to apply changes before refetching
          await new Promise((r) => setTimeout(r, 1500));
          await fetchSheetData();

          setSelectedHistoryItems(new Set());
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
    } catch (error) {
      console.error("History deletion error:", error);
      alert("Error clearing Actual date: " + error.message);
    } finally {
      setIsDeletingHistory(false);
    }
  };

  // NEW: History submit function
  const handleHistorySubmit = async () => {
    const selectedHistoryItemsArray = Array.from(selectedHistoryItems);

    if (selectedHistoryItemsArray.length === 0) {
      alert("Please select at least one item to submit");
      return;
    }

    setIsSubmittingHistory(true);

    try {
      // Prepare data for Google Sheets update
      const submissionData = selectedHistoryItemsArray.map((id) => {
        const item = historyData.find((history) => history._id === id);

        console.log(`Preparing history submission for item:`, {
          id: id,
          taskId: item["col1"],
          rowIndex: item._rowIndex,
        });

        return {
          taskId: item["col1"],
          rowIndex: item._rowIndex,
          adminDoneStatus: "Done",
        };
      });

      console.log("History submission data:", submissionData);

      // Submit to Google Sheets
      const formData = new FormData();
      formData.append("sheetName", CONFIG.SHEET_NAME);
      formData.append("action", "updateAdminDone");
      formData.append("rowData", JSON.stringify(submissionData));

      const response = await fetch(CONFIG.APPS_SCRIPT_URL, {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        // Update local state: Mark selected items with Column P = "Done"
        setHistoryData((prev) =>
          prev.map((item) =>
            selectedHistoryItems.has(item._id)
              ? { ...item, col15: "Done" }
              : item
          )
        );

        // Clear selections
        setSelectedHistoryItems(new Set());

        // Show success message
        setSuccessMessage(
          `Successfully marked ${selectedHistoryItemsArray.length} items as Admin Done!`
        );

        // Auto-clear success message after 5 seconds
        setTimeout(() => {
          setSuccessMessage("");
        }, 5000);
      } else {
        throw new Error(result.error || "Failed to update admin done status");
      }
    } catch (error) {
      console.error("History submission error:", error);
      alert("Error: " + error.message);
    } finally {
      setIsSubmittingHistory(false);
    }
  };

  // MAIN SUBMIT FUNCTION - CACHE MEMORY APPROACH
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
        setSelectedItems(new Set());
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



  // Convert Set to Array for display
  const selectedItemsCount = selectedItems.size;
  const selectedHistoryItemsCount = selectedHistoryItems.size;

  return (
    <AdminLayout>
      <LoadingOverlay loading={isSubmitting} />
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
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


          <div className="flex flex-wrap space-y-2 space-x-4">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                type="text"
                placeholder={
                  showHistory ? "Search history..." : "Search tasks..."
                }
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-purple-200 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <button
              onClick={toggleHistory}
              className="rounded-md bg-gradient-to-r from-blue-500 to-indigo-600 py-2 px-4 text-white hover:from-blue-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {showHistory ? (
                <div className="flex items-center">
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  <span>Back to Tasks</span>
                </div>
              ) : (
                <div className="flex items-center">
                  <History className="h-4 w-4 mr-1" />
                  <span>View History</span>
                </div>
              )}
            </button>

            {/* Clear Actual Button - Only show in history view */}
            {showHistory && (
              <button
                onClick={handleHistoryDelete}
                disabled={selectedHistoryItemsCount === 0 || isDeletingHistory}
                className="rounded-md bg-red-600 py-2 px-4 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center">
                  <X className="h-4 w-4 mr-1" />
                  <span>
                    {isDeletingHistory
                      ? "Clearing..."
                      : `Clear Actual (${selectedHistoryItemsCount})`}
                  </span>
                </div>
              </button>
            )}

            {!showHistory && (
              <>
                {/* Delete Remarks Input */}
                {selectedDeleteItems.size > 0 && (
                  <input
                    type="text"
                    placeholder="Enter delete remarks (required)"
                    value={deleteRemarks}
                    onChange={(e) => setDeleteRemarks(e.target.value)}
                    className="px-4 py-2 rounded-md border border-red-300 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                )}

                {/* Delete Button */}
                {userRole === "admin" && (
                  <button
                    onClick={handlePendingDelete}
                    disabled={
                      selectedDeleteItems.size === 0 || isDeletingPending
                    }
                    className="px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isDeletingPending
                      ? "Deleting..."
                      : `Delete (${selectedDeleteItems.size})`}
                  </button>
                )}
                <button
                  onClick={handleSubmit}
                  disabled={selectedItemsCount === 0 || isSubmitting}
                  className="rounded-md bg-gradient-to-r from-purple-600 to-pink-600 py-2 px-4 text-white hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting
                    ? "Processing..."
                    : `Submit Selected (${selectedItemsCount})`}
                </button>
              </>
            )}

            {/* NEW: History Submit Button */}
            {showHistory && (
              <button
                onClick={handleHistorySubmit}
                disabled={
                  selectedHistoryItemsCount === 0 || isSubmittingHistory
                }
                className="rounded-md bg-gradient-to-r from-green-600 to-emerald-600 py-2 px-4 text-white hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmittingHistory
                  ? "Processing..."
                  : `Submit Selected (${selectedHistoryItemsCount})`}
              </button>
            )}
          </div>
        </div>

        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md flex items-center justify-between">
            <div className="flex items-center">
              <CheckCircle2 className="h-5 w-5 mr-2 text-green-500" />
              {successMessage}
            </div>
            <button
              onClick={() => setSuccessMessage("")}
              className="text-green-500 hover:text-green-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        <div className="rounded-lg border border-purple-200 shadow-md bg-white overflow-hidden">
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-100 p-4">
            <h2 className="text-purple-700 font-medium">
              {showHistory
                ? `Completed ${CONFIG.SHEET_NAME} Tasks`
                : `Pending ${CONFIG.SHEET_NAME} Tasks`}
            </h2>
            <p className="text-purple-600 text-sm">
              {showHistory
                ? `${CONFIG.PAGE_CONFIG.historyDescription} for ${userRole === "admin" ? "all" : "your"
                } tasks`
                : CONFIG.PAGE_CONFIG.description}
            </p>
          </div>

          {/* Date Range Filter for Pending Tasks - Only show when NOT in history view */}
          {!showHistory && userRole === "admin" && (
            <div className="p-4 bg-gray-50 border-b border-purple-100">
              <div className="flex flex-wrap gap-4 justify-between items-center">
                <div className="flex flex-col">
                  <div className="flex items-center mb-2">
                    <span className="text-sm font-medium text-purple-700">
                      Filter by Task End Date:
                    </span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <div className="flex items-center">
                      <label
                        htmlFor="pending-start-date"
                        className="mr-1 text-sm text-gray-700"
                      >
                        From
                      </label>
                      <input
                        id="pending-start-date"
                        type="date"
                        value={pendingStartDate}
                        onChange={(e) => setPendingStartDate(e.target.value)}
                        className="p-1 text-sm rounded-md border border-gray-200"
                      />
                    </div>
                    <div className="flex items-center">
                      <label
                        htmlFor="pending-end-date"
                        className="mr-1 text-sm text-gray-700"
                      >
                        To
                      </label>
                      <input
                        id="pending-end-date"
                        type="date"
                        value={pendingEndDate}
                        onChange={(e) => setPendingEndDate(e.target.value)}
                        className="p-1 text-sm rounded-md border border-gray-200"
                      />
                    </div>
                  </div>
                </div>

                {getFilteredMembersList().length > 0 && (
                  <div className="flex flex-col">
                    <div className="flex items-center mb-2">
                      <span className="text-sm font-medium text-purple-700">
                        Filter by Name:
                      </span>
                    </div>
                    <div className="flex overflow-y-auto flex-wrap gap-3 p-2 max-h-32 bg-white rounded-md border border-gray-200">
                      {getFilteredMembersList().map((member, idx) => (
                        <div key={idx} className="flex items-center">
                          <input
                            id={`pending-member-${idx}`}
                            type="checkbox"
                            className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                            checked={selectedPendingMembers.includes(member)}
                            onChange={() => {
                              setSelectedPendingMembers((prev) => {
                                if (prev.includes(member)) {
                                  return prev.filter((item) => item !== member);
                                } else {
                                  return [...prev, member];
                                }
                              });
                            }}
                          />
                          <label
                            htmlFor={`pending-member-${idx}`}
                            className="ml-2 text-sm text-gray-700"
                          >
                            {member}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(pendingStartDate ||
                  pendingEndDate ||
                  searchTerm ||
                  selectedPendingMembers.length > 0) && (
                    <button
                      onClick={resetFilters}
                      className="px-3 py-1 text-sm text-red-700 bg-red-100 rounded-md hover:bg-red-200"
                    >
                      Clear All Filters
                    </button>
                  )}
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-center py-10">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500 mb-4"></div>
              <p className="text-purple-600">Loading task data...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 p-4 rounded-md text-red-800 text-center">
              {error}{" "}
              <button
                className="underline ml-2"
                onClick={() => window.location.reload()}
              >
                Try again
              </button>
            </div>
          ) : showHistory ? (
            <>
              {/* History Filters */}
              <div className="p-4 border-b border-purple-100 bg-gray-50">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  {getFilteredMembersList().length > 0 && (
                    <div className="flex flex-col">
                      <div className="mb-2 flex items-center">
                        <span className="text-sm font-medium text-purple-700">
                          Filter by Member:
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-3 max-h-32 overflow-y-auto p-2 border border-gray-200 rounded-md bg-white">
                        {getFilteredMembersList().map((member, idx) => (
                          <div key={idx} className="flex items-center">
                            <input
                              id={`member-${idx}`}
                              type="checkbox"
                              className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
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
                  )}

                  <div className="flex flex-col">
                    <div className="mb-2 flex items-center">
                      <span className="text-sm font-medium text-purple-700">
                        Filter by Date Range:
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center">
                        <label
                          htmlFor="start-date"
                          className="text-sm text-gray-700 mr-1"
                        >
                          From
                        </label>
                        <input
                          id="start-date"
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="text-sm border border-gray-200 rounded-md p-1"
                        />
                      </div>
                      <div className="flex items-center">
                        <label
                          htmlFor="end-date"
                          className="text-sm text-gray-700 mr-1"
                        >
                          To
                        </label>
                        <input
                          id="end-date"
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="text-sm border border-gray-200 rounded-md p-1"
                        />
                      </div>
                    </div>
                  </div>

                  {(selectedMembers.length > 0 ||
                    startDate ||
                    endDate ||
                    searchTerm) && (
                      <button
                        onClick={resetFilters}
                        className="px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 text-sm"
                      >
                        Clear All Filters
                      </button>
                    )}
                </div>
              </div>

              {/* Task Statistics */}
              <div className="p-4 border-b border-purple-100 bg-blue-50">
                <div className="flex flex-col">
                  <h3 className="text-sm font-medium text-blue-700 mb-2">
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

              {/* History Table - Single scroll container */}
              <div className="h-[calc(100vh-300px)] overflow-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                          checked={
                            filteredHistoryData.length > 0 &&
                            selectedHistoryItems.size ===
                            filteredHistoryData.length
                          }
                          onChange={handleSelectAllHistoryItems}
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Task ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Shop Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Given By
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Task Description
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-yellow-50">
                        Task End Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Freq
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Enable Reminders
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Require Attachment
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-green-50">
                        Actual Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-blue-50">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-purple-50">
                        Remarks
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Attachment
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
                                className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                checked={isHistorySelected}
                                onChange={(e) =>
                                  handleHistoryCheckboxClick(e, history._id)
                                }
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {history["col1"] || "—"}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {history["col2"] || "—"}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {history["col3"] || "—"}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {history["col4"] || "—"}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div
                                className="text-sm text-gray-900 max-w-xs"
                                title={history["col5"]}
                              >
                                {history["col5"] || "—"}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap bg-yellow-50">
                              <div className="text-sm text-gray-900">
                                {history["col6"] || "—"}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {history["col7"] || "—"}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {history["col8"] || "—"}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {history["col9"] || "—"}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap bg-green-50">
                              <div className="text-sm font-medium text-gray-900">
                                {history["col10"] || "—"}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap bg-blue-50">
                              <span
                                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${history["col12"] === "Yes"
                                  ? "bg-green-100 text-green-800"
                                  : history["col12"] === "No"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-gray-100 text-gray-800"
                                  }`}
                              >
                                {history["col12"] || "—"}
                              </span>
                            </td>
                            <td className="px-6 py-4 bg-purple-50">
                              <div
                                className="text-sm text-gray-900 max-w-xs"
                                title={history["col13"]}
                              >
                                {history["col13"] || "—"}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {history["col14"] ? (
                                <a
                                  href={history["col14"]}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 underline flex items-center"
                                >
                                  <img
                                    src={
                                      history["col14"] ||
                                      "/placeholder.svg?height=32&width=32"
                                    }
                                    alt="Attachment"
                                    className="h-8 w-8 object-cover rounded-md mr-2"
                                  />
                                  View
                                </a>
                              ) : (
                                <span className="text-gray-400">
                                  No attachment
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td
                          colSpan={14}
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
            /* Regular Tasks Table - Single scroll container */
            <div className="h-[calc(100vh-250px)] overflow-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        checked={
                          filteredAccountData.length > 0 &&
                          selectedItems.size === filteredAccountData.length
                        }
                        onChange={handleSelectAllItems}
                      />
                    </th>
                    {userRole === "admin" && (
                      <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase bg-red-50">
                        Delete
                        <input
                          type="checkbox"
                          className="block mt-1 w-4 h-4 text-red-600 rounded border-gray-300"
                          checked={
                            selectedDeleteItems.size ===
                            filteredAccountData.length &&
                            filteredAccountData.length > 0
                          }
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedDeleteItems(
                                new Set(
                                  filteredAccountData.map((item) => item._id)
                                )
                              );
                            } else {
                              setSelectedDeleteItems(new Set());
                            }
                          }}
                        />
                      </th>
                    )}

                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Task ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Shop Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Given By
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Task Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-yellow-50">
                      Task End Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Freq
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Enable Reminders
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Require Attachment
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Remarks
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Upload Image
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAccountData.length > 0 ? (
                    filteredAccountData.map((account) => {
                      const isSelected = selectedItems.has(account._id);
                      return (
                        <tr
                          key={account._id}
                          className={`${isSelected ? "bg-purple-50" : ""
                            } hover:bg-gray-50`}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                              checked={isSelected}
                              onChange={(e) =>
                                handleCheckboxClick(e, account._id)
                              }
                            />
                          </td>
                          {userRole === "admin" && (
                            <td className="px-6 py-4 whitespace-nowrap bg-red-50">
                              <input
                                type="checkbox"
                                className="w-4 h-4 text-red-600 rounded border-gray-300"
                                checked={selectedDeleteItems.has(account._id)}
                                onChange={(e) => {
                                  const newSet = new Set(selectedDeleteItems);
                                  if (e.target.checked) {
                                    newSet.add(account._id);
                                  } else {
                                    newSet.delete(account._id);
                                  }
                                  setSelectedDeleteItems(newSet);
                                }}
                              />
                            </td>
                          )}
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
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900 max-w-xs break-words whitespace-normal">
                              {account["col5"] || "—"}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap bg-yellow-50">
                            <div className="text-sm text-gray-900">
                              {account["col6"] || "—"}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {account["col7"] || "—"}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {account["col8"] || "—"}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {account["col9"] || "—"}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap bg-yellow-50">
                            <select
                              disabled={!isSelected}
                              value={additionalData[account._id] || ""}
                              onChange={(e) => {
                                setAdditionalData((prev) => ({
                                  ...prev,
                                  [account._id]: e.target.value,
                                }));
                                if (e.target.value !== "No") {
                                  setRemarksData((prev) => {
                                    const newData = { ...prev };
                                    delete newData[account._id];
                                    return newData;
                                  });
                                }
                              }}
                              className="border border-gray-300 rounded-md px-2 py-1 w-full disabled:bg-gray-100 disabled:cursor-not-allowed"
                            >
                              <option value="">Select...</option>
                              <option value="Yes">Yes</option>
                              <option value="No">No</option>
                            </select>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap bg-orange-50">
                            <input
                              type="text"
                              placeholder="Enter remarks"
                              disabled={
                                !isSelected || !additionalData[account._id]
                              }
                              value={remarksData[account._id] || ""}
                              onChange={(e) =>
                                setRemarksData((prev) => ({
                                  ...prev,
                                  [account._id]: e.target.value,
                                }))
                              }
                              className="border rounded-md px-2 py-1 w-full border-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap bg-green-50">
                            {account.image ? (
                              <div className="flex items-center">
                                <img
                                  src={
                                    typeof account.image === "string"
                                      ? account.image
                                      : URL.createObjectURL(account.image)
                                  }
                                  alt="Receipt"
                                  className="h-10 w-10 object-cover rounded-md mr-2"
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
                              <div className="flex flex-col space-y-2">
                                {/* Camera Capture Button */}
                                <button
                                  type="button"
                                  onClick={() => startCamera(account._id)}
                                  disabled={!isSelected}
                                  className={`flex items-center justify-center p-1 rounded-md ${account["col9"]?.toUpperCase() === "YES"
                                    ? "bg-red-100 text-red-600"
                                    : "bg-purple-100 text-purple-600"
                                    } hover:bg-opacity-80 disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-5 w-5 mr-1"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                                    />
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                                    />
                                  </svg>
                                  <span className="text-xs">Take Photo</span>
                                </button>

                                {/* Upload File Button */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const input =
                                      document.createElement("input");
                                    input.type = "file";
                                    input.accept = "image/*";
                                    input.onchange = (e) =>
                                      handleImageUpload(account._id, e);
                                    input.click();
                                  }}
                                  disabled={!isSelected}
                                  className={`flex items-center justify-center p-1 rounded-md ${account["col9"]?.toUpperCase() === "YES"
                                    ? "bg-red-100 text-red-600"
                                    : "bg-blue-100 text-blue-600"
                                    } hover:bg-opacity-80 disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                  <Upload className="h-5 w-5 mr-1" />
                                  <span className="text-xs">Upload Image</span>
                                </button>

                                {/* Camera Modal */}
                                {cameraModalOpen && (
                                  <div className="fixed inset-0 z-[9999] flex items-center justify-center">
                                    {/* Backdrop */}
                                    <div
                                      className="absolute inset-0 bg-black bg-opacity-75"
                                      onClick={stopCamera}
                                    ></div>

                                    {/* Modal Content */}
                                    <div className="relative z-[10000] bg-white rounded-lg p-4 max-w-md w-full mx-4 shadow-2xl">
                                      {/* Close Button */}
                                      <button
                                        onClick={stopCamera}
                                        className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 z-[10001] shadow-lg"
                                      >
                                        <X className="h-5 w-5" />
                                      </button>

                                      {/* Video Container */}
                                      <div className="relative aspect-video bg-black rounded-md overflow-hidden mb-4">
                                        <video
                                          ref={videoRef}
                                          autoPlay
                                          playsInline
                                          muted
                                          className="w-full h-full object-cover"
                                        />
                                        <canvas
                                          ref={canvasRef}
                                          className="hidden"
                                        />
                                      </div>

                                      {/* Capture Button Container - Fixed positioning */}
                                      <div className="w-full flex justify-center">
                                        <button
                                          onClick={capturePhoto}
                                          className="bg-green-500 text-white px-8 py-3 rounded-lg hover:bg-green-600 flex items-center shadow-lg transform hover:scale-105 transition-all duration-200 z-[10001] relative"
                                          style={{ zIndex: 10001 }}
                                        >
                                          <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            className="h-6 w-6 mr-2"
                                            viewBox="0 0 20 20"
                                            fill="currentColor"
                                          >
                                            <path
                                              fillRule="evenodd"
                                              d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                                              clipRule="evenodd"
                                            />
                                          </svg>
                                          Capture Photo
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {account["col9"]?.toUpperCase() === "YES" && (
                                  <span className="text-xs text-red-500">
                                    * Required
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan={13}
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

export default DirectorDataPage;
