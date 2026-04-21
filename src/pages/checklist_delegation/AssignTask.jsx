import { useState, useEffect } from "react";
import { BellRing, FileCheck, Calendar } from "lucide-react";
import AdminLayout from "../../components/checklist_delegation/AdminLayout";

// Calendar Component (defined outside)
const CalendarComponent = ({ date, onChange, onClose }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year, month) => {
    return new Date(year, month, 1).getDay();
  };

  const handleDateClick = (day) => {
    const selectedDate = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day
    );
    onChange(selectedDate);
    onClose();
  };

  const renderDays = () => {
    const days = [];
    const daysInMonth = getDaysInMonth(
      currentMonth.getFullYear(),
      currentMonth.getMonth()
    );
    const firstDayOfMonth = getFirstDayOfMonth(
      currentMonth.getFullYear(),
      currentMonth.getMonth()
    );

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="h-8 w-8"></div>);
    }

    // Add cells for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const isSelected =
        date &&
        date.getDate() === day &&
        date.getMonth() === currentMonth.getMonth() &&
        date.getFullYear() === currentMonth.getFullYear();

      days.push(
        <button
          key={day}
          type="button"
          onClick={() => handleDateClick(day)}
          className={`h-8 w-8 rounded-full flex items-center justify-center text-sm ${isSelected
            ? "bg-purple-600 text-white"
            : "hover:bg-purple-100 text-gray-700"
            }`}
        >
          {day}
        </button>
      );
    }

    return days;
  };

  const prevMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    );
  };

  const nextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    );
  };

  return (
    <div className="p-2 bg-white border border-gray-200 rounded-md shadow-md">
      <div className="flex justify-between items-center mb-2">
        <button
          type="button"
          onClick={prevMonth}
          className="p-1 hover:bg-gray-100 rounded-full"
        >
          &lt;
        </button>
        <div className="text-sm font-medium">
          {currentMonth.toLocaleString("default", { month: "long" })}{" "}
          {currentMonth.getFullYear()}
        </div>
        <button
          type="button"
          onClick={nextMonth}
          className="p-1 hover:bg-gray-100 rounded-full"
        >
          &gt;
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
          <div
            key={day}
            className="h-8 w-8 flex items-center justify-center text-xs text-gray-500"
          >
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">{renderDays()}</div>
    </div>
  );
};

// Helper functions for date manipulation
const formatDate = (date) => {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const addDays = (date, days) => {
  const newDate = new Date(date);
  newDate.setDate(newDate.getDate() + days);
  return newDate;
};

const addMonths = (date, months) => {
  const newDate = new Date(date);
  newDate.setMonth(newDate.getMonth() + months);
  return newDate;
};

const addYears = (date, years) => {
  const newDate = new Date(date);
  newDate.setFullYear(newDate.getFullYear() + years);
  return newDate;
};

export default function AssignTask() {
  const [date, setSelectedDate] = useState(null);
  const [time, setTime] = useState("09:00"); // Add this line
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedTasks, setGeneratedTasks] = useState([]);
  const [showCalendar, setShowCalendar] = useState(false);
  const [accordionOpen, setAccordionOpen] = useState(false);

  // Add new state variables for dropdown options
  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [givenByOptions, setGivenByOptions] = useState([]);
  const [allDoerOptions, setAllDoerOptions] = useState([]);
  const [filteredDoerOptions, setFilteredDoerOptions] = useState([]);
  const [availableLevels, setAvailableLevels] = useState([]);

  const frequencies = [
    { value: "one-time", label: "One Time (No Recurrence)" },
    { value: "hourly", label: "Hourly" },
    { value: "daily", label: "Daily" },
    { value: "weekly", label: "Weekly" },
    { value: "fortnightly", label: "Fortnightly" },
    { value: "monthly", label: "Monthly" },
    { value: "quarterly", label: "Quarterly" },
    { value: "yearly", label: "Yearly" },
    { value: "end-of-1st-week", label: "End of 1st Week" },
    { value: "end-of-2nd-week", label: "End of 2nd Week" },
    { value: "end-of-3rd-week", label: "End of 3rd Week" },
    { value: "end-of-4th-week", label: "End of 4th Week" },
    { value: "end-of-last-week", label: "End of Last Week" },
  ];

  const [formData, setFormData] = useState({
    department: "",
    givenBy: "",
    doer: "",
    taskLevel: "", // Added taskLevel
    description: "",
    frequency: "daily",
    enableReminders: true,
    requireAttachment: false,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const newFormData = { ...prev, [name]: value };

      // If department changes, reset doer and filter doer options
      if (name === "department") {
        newFormData.doer = "";
        newFormData.taskLevel = "";
        setAvailableLevels([]);
        filterDoerOptions(value);
      }

      // If doer changes, fetch available levels
      if (name === "doer") {
        newFormData.taskLevel = "";
        if (value) {
          fetchAvailableLevels(prev.department, value);
        } else {
          setAvailableLevels([]);
        }
      }

      return newFormData;
    });
  };

  const handleSwitchChange = (name, e) => {
    setFormData((prev) => ({ ...prev, [name]: e.target.checked }));
  };

  // Function to filter doer options based on selected shop
  const filterDoerOptions = (selectedShop) => {
    if (!selectedShop) {
      setFilteredDoerOptions([]);
      return;
    }

    const filtered = allDoerOptions.filter(doer => doer.shop === selectedShop);
    setFilteredDoerOptions(filtered.map(doer => doer.name));
  };

  // Function to fetch available levels for a specific doer and shop
  const fetchAvailableLevels = async (shop, doerName) => {
    if (!shop || !doerName) {
      setAvailableLevels([]);
      return;
    }

    try {
      const sheetId = "1GnzBl9yq2M5FXBeCNnPIVL5PFSTXi2T3SBBOCHAKqMs";
      const sheetName = "Task Details";

      const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(
        sheetName
      )}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch task details: ${response.status}`);

      const text = await response.text();
      const jsonStart = text.indexOf("{");
      const jsonEnd = text.lastIndexOf("}");
      const data = JSON.parse(text.substring(jsonStart, jsonEnd + 1));

      if (!data.table || !data.table.rows) return;

      const levels = new Set();
      data.table.rows.forEach(row => {
        const rowShop = row.c?.[1]?.v?.toString().trim();
        const rowDoer = row.c?.[2]?.v?.toString().trim();
        const rowLevel = row.c?.[3]?.v?.toString().trim();

        if (rowShop === shop && rowDoer === doerName && rowLevel) {
          levels.add(rowLevel);
        }
      });

      const levelList = Array.from(levels).sort();
      setAvailableLevels(levelList);

      // Auto-select if only one level is available
      if (levelList.length === 1) {
        setFormData(prev => ({ ...prev, taskLevel: levelList[0] }));
      }
    } catch (error) {
      console.error("Error fetching available levels:", error);
    }
  };

  // Auto-trigger generation when Shop, Doer, and Level are all selected
  useEffect(() => {
    if (formData.department && formData.doer && formData.taskLevel) {
      generateTasks();
    }
  }, [formData.department, formData.doer, formData.taskLevel]);

  // DON'T SLICE - Check ALL rows including row 0
  const fetchMasterSheetOptions = async () => {
    try {
      const username = sessionStorage.getItem("username") || ""
      const userRole = sessionStorage.getItem("role") || ""
      const isAdmin = userRole.toLowerCase().includes("admin")

      const masterSheetId = "1GnzBl9yq2M5FXBeCNnPIVL5PFSTXi2T3SBBOCHAKqMs";
      const masterSheetName = "MASTER";

      const url = `https://docs.google.com/spreadsheets/d/${masterSheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(
        masterSheetName
      )}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch master data: ${response.status}`);
      }

      const text = await response.text();
      const jsonStart = text.indexOf("{");
      const jsonEnd = text.lastIndexOf("}");
      const jsonString = text.substring(jsonStart, jsonEnd + 1);
      const data = JSON.parse(jsonString);

      if (!data.table || !data.table.rows) {
        console.log("No master data found");
        return;
      }

      console.log("=== ALL ROWS (NO SLICE) ===")
      console.log("Total rows:", data.table.rows.length)

      // Check first 5 rows WITHOUT slicing
      for (let i = 0; i < Math.min(5, data.table.rows.length); i++) {
        console.log(`API Row ${i}:`, {
          'C (username)': data.table.rows[i]?.c?.[2]?.v,
          'E (role)': data.table.rows[i]?.c?.[4]?.v,
          'J (access)': data.table.rows[i]?.c?.[9]?.v
        })
      }

      // NOW FIND ADMIN - check ALL rows, not just after slice
      const allRows = data.table.rows.map((row, index) => ({
        apiIndex: index,
        userName: row?.c?.[2]?.v,
        userRole: row?.c?.[4]?.v,
        accessDepartments: row?.c?.[9]?.v
      }))

      console.log("=== SEARCHING IN ALL ROWS ===")
      let accessibleDepartments = []

      if (isAdmin) {
        // Collect ALL unique departments from Column A
        const allDepts = data.table.rows.slice(1).map(row => row?.c?.[0]?.v).filter(dept => !!dept && dept !== "")
        accessibleDepartments = [...new Set(allDepts)];
      } else {
        const userRow = allRows.find(item =>
          item.userRole?.toLowerCase() === userRole.toLowerCase() &&
          item.userName?.toLowerCase() === username.toLowerCase()
        )

        if (userRow && userRow.accessDepartments) {
          accessibleDepartments = userRow.accessDepartments
            .split(',')
            .map(dept => dept.trim())
            .filter(dept => dept !== "")
        }
      }

      // Now process data - slice(1) to skip header
      const givenBy = [];
      const doerData = [];

      data.table.rows.slice(0).forEach((row) => {
        if (row.c) {
          const givenByValue = row.c[1] && row.c[1].v ? row.c[1].v.toString().trim() : "";
          const doerName = row.c[2] && row.c[2].v ? row.c[2].v.toString().trim() : "";
          const shop = row.c[5] && row.c[5].v ? row.c[5].v.toString().trim() : "";

          if (givenByValue !== "") {
            givenBy.push(givenByValue);
          }

          if (doerName !== "" && shop !== "" && accessibleDepartments.includes(shop)) {
            doerData.push({
              name: doerName,
              shop: shop
            });
          }
        }
      });

      setDepartmentOptions([...new Set(accessibleDepartments)].sort());
      setGivenByOptions([...new Set(givenBy)].sort());
      setAllDoerOptions(doerData);

      console.log("Final departments:", accessibleDepartments)
    } catch (error) {
      console.error("Error:", error);
      setDepartmentOptions([]);
      setGivenByOptions([]);
      setAllDoerOptions([]);
    }
  };

  // Update date display format
  const getFormattedDate = (date) => {
    if (!date) return "Select a date";
    return formatDate(date);
  };


  useEffect(() => {
    fetchMasterSheetOptions();
  }, []);

  // Add a function to get the last task ID from the specified sheet
  const getLastTaskId = async (sheetName) => {
    try {
      const url = `https://docs.google.com/spreadsheets/d/1GnzBl9yq2M5FXBeCNnPIVL5PFSTXi2T3SBBOCHAKqMs/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(
        sheetName
      )}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch sheet data: ${response.status}`);
      }

      const text = await response.text();
      const jsonStart = text.indexOf("{");
      const jsonEnd = text.lastIndexOf("}");
      const jsonString = text.substring(jsonStart, jsonEnd + 1);
      const data = JSON.parse(jsonString);

      if (!data.table || !data.table.rows || data.table.rows.length === 0) {
        return 0; // Start from 1 if no tasks exist
      }

      // Get the last task ID from column B (index 1)
      let lastTaskId = 0;
      data.table.rows.forEach((row) => {
        if (row.c && row.c[1] && row.c[1].v) {
          const taskId = parseInt(row.c[1].v);
          if (!isNaN(taskId) && taskId > lastTaskId) {
            lastTaskId = taskId;
          }
        }
      });

      return lastTaskId;
    } catch (error) {
      console.error("Error fetching last task ID:", error);
      return 0;
    }
  };

  // Add this date formatting helper function
  // Add this date formatting helper function
  const formatDateToDDMMYYYY = (date, time = null) => {
    const d = new Date(date);
    const day = d.getDate().toString().padStart(2, "0");
    const month = (d.getMonth() + 1).toString().padStart(2, "0");
    const year = d.getFullYear();

    if (time) {
      return `${day}/${month}/${year} ${time}`;
    }
    return `${day}/${month}/${year}`;
  };

  // Function to fetch working days from the Working Day Calendar sheet
  const fetchWorkingDays = async () => {
    try {
      const sheetId = "1GnzBl9yq2M5FXBeCNnPIVL5PFSTXi2T3SBBOCHAKqMs";
      const sheetName = "Working Day Calendar";

      const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(
        sheetName
      )}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch working days: ${response.status}`);
      }

      const text = await response.text();
      const jsonStart = text.indexOf("{");
      const jsonEnd = text.lastIndexOf("}");
      const jsonString = text.substring(jsonStart, jsonEnd + 1);
      const data = JSON.parse(jsonString);

      if (!data.table || !data.table.rows) {
        console.log("No working day data found");
        return [];
      }

      // Extract dates from column A
      const workingDays = [];
      data.table.rows.forEach((row) => {
        if (row.c && row.c[0] && row.c[0].v) {
          let dateValue = row.c[0].v;

          // Handle Google Sheets Date(year,month,day) format
          if (typeof dateValue === "string" && dateValue.startsWith("Date(")) {
            const match = /Date\((\d+),(\d+),(\d+)\)/.exec(dateValue);
            if (match) {
              const year = parseInt(match[1], 10);
              const month = parseInt(match[2], 10); // 0-indexed in Google's format
              const dateDay = parseInt(match[3], 10);

              dateValue = `${dateDay.toString().padStart(2, "0")}/${(month + 1)
                .toString()
                .padStart(2, "0")}/${year}`;
            }
          } else if (dateValue instanceof Date) {
            // If it's a Date object
            dateValue = formatDateToDDMMYYYY(dateValue);
          }

          // Add to working days if it's a valid date string
          if (
            typeof dateValue === "string" &&
            dateValue.match(/^\d{2}\/\d{2}\/\d{4}$/)
          ) {
            workingDays.push(dateValue);
          }
        }
      });

      console.log(`Fetched ${workingDays.length} working days`);
      return workingDays;
    } catch (error) {
      console.error("Error fetching working days:", error);
      return []; // Return empty array if fetch fails
    }
  };

  // Helper function to find the closest working day to a target date
  const findClosestWorkingDayIndex = (workingDays, targetDateStr) => {
    // Parse the target date
    const [targetDay, targetMonth, targetYear] = targetDateStr.split('/').map(Number);
    const targetDate = new Date(targetYear, targetMonth - 1, targetDay);

    // Find the closest working day (preferably after the target date)
    let closestIndex = -1;
    let minDifference = Infinity;

    for (let i = 0; i < workingDays.length; i++) {
      const [workingDay, workingMonth, workingYear] = workingDays[i].split('/').map(Number);
      const currentDate = new Date(workingYear, workingMonth - 1, workingDay);

      // Calculate difference in days
      const difference = Math.abs((currentDate - targetDate) / (1000 * 60 * 60 * 24));

      if (currentDate >= targetDate && difference < minDifference) {
        minDifference = difference;
        closestIndex = i;
      }
    }

    // Return -1 if no working day found after the target date
    // Don't return any fallback index
    return closestIndex;
  };

  // Helper function to find the date for the end of a specific week in a month
  const findEndOfWeekDate = (date, weekNumber, workingDays) => {
    const year = date.getFullYear();
    const month = date.getMonth();

    // Get all working days in the target month
    const daysInMonth = workingDays.filter(dateStr => {
      const [, m, y] = dateStr.split('/').map(Number);
      return y === year && m === month + 1;
    });

    // Sort them chronologically
    daysInMonth.sort((a, b) => {
      const [dayA] = a.split('/').map(Number);
      const [dayB] = b.split('/').map(Number);
      return dayA - dayB;
    });

    // Group by weeks (assuming Monday is the first day of the week)
    const weekGroups = [];
    let currentWeek = [];
    let lastWeekDay = -1;

    for (const dateStr of daysInMonth) {
      const [workingDay2, m, y] = dateStr.split('/').map(Number);
      const dateObj = new Date(y, m - 1, workingDay2);
      const weekDay = dateObj.getDay(); // 0 for Sunday, 1 for Monday, etc.

      if (weekDay <= lastWeekDay || currentWeek.length === 0) {
        if (currentWeek.length > 0) {
          weekGroups.push(currentWeek);
        }
        currentWeek = [dateStr];
      } else {
        currentWeek.push(dateStr);
      }

      lastWeekDay = weekDay;
    }

    if (currentWeek.length > 0) {
      weekGroups.push(currentWeek);
    }

    // Return the last day of the requested week
    if (weekNumber === -1) {
      // Last week of the month
      return weekGroups[weekGroups.length - 1]?.[weekGroups[weekGroups.length - 1].length - 1] || daysInMonth[daysInMonth.length - 1];
    } else if (weekNumber > 0 && weekNumber <= weekGroups.length) {
      // Specific week
      return weekGroups[weekNumber - 1]?.[weekGroups[weekNumber - 1].length - 1] || daysInMonth[daysInMonth.length - 1];
    } else {
      // Default to the last day of the month if the requested week doesn't exist
      return daysInMonth[daysInMonth.length - 1];
    }
  };

  // Function to remove a task from the generated tasks list
  const removeTask = (index) => {
    setGeneratedTasks((prev) => prev.filter((_, i) => i !== index));
  };

  // Simplified generateTasks to only fetch UNIQUE tasks for the preview
  const generateTasks = async () => {
    if (!formData.department || !formData.doer || !formData.taskLevel) return;

    try {
      const sheetId = "1GnzBl9yq2M5FXBeCNnPIVL5PFSTXi2T3SBBOCHAKqMs";
      const sheetName = "Task Details";

      const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(
        sheetName
      )}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch task details: ${response.status}`);

      const text = await response.text();
      const jsonStart = text.indexOf("{");
      const jsonEnd = text.lastIndexOf("}");
      const data = JSON.parse(text.substring(jsonStart, jsonEnd + 1));

      if (!data.table || !data.table.rows) return;

      // Fetch UNIQUE tasks: Match Shop (B), Doer (C), and Level (D)
      const uniqueTasks = new Set();
      data.table.rows.forEach(row => {
        const shop = row.c?.[1]?.v?.toString().trim();
        const doer = row.c?.[2]?.v?.toString().trim();
        const level = row.c?.[3]?.v?.toString().trim();

        if (shop === formData.department && doer === formData.doer && level === formData.taskLevel) {
          const englishTask = row.c?.[5]?.v?.toString().trim() || "";
          const hindiTask = row.c?.[6]?.v?.toString().trim() || "";
          if (englishTask || hindiTask) {
            uniqueTasks.add(`${englishTask} ${hindiTask}`.trim());
          }
        }
      });

      const taskList = Array.from(uniqueTasks);
      setGeneratedTasks(taskList);
      if (taskList.length > 0) setAccordionOpen(true);

    } catch (error) {
      console.error("Error generating tasks:", error);
    }
  };


  // Reworked handleSubmit: Handles date expansion and batch submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Combine unique tasks from preview with manual description if any
      const finalDescriptions = [...generatedTasks];
      if (formData.description) {
        finalDescriptions.push(formData.description);
      }

      if (finalDescriptions.length === 0) {
        alert("Please select a Task Level or enter a manual description.");
        setIsSubmitting(false);
        return;
      }

      if (!date || !formData.frequency) {
        alert("Please select a start date and frequency.");
        setIsSubmitting(false);
        return;
      }

      // Fetch working days for expansion
      const workingDays = await fetchWorkingDays();
      if (workingDays.length === 0) {
        alert("Working Day Calendar is empty. Please configure it in the sheet.");
        setIsSubmitting(false);
        return;
      }

      const sortedWorkingDays = [...workingDays].sort((a, b) => {
        const [dayA, monthA, yearA] = a.split('/').map(Number);
        const [dayB, monthB, yearB] = b.split('/').map(Number);
        return new Date(yearA, monthA - 1, dayA) - new Date(yearB, monthB - 1, dayB);
      });

      const selectedDate = new Date(date);
      const futureDates = sortedWorkingDays.filter(dateStr => {
        const [d, m, y] = dateStr.split('/').map(Number);
        return new Date(y, m - 1, d) >= selectedDate;
      });

      if (futureDates.length === 0) {
        alert("No future working days available from the selected date.");
        setIsSubmitting(false);
        return;
      }

      const startDateStr = formatDateToDDMMYYYY(selectedDate);
      let startIndex = futureDates.indexOf(startDateStr);
      if (startIndex === -1) startIndex = 0;

      const expandedTasks = [];
      finalDescriptions.forEach(desc => {
        if (formData.frequency === "one-time" || formData.frequency === "hourly") {
          expandedTasks.push({ desc, dueDate: `${futureDates[startIndex]} ${time}` });
        } else {
          let currentIndex = startIndex;
          while (currentIndex < futureDates.length) {
            const taskDateStr = futureDates[currentIndex];
            expandedTasks.push({ desc, dueDate: `${taskDateStr} ${time}` });

            // Frequency steps
            switch (formData.frequency) {
              case "daily":
                currentIndex += 1;
                break;
              case "weekly": {
                const [d, m, y] = taskDateStr.split('/').map(Number);
                const next = addDays(new Date(y, m - 1, d), 7);
                const nextStr = formatDateToDDMMYYYY(next);
                const nextIdx = findClosestWorkingDayIndex(futureDates, nextStr);
                currentIndex = (nextIdx !== -1 && nextIdx > currentIndex) ? nextIdx : futureDates.length;
                break;
              }
              case "fortnightly": {
                const [d, m, y] = taskDateStr.split('/').map(Number);
                const next = addDays(new Date(y, m - 1, d), 14);
                const nextStr = formatDateToDDMMYYYY(next);
                const nextIdx = findClosestWorkingDayIndex(futureDates, nextStr);
                currentIndex = (nextIdx !== -1 && nextIdx > currentIndex) ? nextIdx : futureDates.length;
                break;
              }
              case "monthly": {
                const [d, m, y] = taskDateStr.split('/').map(Number);
                const next = addMonths(new Date(y, m - 1, d), 1);
                const nextStr = formatDateToDDMMYYYY(next);
                const nextIdx = findClosestWorkingDayIndex(futureDates, nextStr);
                currentIndex = (nextIdx !== -1 && nextIdx > currentIndex) ? nextIdx : futureDates.length;
                break;
              }
              case "quarterly": {
                const [d, m, y] = taskDateStr.split('/').map(Number);
                const next = addMonths(new Date(y, m - 1, d), 3);
                const nextStr = formatDateToDDMMYYYY(next);
                const nextIdx = findClosestWorkingDayIndex(futureDates, nextStr);
                currentIndex = (nextIdx !== -1 && nextIdx > currentIndex) ? nextIdx : futureDates.length;
                break;
              }
              case "yearly": {
                const [d, m, y] = taskDateStr.split('/').map(Number);
                const next = addYears(new Date(y, m - 1, d), 1);
                const nextStr = formatDateToDDMMYYYY(next);
                const nextIdx = findClosestWorkingDayIndex(futureDates, nextStr);
                currentIndex = (nextIdx !== -1 && nextIdx > currentIndex) ? nextIdx : futureDates.length;
                break;
              }
              case "end-of-1st-week":
              case "end-of-2nd-week":
              case "end-of-3rd-week":
              case "end-of-4th-week":
              case "end-of-last-week": {
                const [d, m, y] = taskDateStr.split('/').map(Number);
                const targetDay = addMonths(new Date(y, m - 1, d), 1);
                let wn;
                if (formData.frequency === "end-of-1st-week") wn = 1;
                else if (formData.frequency === "end-of-2nd-week") wn = 2;
                else if (formData.frequency === "end-of-3rd-week") wn = 3;
                else if (formData.frequency === "end-of-4th-week") wn = 4;
                else if (formData.frequency === "end-of-last-week") wn = -1;
                const targetStr = findEndOfWeekDate(targetDay, wn, futureDates);
                const nextIdx = futureDates.indexOf(targetStr);
                currentIndex = nextIdx > currentIndex ? nextIdx : futureDates.length;
                break;
              }
              default:
                currentIndex = futureDates.length;
            }
          }
        }
      });

      const submitSheetName = (formData.frequency === "one-time" || formData.frequency === "hourly") ? "DELEGATION" : formData.department;
      const lastTaskId = await getLastTaskId(submitSheetName);
      let nextTaskId = lastTaskId + 1;

      const tasksData = expandedTasks.map((t, i) => ({
        timestamp: formatDateToDDMMYYYY(new Date(), time),
        taskId: (nextTaskId + i).toString(),
        firm: formData.department,
        givenBy: formData.givenBy,
        name: formData.doer,
        description: t.desc,
        startDate: t.dueDate,
        freq: formData.frequency,
        enableReminders: formData.enableReminders ? "Yes" : "No",
        requireAttachment: formData.requireAttachment ? "Yes" : "No"
      }));

      const formPayload = new FormData();
      formPayload.append("sheetName", submitSheetName);
      formPayload.append("action", "insert");
      formPayload.append("batchInsert", "true");
      formPayload.append("rowData", JSON.stringify(tasksData));

      await fetch("https://script.google.com/macros/s/AKfycbyBPTmVksbejNrOPNZNHYajQWWLbzA34hshoAPYig99hcqkYuiKy-j5pavsuqeFKIXNFg/exec", {
        method: "POST",
        body: formPayload,
        mode: "no-cors",
      });

      alert(`Successfully submitted ${tasksData.length} tasks to ${submitSheetName} sheet!`);

      setFormData({
        department: "", givenBy: "", doer: "", taskLevel: "",
        description: "", frequency: "daily", enableReminders: true, requireAttachment: false
      });
      setSelectedDate(null);
      setGeneratedTasks([]);
      setAccordionOpen(false);
      setFilteredDoerOptions([]);
    } catch (error) {
      console.error("Submission error:", error);
      alert("Failed to assign tasks. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold tracking-tight mb-6 text-purple-500">
          Assign New Task
        </h1>
        <div className="rounded-lg border border-purple-200 bg-white shadow-md overflow-hidden">
          <form onSubmit={handleSubmit}>
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 border-b border-purple-100">
              <h2 className="text-xl font-semibold text-purple-700">
                Task Details
              </h2>
              <p className="text-purple-600">
                Fill in the details to assign a new task to a staff member.
              </p>
            </div>
            <div className="p-6 space-y-4">
              {/* Department Name Dropdown */}
              <div className="space-y-2">
                <label
                  htmlFor="department"
                  className="block text-sm font-medium text-purple-700"
                >
                  Shop Name
                </label>
                <select
                  id="department"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  required
                  className="w-full rounded-md border border-purple-200 p-2 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                >
                  <option value="">Select Shop</option>
                  {departmentOptions.map((dept, index) => (
                    <option key={index} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              {/* Given By Dropdown */}
              <div className="space-y-2">
                <label
                  htmlFor="givenBy"
                  className="block text-sm font-medium text-purple-700"
                >
                  Given By
                </label>
                <select
                  id="givenBy"
                  name="givenBy"
                  value={formData.givenBy}
                  onChange={handleChange}
                  required
                  className="w-full rounded-md border border-purple-200 p-2 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                >
                  <option value="">Select Given By</option>
                  {givenByOptions.map((person, index) => (
                    <option key={index} value={person}>
                      {person}
                    </option>
                  ))}
                </select>
              </div>

              {/* Doer's Name Dropdown - Now filtered by selected shop */}
              <div className="space-y-2">
                <label
                  htmlFor="doer"
                  className="block text-sm font-medium text-purple-700"
                >
                  Doer's Name
                </label>
                <select
                  id="doer"
                  name="doer"
                  value={formData.doer}
                  onChange={handleChange}
                  required
                  disabled={!formData.department}
                  className="w-full rounded-md border border-purple-200 p-2 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {!formData.department ? "Select Shop first" : "Select Doer"}
                  </option>
                  {filteredDoerOptions.map((doer, index) => (
                    <option key={index} value={doer}>
                      {doer}
                    </option>
                  ))}
                </select>
              </div>

              {/* Task Level Dropdown */}
              <div className="space-y-2">
                <label
                  htmlFor="taskLevel"
                  className="block text-sm font-medium text-purple-700"
                >
                  Task Level
                </label>
                <select
                  id="taskLevel"
                  name="taskLevel"
                  value={formData.taskLevel}
                  onChange={handleChange}
                  className="w-full rounded-md border border-purple-200 p-2 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                >
                  <option value="">
                    {availableLevels.length > 0 ? "Select Level" : "No Levels Available"}
                  </option>
                  {availableLevels.map((level) => (
                    <option key={level} value={level}>
                      {level.startsWith("L") ? `Level${level.substring(1)}` : level}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-purple-700"
                >
                  Task Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Enter task description"
                  rows={4}
                  className="w-full rounded-md border border-purple-200 p-2 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              {/* Date and Frequency */}
              {/* Date, Time and Frequency */}
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-purple-700">
                    Task End Date
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowCalendar(!showCalendar)}
                      className="w-full flex justify-start items-center rounded-md border border-purple-200 p-2 text-left focus:outline-none focus:ring-1 focus:ring-purple-500"
                    >
                      <Calendar className="mr-2 h-4 w-4 text-purple-500" />
                      {date ? getFormattedDate(date) : "Select a date"}
                    </button>
                    {showCalendar && (
                      <div className="absolute z-10 mt-1">
                        <CalendarComponent
                          date={date}
                          onChange={setSelectedDate}
                          onClose={() => setShowCalendar(false)}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="time"
                    className="block text-sm font-medium text-purple-700"
                  >
                    Task End Time
                  </label>
                  <input
                    type="time"
                    id="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full rounded-md border border-purple-200 p-2 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="frequency"
                    className="block text-sm font-medium text-purple-700"
                  >
                    Frequency
                  </label>
                  <select
                    id="frequency"
                    name="frequency"
                    value={formData.frequency}
                    onChange={handleChange}
                    className="w-full rounded-md border border-purple-200 p-2 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  >
                    {frequencies.map((freq) => (
                      <option key={freq.value} value={freq.value}>
                        {freq.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {/* Additional Options */}
              <div className="space-y-4 pt-2 border-t border-purple-100">
                <h3 className="text-lg font-medium text-purple-700 pt-2">
                  Additional Options
                </h3>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label
                      htmlFor="enable-reminders"
                      className="text-purple-700 font-medium"
                    >
                      Enable Reminders
                    </label>
                    <p className="text-sm text-purple-600">
                      Send reminders before task due date
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <BellRing className="h-4 w-4 text-purple-500" />
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        id="enable-reminders"
                        checked={formData.enableReminders}
                        onChange={(e) =>
                          handleSwitchChange("enableReminders", e)
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label
                      htmlFor="require-attachment"
                      className="text-purple-700 font-medium"
                    >
                      Require Attachment
                    </label>
                    <p className="text-sm text-purple-600">
                      User must upload a file when completing task
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <FileCheck className="h-4 w-4 text-purple-500" />
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        id="require-attachment"
                        checked={formData.requireAttachment}
                        onChange={(e) =>
                          handleSwitchChange("requireAttachment", e)
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Preview and Submit Buttons */}
              <div className="space-y-4">


                {generatedTasks.length > 0 && (
                  <div className="w-full">
                    <div className="border border-purple-200 rounded-md bg-white shadow-sm overflow-hidden">
                      <div className="bg-purple-50 p-3 border-b border-purple-200 flex justify-between items-center">
                        <span className="font-semibold text-purple-700">
                          {formData.taskLevel} Unique Tasks ({generatedTasks.length})
                        </span>
                        <span className="text-xs text-purple-500 uppercase tracking-wider font-bold">
                          Preview
                        </span>
                      </div>

                      <div className="p-4">
                        <ul className="space-y-2 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                          {generatedTasks.map((taskDesc, index) => (
                            <li
                              key={index}
                              className="group flex items-start justify-between bg-white border border-purple-100 p-3 rounded-lg hover:border-purple-300 hover:shadow-sm transition-all duration-200"
                            >
                              <div className="flex items-start space-x-3">
                                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-purple-400 flex-shrink-0 group-hover:bg-purple-600"></span>
                                <span className="text-sm font-medium text-purple-800 leading-relaxed">
                                  {taskDesc}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeTask(index)}
                                className="ml-4 p-1.5 text-red-500 hover:opacity-100 hover:bg-red-50 rounded-full transition-all duration-200 opacity-60"
                                title="Delete task"
                              >
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2.5}
                                    d="M6 18L18 6M6 6l12 12"
                                  />
                                </svg>
                              </button>
                            </li>
                          ))}
                        </ul>
                        {generatedTasks.length === 0 && (
                          <p className="text-center text-sm text-purple-400 py-4 italic">
                            No tasks in preview.
                          </p>
                        )}
                        <p className="mt-4 text-[10px] text-purple-400 font-medium uppercase tracking-widest text-right">
                          Expansion will happen on "Assign Task"
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-between bg-gradient-to-r from-purple-50 to-pink-50 p-6 border-t border-purple-100">
              <button
                type="button"
                onClick={() => {
                  setFormData({
                    department: "",
                    givenBy: "",
                    doer: "",
                    taskLevel: "",
                    description: "",
                    frequency: "daily",
                    enableReminders: true,
                    requireAttachment: false,
                  });
                  setSelectedDate(null);
                  setGeneratedTasks([]);
                  setAccordionOpen(false);
                  setFilteredDoerOptions([]);
                }}
                className="rounded-md border border-purple-200 py-2 px-4 text-purple-700 hover:border-purple-300 hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-md bg-gradient-to-r from-purple-600 to-pink-600 py-2 px-4 text-white hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Assigning..." : "Assign Task"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AdminLayout>
  );
}