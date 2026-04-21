import { useState, useEffect } from "react"
import { fetchUserDetailsApi, patchSystemAccessApi } from "../redux/api/settingApi";
import { fetchSystemsApi } from "../redux/api/systemsApi";
import { fetchAttendanceSummaryApi } from "../redux/api/attendenceApi";
import { Award, Target, ListTodo, Clock, CheckCircle2, Search, Filter, Download, ChevronDown, X, User, Activity, Timer } from "lucide-react";
import searchIcon from "../assets/search-icon-logo.png";
import { SCRIPT_URLS, DEVICE_LOGS_BASE_URL } from '../utils/envConfig';

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyBPTmVksbejNrOPNZNHYajQWWLbzA34hshoAPYig99hcqkYuiKy-j5pavsuqeFKIXNFg/exec";

const DEVICES = [
    { name: 'ALL DEVICES', serial: 'ALL', apiName: 'ALL' },
    { name: 'BAWDHAN', apiName: 'BAVDHAN', serial: 'C26238441B1E342D' },
    { name: 'HINJEWADI', apiName: 'HINJEWADI', serial: 'AMDB25061400335' },
    { name: 'WAGHOLI', apiName: 'WAGHOLI', serial: 'AMDB25061400343' },
    { name: 'AKOLE', apiName: 'AKOLE', serial: 'C262CC13CF202038' },
    { name: 'MUMBAI', apiName: 'MUMBAI', serial: 'C2630450C32A2327' }
];

const HomePage = () => {
    const [userDetails, setUserDetails] = useState(null);
    const [allUsers, setAllUsers] = useState([]);
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("");
    const [departmentFilter, setDepartmentFilter] = useState("");
    const [systemsList, setSystemsList] = useState([]);
    const [attendance, setAttendance] = useState(null);
    const [attendanceFilter, setAttendanceFilter] = useState("");
    const [todaysTasks, setTodaysTasks] = useState([]);
    const [isTasksLoading, setIsTasksLoading] = useState(false);
    const [taskStats, setTaskStats] = useState({ completed: 0, pending: 0, overdue: 0, total: 0 });
    const [taskDeptFilter, setTaskDeptFilter] = useState("All");
    const [availableTaskDepts, setAvailableTaskDepts] = useState(["All"]);

    // Detailed Biometric Attendance State
    const [biometricAttendance, setBiometricAttendance] = useState([]);
    const [loadingBiometric, setLoadingBiometric] = useState(false);
    const [selectedDevice, setSelectedDevice] = useState(DEVICES[0]);
    const [biometricStats, setBiometricStats] = useState(null);

    // Date/Data utility functions copied from Checklist Dashboard logic
    const formatDateToDDMMYYYY = (date) => {
        const day = date.getDate().toString().padStart(2, "0")
        const month = (date.getMonth() + 1).toString().padStart(2, "0")
        const year = date.getFullYear()
        return `${day}/${month}/${year}`
    }

    const parseDateFromDDMMYYYY = (dateStr) => {
        if (!dateStr || typeof dateStr !== "string") return null
        const parts = dateStr.split("/")
        if (parts.length !== 3) return null
        return new Date(parts[2], parts[1] - 1, parts[0])
    }

    const parseGoogleSheetsDate = (dateValue) => {
        if (!dateValue) return ""
        if (dateValue instanceof Date && !isNaN(dateValue.getTime())) {
            return formatDateToDDMMYYYY(dateValue)
        }
        if (typeof dateValue === "string") {
            if (dateValue.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
                const parts = dateValue.split("/")
                return `${parts[0].padStart(2, "0")}/${parts[1].padStart(2, "0")}/${parts[2]}`
            }
            if (dateValue.startsWith("Date(")) {
                const match = /Date\((\d+),(\d+),(\d+)\)/.exec(dateValue)
                if (match) {
                    const year = parseInt(match[1], 10)
                    const month = parseInt(match[2], 10)
                    const day = parseInt(match[3], 10)
                    return `${day.toString().padStart(2, "0")}/${(month + 1).toString().padStart(2, "0")}/${year}`
                }
            }
            try {
                const date = new Date(dateValue)
                if (!isNaN(date.getTime())) return formatDateToDDMMYYYY(date)
            } catch (e) { }
        }
        if (typeof dateValue === "number") {
            const excelEpoch = new Date(1900, 0, 1)
            const date = new Date(excelEpoch.getTime() + (dateValue - 2) * 24 * 60 * 60 * 1000)
            if (!isNaN(date.getTime())) return formatDateToDDMMYYYY(date)
        }
        return dateValue.toString()
    }

    const fetchDataFromAppsScript = async (sheetName) => {
        try {
            const response = await fetch(`${APPS_SCRIPT_URL}?sheet=${encodeURIComponent(sheetName)}&action=searchTasks`)
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
            const data = await response.json()
            if (!data.success && data.error) throw new Error(data.error)
            return data
        } catch (error) {
            console.error(`Error fetching ${sheetName}:`, error)
            return null
        }
    }

    const fetchTodaysTasks = async (currentUserDetails = null) => {
        try {
            setIsTasksLoading(true);
            const user = currentUserDetails || userDetails;
            const username = localStorage.getItem("user-name") || "";
            const userRole = localStorage.getItem("role") || "";
            const isAdmin = userRole.toLowerCase().includes("admin");
            const usernameLower = username.toLowerCase().trim();

            let accessibleDepartments = [];

            // 1. Get shops from localStorage 'shops_name'
            const storedShops = localStorage.getItem("shops_name");
            if (storedShops) {
                const shops = storedShops.split(',').map(s => s.trim()).filter(s => !!s);
                accessibleDepartments = [...accessibleDepartments, ...shops];
            }

            // 2. Get shops from 'tab_system_access' (Checklist Delegation section)
            try {
                const tabAccessRaw = localStorage.getItem("tab_system_access");
                if (tabAccessRaw) {
                    const tabAccess = JSON.parse(tabAccessRaw);
                    const checklistTabs = tabAccess["Checklist Delegation"] || [];
                    const systemPages = ['Dashboard', 'Assign Task', 'Delegation', 'Data', 'License', 'Training Video', 'Account Data'];
                    const assignedShops = checklistTabs.filter(tab => !systemPages.includes(tab));
                    accessibleDepartments = [...accessibleDepartments, ...assignedShops];
                }
            } catch (e) {
                console.error("Error parsing tab access for shops:", e);
            }

            // 3. Get primary department from userDetails (if available)
            if (user?.department && user.department !== "Department N/A") {
                accessibleDepartments.push(user.department);
            }

            // 4. Fetch MASTER sheet as a fallback/companion to get more departments
            const masterData = await fetchDataFromAppsScript("MASTER");
            if (masterData?.table?.rows) {
                const rows = masterData.table.rows.slice(1);
                const masterList = rows.map(row => ({
                    department: row?.c?.[0]?.v,
                    userName: row?.c?.[2]?.v,
                    userRole: row?.c?.[4]?.v,
                    accessDepartments: row?.c?.[9]?.v
                })).filter(item => !!item.userName);

                if (isAdmin) {
                    // For admins, collect all unique departments
                    const allDepts = [...new Set(masterList.map(item => item.department))].filter(dept => !!dept);
                    accessibleDepartments = [...new Set([...accessibleDepartments, ...allDepts])];
                } else {
                    const userRow = masterList.find(item =>
                        item.userName?.toLowerCase().trim() === usernameLower
                    );
                    if (userRow?.accessDepartments) {
                        const depts = userRow.accessDepartments.split(',').map(d => d.trim()).filter(d => !!d);
                        accessibleDepartments = [...accessibleDepartments, ...depts];
                    }
                    // Also check if the department column A matches the user
                    const assignedDepts = masterList
                        .filter(item => item.userName?.toLowerCase().trim() === usernameLower)
                        .map(item => item.department)
                        .filter(d => !!d);
                    accessibleDepartments = [...accessibleDepartments, ...assignedDepts];
                }
            }

            // Cleanup: unique and filtered
            accessibleDepartments = [...new Set(accessibleDepartments)]
                .map(d => d.trim())
                .filter(d => d && d !== "Select Department" && d !== "DELEGATION" && d !== "MASTER");

            console.log("Fetching tasks for departments:", accessibleDepartments);

            // 5. Fetch tasks for each accessible department
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayTime = today.getTime();

            let allAccTasks = [];
            let stats = { completed: 0, pending: 0, overdue: 0, total: 0 };

            // Optimization for Admin
            const deptsToFetch = isAdmin ? accessibleDepartments.slice(0, 8) : accessibleDepartments;

            for (const dept of deptsToFetch) {
                const data = await fetchDataFromAppsScript(dept);
                if (data?.table?.rows) {
                    const rows = data.table.rows;
                    for (let i = 1; i < rows.length; i++) {
                        const c = rows[i]?.c;
                        if (!c) continue;

                        const assignedTo = c[4]?.v || "Unassigned";
                        // Removed: individual assignedTo check to allow department-wide visibility for employees
                        // if (!isAdmin && assignedTo.toLowerCase().trim() !== usernameLower) continue;

                        const taskDateStr = parseGoogleSheetsDate(c[6]?.v);
                        const taskDate = parseDateFromDDMMYYYY(taskDateStr);
                        if (!taskDate) continue;

                        const completionDateValue = c[10]?.v;
                        const status = completionDateValue ? "completed" : (taskDate.getTime() < todayTime ? "overdue" : "pending");

                        // Add to list if it's for today
                        // Add to list if it's for today OR it is overdue (but user said only today, so let's stick to today)
                        // User: "u show the recent days data of each shop name onlt todays tasks"
                        if (taskDate.getTime() === todayTime) {
                            allAccTasks.push({
                                id: c[1]?.v || i,
                                title: c[5]?.v || "Untitled Task",
                                assignedTo,
                                date: taskDateStr,
                                status,
                                department: dept
                            });
                        }

                        // Aggregate stats for progress bar (everything up to today)
                        if (taskDate.getTime() <= todayTime) {
                            stats.total++;
                            if (status === "completed") stats.completed++;
                            else if (status === "overdue") stats.overdue++;
                            else stats.pending++;
                        }
                    }
                }
            }

            // Sort tasks: overdue first, then by title
            allAccTasks.sort((a, b) => {
                if (a.status === 'overdue' && b.status !== 'overdue') return -1;
                if (a.status !== 'overdue' && b.status === 'overdue') return 1;
                return a.title.localeCompare(b.title);
            });

            setTodaysTasks(allAccTasks);

            // Extract unique departments for filtering
            const depts = ["All", ...new Set(allAccTasks.map(t => t.department))];
            setAvailableTaskDepts(depts);

            setTaskStats(stats);
        } catch (error) {
            console.error("Error fetching tasks:", error);
        } finally {
            setIsTasksLoading(false);
        }
    };

    const formatSecsToHrsMins = (totalSecs) => {
        if (!totalSecs) return '0h 0m';
        const hrs = Math.floor(totalSecs / 3600);
        const mins = Math.floor((totalSecs % 3600) / 60);
        return `${hrs}h ${mins}m`;
    };

    const calculateLateMinutes = (timeStr) => {
        if (!timeStr || timeStr === '-') return 0;
        try {
            const timePart = timeStr.split(' ')[1];
            if (!timePart) return 0;
            const [h, m] = timePart.split(':').map(Number);
            const totalMins = h * 60 + m;
            const threshold = 10 * 60 + 10; // 10:10 AM
            const base = 10 * 60 + 0; // 10:00 AM
            if (totalMins > threshold) return totalMins - base;
            return 0;
        } catch (e) { return 0; }
    };

    const getDaysInMonth = (month, year) => {
        return new Date(year, month, 0).getDate();
    };

    const getSundaysCount = (month, year) => {
        let count = 0;
        const days = new Date(year, month, 0).getDate();
        for (let i = 1; i <= days; i++) {
            if (new Date(year, month - 1, i).getDay() === 0) count++;
        }
        return count;
    };

    const normalizeId = (id) => {
        if (!id) return '';
        return id.toString().replace(/[^0-9]/g, '').replace(/^0+/, '');
    };

    const fetchBiometricAttendance = async () => {
        setLoadingBiometric(true);
        try {
            const now = new Date();
            const selectedMonth = now.getMonth() + 1;
            const selectedYear = now.getFullYear();
            const currentUserCode = localStorage.getItem("employee_id")?.trim() || "";
            const currentUserName = localStorage.getItem("user-name")?.toLowerCase() || "";
            const nUserCode = normalizeId(currentUserCode);

            const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

            // 1. Fetch Metadata (Joining & Master Map)
            let joiningData = [];
            let currentMapping = [];

            try {
                const jRes = await fetch(`${SCRIPT_URLS.HR_JOINING}?sheet=JOINING&action=fetch`);
                if (jRes.ok) {
                    const jData = await jRes.json();
                    if (jData.success) {
                        const raw = jData.data;
                        const headers = raw[5];
                        const dataRows = raw.slice(6);
                        const getIdx = (n) => headers.findIndex(h => h && h.toString().trim().toLowerCase() === n.toLowerCase());
                        joiningData = dataRows.map(r => ({
                            id: r[getIdx('Employee ID')]?.toString().trim(),
                            name: r[getIdx('Name As Per Aadhar')]?.toString().trim(),
                            designation: r[getIdx('Designation')]?.toString().trim()
                        })).filter(h => h.id);
                    }
                }
            } catch (e) { }

            try {
                const dmRes = await fetch(`${SCRIPT_URLS.HR_JOINING}?sheet=MASTER&action=fetch`);
                if (dmRes.ok) {
                    const dmData = await dmRes.json();
                    if (dmData.success) {
                        const rows = dmData.data.slice(1);
                        currentMapping = rows.map(r => ({
                            userId: r[5]?.toString().trim(),
                            name: r[6]?.toString().trim(),
                            storeName: r[9]?.toString().trim()
                        }));
                    }
                }
            } catch (e) { }

            // 2. Fetch Logs based on selected device
            const paddedMonth = selectedMonth.toString().padStart(2, '0');
            const endDay = getDaysInMonth(selectedMonth, selectedYear);
            const fromDate = `${selectedYear}-${paddedMonth}-01`;
            const toDate = `${selectedYear}-${paddedMonth}-${endDay}`;

            const allLogs = [];
            if (selectedDevice.name === 'ALL DEVICES') {
                const otherDevices = DEVICES.filter(d => d.name !== 'ALL DEVICES');
                await Promise.all(otherDevices.map(async (dev) => {
                    try {
                        const API_URL = `${DEVICE_LOGS_BASE_URL}?APIKey=211616032630&SerialNumber=${dev.serial}&DeviceName=${dev.apiName}&FromDate=${fromDate}&ToDate=${toDate}`;
                        const res = await fetch(API_URL);
                        if (res.ok) {
                            const logs = await res.json();
                            if (Array.isArray(logs)) {
                                logs.forEach(l => { 
                                    if (l.LogDate && l.EmployeeCode) {
                                        allLogs.push({...l, deviceName: dev.name});
                                    }
                                });
                            }
                        }
                    } catch (e) { console.warn(`Log fetch failed for ${dev.name}`); }
                }));
            } else {
                try {
                    const API_URL = `${DEVICE_LOGS_BASE_URL}?APIKey=211616032630&SerialNumber=${selectedDevice.serial}&DeviceName=${selectedDevice.apiName}&FromDate=${fromDate}&ToDate=${toDate}`;
                    const res = await fetch(API_URL);
                    if (res.ok) {
                        const logs = await res.json();
                        if (Array.isArray(logs)) {
                            logs.forEach(l => { 
                                if (l.LogDate && l.EmployeeCode) {
                                    allLogs.push({...l, deviceName: selectedDevice.name});
                                }
                            });
                        }
                    }
                } catch (e) { console.warn(`Log fetch failed for ${selectedDevice.name}`); }
            }

            if (allLogs.length === 0) throw new Error('No logs found');

            // 3. Process Logs (filter by date >= 2026-04-01)
            const filteredLogs = allLogs.filter(log => log.LogDate.split(' ')[0] >= '2026-04-01');
            const dailyGrouped = {};
            filteredLogs.sort((a, b) => new Date(a.LogDate) - new Date(b.LogDate));

            filteredLogs.forEach(log => {
                const dateKey = log.LogDate.split(' ')[0];
                const code = log.EmployeeCode.toString().trim();
                const key = `${code}_${dateKey}`;
                if (!dailyGrouped[key]) dailyGrouped[key] = { id: code, date: dateKey, logs: [], device: log.deviceName };
                dailyGrouped[key].logs.push(log.LogDate);
            });

            const totalSundays = getSundaysCount(selectedMonth, selectedYear);
            const totalDaysInMonth = getDaysInMonth(selectedMonth, selectedYear);
            const monthlyAgg = {};

            Object.values(dailyGrouped).forEach(day => {
                const id = day.id;
                if (!monthlyAgg[id]) {
                    monthlyAgg[id] = { id, presentDays: 0, lateDays: 0, punchMissDays: 0, totalWorkSecs: 0, storeName: day.device };
                }
                const agg = monthlyAgg[id];
                agg.presentDays += 1;
                const inTime = day.logs[0];
                const outTime = day.logs[day.logs.length - 1];
                if (calculateLateMinutes(inTime) > 0) agg.lateDays += 1;
                if (day.logs.length === 1) agg.punchMissDays += 1;
                else {
                    const start = new Date(inTime.replace(/-/g, '/'));
                    const end = new Date(outTime.replace(/-/g, '/'));
                    agg.totalWorkSecs += (end - start) / 1000;
                }
            });

            const processedData = Object.values(monthlyAgg).map((agg, idx) => {
                const code = agg.id;
                const empMeta = joiningData.find(e => normalizeId(e.id) === normalizeId(code) || e.name?.toLowerCase().trim() === code.toLowerCase().trim());
                let dMap = currentMapping.find(m => normalizeId(m.userId) === normalizeId(code));
                if (!dMap) dMap = currentMapping.find(m => (m.name || '').toLowerCase().trim() === (empMeta?.name || code).toLowerCase().trim());

                return {
                    sNo: idx + 1,
                    month: monthNames[selectedMonth - 1],
                    year: selectedYear,
                    employeeCode: code,
                    employeeName: dMap?.name || empMeta?.name || code,
                    presentDays: agg.presentDays,
                    absentDays: Math.max(0, totalDaysInMonth - agg.presentDays),
                    lateDays: agg.lateDays,
                    totalWorkHours: formatSecsToHrsMins(agg.totalWorkSecs),
                    storeName: dMap?.storeName || agg.storeName
                };
            });

            setBiometricAttendance(processedData);

            // 4. Set stats for logged in user (robust matching)
            const me = processedData.find(d => {
                const nCode = normalizeId(d.employeeCode);
                const nName = (d.employeeName || '').toLowerCase().trim();
                return (nUserCode && nCode === nUserCode) || (currentUserName && nName === currentUserName);
            });
            setBiometricStats(me || null);

        } catch (error) {
            console.error("Biometric fetch error:", error);
        } finally {
            setLoadingBiometric(false);
        }
    };



    const handleSystemAccessPatch = async (id, value) => {
        if (!value.trim()) return;

        await patchSystemAccessApi({
            id: id,
            system_access: value, // append handled in backend
        });

        // refresh users list after patch
        const users = await fetchUserDetailsApi();
        setAllUsers(users);
    };


    const DUMMY_USERS = [
        {
            id: 1,
            employee_id: "EMP001",
            user_name: "Admin User",
            department: "Management",
            role: "admin",
            number: "+91 98765 43210",
            email_id: "admin@example.com",
            status: "active",
            system_access: "CHECKLIST COMBINED,HR PORTAL"
        },
        {
            id: 2,
            employee_id: "EMP002",
            user_name: "John Doe",
            department: "IT",
            role: "user",
            number: "+91 98765 43211",
            email_id: "john.doe@example.com",
            status: "active",
            system_access: "CHECKLIST COMBINED"
        },
        {
            id: 3,
            employee_id: "EMP003",
            user_name: "Jane Smith",
            department: "HR",
            role: "user",
            number: "+91 98765 43212",
            email_id: "jane.smith@sourabhrollingmills.com",
            status: "active",
            system_access: "HR PORTAL"
        }
    ];

    useEffect(() => {
        const fetchEmployeeDetails = async () => {
            try {
                setLoading(true);

                const storedUsername = localStorage.getItem("user-name");
                const storedEmpId = localStorage.getItem("employee_id");

                const usersRes = await fetchUserDetailsApi();
                const users = Array.isArray(usersRes) && usersRes.length > 0 ? usersRes : DUMMY_USERS;
                setAllUsers(users);

                const systemsData = await fetchSystemsApi();
                setSystemsList(Array.isArray(systemsData) ? systemsData : []);

                // Find the logged-in user from the full list to get accurate designation/department
                let matchedUser = null;
                if (storedUsername) {
                    matchedUser = users.find(u => u?.user_name?.toLowerCase() === storedUsername.toLowerCase());
                }

                if (matchedUser) {
                    setUserDetails({ ...matchedUser, status: "active" });
                } else if (storedUsername && storedEmpId) {
                    // Fallback to localStorage if not found in list
                    setUserDetails({
                        user_name: storedUsername,
                        employee_id: storedEmpId,
                        email_id: localStorage.getItem("email_id"),
                        number: localStorage.getItem("number"),
                        role: localStorage.getItem("role"),
                        status: "active",
                        designation: localStorage.getItem("role") === "admin" ? "Admin" : "Employee",
                        department: "Department N/A"
                    });
                } else {
                    setUserDetails(users[0]);
                }

                const attendanceRes = await fetchAttendanceSummaryApi();
                const attendanceList = Array.isArray(attendanceRes?.data?.data)
                    ? attendanceRes.data.data
                    : [];

                if (storedEmpId) {
                    const matchedAttendance = attendanceList.find(
                        (a) =>
                            String(a.employee_id).trim() === String(storedEmpId).trim()
                    );
                    setAttendance(matchedAttendance || null);
                }

                // Fetch tasks after other details are loaded
                fetchTodaysTasks(matchedUser || { department: localStorage.getItem("role") === "admin" ? "Admin" : "Department N/A" });

                // Fetch Biometric Attendance
                fetchBiometricAttendance();
            } catch (error) {
                console.error("Error fetching employee details:", error);
                setAllUsers(DUMMY_USERS);
                if (!localStorage.getItem("user-name")) setUserDetails(DUMMY_USERS[0]);
            } finally {
                setLoading(false);
            }
        };

        fetchEmployeeDetails();
    }, []);

    // Re-fetch biometric data when device changes (for Admin)
    useEffect(() => {
        const isAdmin = localStorage.getItem("role")?.toLowerCase().includes("admin");
        if (isAdmin && !loading) {
            fetchBiometricAttendance();
        }
    }, [selectedDevice]);

    const attendanceMap = Array.isArray(attendance)
        ? attendance.reduce((acc, a) => {
            acc[String(a.employee_id).trim()] = a.status;
            return acc;
        }, {})
        : {};

    const filteredUsers = allUsers.filter((u) => {
        if (u.role === "admin") return false;

        const matchesSearch =
            u.employee_id?.toString().includes(search) ||
            u.user_name?.toLowerCase().includes(search.toLowerCase());

        const matchesDept =
            departmentFilter === "" || u.department === departmentFilter;

        const attendanceStatus =
            attendanceMap[u.employee_id] === "IN" ? "present" : "absent";

        const matchesAttendance =
            attendanceFilter === "" || attendanceFilter === attendanceStatus;

        return matchesSearch && matchesDept && matchesAttendance;
    });

    return (
        <div className="w-full">
            <section className="py-4 md:py-4 bg-white">
                <div className="container mx-auto px-4 md:px-8">
                    <div>
                        <div className="grid grid-cols-1 md:grid-cols-1">
                            {/* Employee Card - Dynamic based on API data */}
                            <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 transition-all hover:shadow-2xl mb-8">
                                {/* Decorative Header Banner */}
                                <div className="h-40 bg-gradient-to-r from-blue-500 via-blue-600 to-sky-400 relative">
                                    <div className="absolute top-0 right-0 w-48 h-48 bg-white opacity-10 rounded-full -mr-12 -mt-12"></div>
                                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-10 rounded-full -ml-6 -mb-6"></div>
                                </div>

                                <div className="px-8 pb-8">
                                    <div className="flex flex-col md:flex-row gap-8 items-start -mt-16">
                                        {/* Avatar Section */}
                                        <div className="flex-shrink-0 mx-auto md:mx-0 relative group">
                                            <div className="w-36 h-36 rounded-full p-1 bg-white shadow-2xl ring-4 ring-white group-hover:scale-105 transition-transform duration-300">
                                                <img
                                                    src={
                                                        userDetails?.employee_id
                                                            ? `/employees/${userDetails.employee_id}.jpg`
                                                            : "/user.png"
                                                    }
                                                    alt="Employee"
                                                    className="w-full h-full rounded-full object-cover"
                                                    onError={(e) => {
                                                        e.target.src = "/user.png";
                                                    }}
                                                />
                                            </div>
                                            <div className="absolute bottom-3 right-3 w-5 h-5 border-4 border-white rounded-full shadow-md bg-green-500"></div>
                                        </div>

                                        {/* Info Section */}
                                        <div className="flex-1 mt-4 md:mt-16 w-full text-center md:text-left">
                                            {loading ? (
                                                <div className="space-y-3 animate-pulse">
                                                    <div className="h-8 bg-gray-200 rounded w-1/3 mx-auto md:mx-0"></div>
                                                    <div className="h-4 bg-gray-200 rounded w-1/4 mx-auto md:mx-0"></div>
                                                </div>
                                            ) : userDetails ? (
                                                <div className="flex flex-col md:flex-row justify-between items-center md:items-start">
                                                    <div>
                                                        <h3 className="text-4xl font-extrabold text-gray-800 tracking-tight">
                                                            {userDetails.user_name || "N/A"}
                                                        </h3>
                                                        <p className="text-blue-600 font-semibold text-xl mt-1">{userDetails.designation || userDetails.department || "Department N/A"}</p>
                                                    </div>
                                                    <span className="mt-4 md:mt-0 px-6 py-2 rounded-full text-sm font-bold border-2 border-green-200 bg-green-50 text-green-700 shadow-sm">
                                                        {userDetails.status || "active"}
                                                    </span>
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>

                                    {/* Quick Info Cards */}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-10">
                                        <div className="flex items-center gap-4 p-5 rounded-2xl bg-gray-50 border border-gray-100 hover:bg-blue-50 hover:border-blue-200 transition-all group">
                                            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" /></svg>
                                            </div>
                                            <div>
                                                <p className="text-gray-400 text-xs uppercase tracking-widest font-bold">Employee ID</p>
                                                <p className="font-bold text-gray-800 text-lg">{userDetails?.employee_id || "N/A"}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 p-5 rounded-2xl bg-gray-50 border border-gray-100 hover:bg-blue-50 hover:border-blue-200 transition-all group">
                                            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-gray-400 text-xs uppercase tracking-widest font-bold">Email</p>
                                                <p className="font-bold text-gray-800 text-lg truncate" title={userDetails?.email_id}>{userDetails?.email_id || "N/A"}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 p-5 rounded-2xl bg-gray-50 border border-gray-100 hover:bg-blue-50 hover:border-blue-200 transition-all group">
                                            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                            </div>
                                            <div>
                                                <p className="text-gray-400 text-xs uppercase tracking-widest font-bold">Contact</p>
                                                <p className="font-bold text-gray-800 text-lg">{userDetails?.number || "N/A"}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Mid Section Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 flex flex-col hover:shadow-2xl transition-all">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-xl font-bold text-gray-800">Today's Tasks</h3>
                                        <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full border border-blue-200">
                                            {todaysTasks.filter(t => taskDeptFilter === "All" || t.department === taskDeptFilter).length}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <select
                                            value={taskDeptFilter}
                                            onChange={(e) => setTaskDeptFilter(e.target.value)}
                                            className="text-xs font-bold border-none bg-blue-50 text-blue-600 rounded-lg px-2 py-1 outline-none cursor-pointer"
                                        >
                                            {availableTaskDepts.map(dept => (
                                                <option key={dept} value={dept}>{dept}</option>
                                            ))}
                                        </select>
                                        <ListTodo className="text-blue-500 h-6 w-6" />
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto max-h-[300px] w-full custom-scrollbar">
                                    {isTasksLoading ? (
                                        <div className="flex flex-col items-center justify-center py-10 space-y-3">
                                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                                            <p className="text-gray-500 text-sm animate-pulse">Fetching your tasks...</p>
                                        </div>
                                    ) : todaysTasks.filter(t => taskDeptFilter === "All" || t.department === taskDeptFilter).length > 0 ? (
                                        <div className="space-y-3 w-full">
                                            {todaysTasks
                                                .filter(t => taskDeptFilter === "All" || t.department === taskDeptFilter)
                                                .map((task, idx) => (
                                                    <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 group hover:border-blue-200 hover:bg-blue-50 transition-all">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`p-2 rounded-xl ${task.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                                                                {task.status === 'completed' ? <CheckCircle2 size={18} /> : <Clock size={18} />}
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-gray-800 text-sm line-clamp-1">{task.title}</p>
                                                                <div className="flex items-center gap-2 mt-0.5">
                                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{task.department}</span>
                                                                    <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                                                    <span className="text-[10px] font-bold text-blue-500">{task.date}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${task.status === 'completed' ? 'bg-green-100 text-green-600' :
                                                                task.status === 'overdue' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                                                            }`}>
                                                            {task.status.toUpperCase()}
                                                        </span>
                                                    </div>
                                                ))}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-10 text-center">
                                            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-3">
                                                <ListTodo className="text-blue-300 w-8 h-8" />
                                            </div>
                                            <p className="text-gray-500 font-medium">No tasks for today</p>
                                            <p className="text-gray-400 text-xs mt-1">Check back later or relax!</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 flex flex-col hover:shadow-2xl transition-all relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
                                    <Activity size={120} />
                                </div>

                                <div className="flex items-center justify-between mb-8">
                                    <div className="z-10">
                                        <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                            <Activity className="text-blue-500" size={20} />
                                            Attendance Health
                                        </h3>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                                            {search 
                                                ? `Viewing: ${biometricAttendance.find(d => d.employeeName.toLowerCase().includes(search.toLowerCase()) || d.employeeCode.toString().includes(search))?.employeeName || 'No Match'}` 
                                                : `Showing: ${biometricStats?.employeeName || 'My Records'}`}
                                        </p>
                                    </div>
                                    {!loadingBiometric && biometricStats && (
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
                                            {biometricStats.month} {biometricStats.year}
                                        </span>
                                    )}
                                </div>

                                {loadingBiometric ? (
                                    <div className="flex flex-col items-center justify-center py-10 gap-3">
                                        <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest animate-pulse">Analyzing logs...</p>
                                    </div>
                                ) : (search ? (biometricAttendance.find(d => d.employeeName.toLowerCase().includes(search.toLowerCase()) || d.employeeCode.toString().includes(search))) : biometricStats) ? (
                                    (() => {
                                        const stats = search 
                                            ? biometricAttendance.find(d => d.employeeName.toLowerCase().includes(search.toLowerCase()) || d.employeeCode.toString().includes(search))
                                            : biometricStats;
                                        return (
                                            <div className="z-10 w-full space-y-8">
                                                {/* Top Section: Monthly Percentage */}
                                                <div className="flex flex-col items-center justify-center">
                                                    <div className="relative w-32 h-32 mb-4">
                                                        <svg className="w-full h-full rotate-[-90deg]">
                                                            <circle cx="64" cy="64" r="56" stroke="#f1f5f9" strokeWidth="10" fill="none" />
                                                            <circle
                                                                cx="64"
                                                                cy="64"
                                                                r="56"
                                                                stroke={((stats.presentDays / (stats.presentDays + stats.absentDays)) * 100) > 80 ? '#10b981' : '#f59e0b'}
                                                                strokeWidth="10"
                                                                fill="none"
                                                                strokeDasharray="351.8"
                                                                strokeDashoffset={351.8 - (351.8 * (stats.presentDays / (stats.presentDays + stats.absentDays)))}
                                                                strokeLinecap="round"
                                                                className="transition-all duration-1000 ease-out"
                                                            />
                                                        </svg>
                                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                            <span className="text-3xl font-black text-gray-800">
                                                                {((stats.presentDays / (stats.presentDays + stats.absentDays)) * 100).toFixed(0)}%
                                                            </span>
                                                            <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Attendance</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Mid Section: Status Cards */}
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100 flex flex-col items-center shadow-sm">
                                                        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-emerald-600 mb-2 shadow-sm">
                                                            <CheckCircle2 size={16} />
                                                        </div>
                                                        <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">Present</p>
                                                        <p className="text-2xl font-black text-emerald-700">{stats.presentDays}</p>
                                                    </div>
                                                    <div className="bg-rose-50 rounded-2xl p-4 border border-rose-100 flex flex-col items-center shadow-sm">
                                                        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-rose-600 mb-2 shadow-sm">
                                                            <X size={16} />
                                                        </div>
                                                        <p className="text-[9px] font-black text-rose-600 uppercase tracking-widest mb-1">Absent</p>
                                                        <p className="text-2xl font-black text-rose-700">{stats.absentDays}</p>
                                                    </div>
                                                </div>

                                                {/* Bottom Section: Details */}
                                                <div className="grid grid-cols-1 gap-3">
                                                    <div className="flex items-center justify-between px-5 py-3 bg-orange-50/50 rounded-2xl border border-orange-100">
                                                        <div className="flex items-center gap-3">
                                                            <Timer size={18} className="text-orange-500" />
                                                            <span className="text-xs font-bold text-gray-600">Late Arrivals</span>
                                                        </div>
                                                        <span className="text-base font-black text-orange-600">{stats.lateDays}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between px-5 py-3 bg-blue-50/50 rounded-2xl border border-blue-100">
                                                        <div className="flex items-center gap-3">
                                                            <Clock size={18} className="text-blue-500" />
                                                            <span className="text-xs font-bold text-gray-600">Total Hours</span>
                                                        </div>
                                                        <span className="text-base font-black text-blue-600">{stats.totalWorkHours}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })()
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-10 text-center gap-4">
                                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center border-2 border-dashed border-gray-200">
                                          <Activity size={32} className="text-gray-300" />
                                        </div>
                                        <div>
                                          <p className="font-black text-gray-400 text-sm uppercase tracking-widest">No Logs Found</p>
                                          <p className="text-xs text-gray-400 mt-1 font-medium">We couldn't find your biometric records for this month.</p>
                                        </div>
                                        {localStorage.getItem("role")?.toLowerCase().includes("admin") && biometricAttendance.length > 0 && (
                                            <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest bg-blue-50 px-4 py-2 rounded-xl border border-blue-100 mt-2">
                                               {biometricAttendance.length} records found for other employees
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>

                        </div>

                        {/* Admin Biometric Attendance Table Section */}
                        {localStorage.getItem("role")?.toLowerCase().includes("admin") && (
                            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden mb-8 hover:shadow-2xl transition-all">
                                <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-800">Biometric Attendance Summary</h3>
                                        <p className="text-xs text-gray-500 mt-1 font-medium italic">Showing current month statistics for {selectedDevice.name}</p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-gray-200">
                                            <Filter size={14} className="text-blue-500" />
                                            <select
                                                value={selectedDevice.name}
                                                onChange={(e) => {
                                                    const d = DEVICES.find(dev => dev.name === e.target.value);
                                                    if (d) {
                                                        setSelectedDevice(d);
                                                        // Note: fetchBiometricAttendance inside useEffect would be triggered if we add selectedDevice to deps
                                                        // But for simplicity in this edit, I'll just trigger it here if I could. 
                                                        // Instead, I'll add selectedDevice to the deps of a new useEffect.
                                                    }
                                                }}
                                                className="text-xs font-bold bg-transparent outline-none cursor-pointer text-gray-700"
                                            >
                                                {DEVICES.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <div className="overflow-x-auto max-h-[400px] custom-scrollbar">
                                    <table className="w-full text-left">
                                        <thead className="sticky top-0 bg-white z-10 shadow-sm">
                                            <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">
                                                <th className="px-6 py-4">Employee</th>
                                                <th className="px-6 py-4 text-center">Present</th>
                                                <th className="px-6 py-4 text-center text-rose-500">Absent</th>
                                                <th className="px-6 py-4 text-center text-orange-500">Late</th>
                                                <th className="px-6 py-4 text-center text-red-500">Miss</th>
                                                <th className="px-6 py-4 text-center">Work Hours</th>
                                                <th className="px-6 py-4">Store</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {loadingBiometric ? (
                                                <tr>
                                                    <td colSpan="7" className="px-6 py-20 text-center">
                                                        <div className="flex flex-col items-center gap-3">
                                                            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                                            <p className="text-gray-400 text-xs font-bold uppercase tracking-widest animate-pulse">Fetching biometric logs...</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : biometricAttendance.length > 0 ? (
                                                biometricAttendance
                                                    .filter(item => !search || 
                                                        item.employeeName?.toLowerCase().includes(search.toLowerCase()) || 
                                                        item.employeeCode?.toString().includes(search)
                                                    )
                                                    .map((item, idx) => (
                                                        <tr key={idx} className="hover:bg-blue-50/30 transition-colors group">
                                                        <td className="px-6 py-4">
                                                            <div className="flex flex-col">
                                                                <span className="text-sm font-black text-gray-800">{item.employeeName}</span>
                                                                <span className="text-[10px] font-bold text-blue-500">{item.employeeCode}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-center text-sm font-black text-green-600 bg-green-50/30">{item.presentDays}</td>
                                                        <td className="px-6 py-4 text-center text-sm font-black text-rose-600 bg-rose-50/30">{item.absentDays}</td>
                                                        <td className="px-6 py-4 text-center text-sm font-bold text-orange-500">{item.lateDays}</td>
                                                        <td className="px-6 py-4 text-center text-sm font-bold text-red-500">{item.punchMiss}</td>
                                                        <td className="px-6 py-4 text-center text-sm font-black text-slate-700">{item.totalWorkHours}</td>
                                                        <td className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">{item.storeName}</td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="7" className="px-6 py-20 text-center">
                                                        <p className="text-gray-400 font-medium">No biometric records found for this unit.</p>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="p-4 bg-gray-50/50 border-t border-gray-50 text-[10px] font-bold text-gray-400 text-center tracking-widest uppercase">
                                    Total {biometricAttendance.length} records found in device {selectedDevice.name}
                                </div>
                            </div>
                        )}

                        {/* Progress Section */}
                        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-10 hover:shadow-2xl transition-all">
                            <h3 className="text-xl font-bold text-gray-800 mb-8">Overall Progress</h3>
                            <div className="flex flex-col md:flex-row items-center justify-center gap-16">
                                {/* CIRCLE */}
                                <div className="relative w-48 h-48">
                                    <svg className="w-full h-full rotate-[-90deg]">
                                        <circle cx="96" cy="96" r="80" stroke="#f1f5f9" strokeWidth="16" fill="none" />
                                        <circle
                                            cx="96"
                                            cy="96"
                                            r="80"
                                            stroke="#10b981"
                                            strokeWidth="16"
                                            fill="none"
                                            strokeDasharray="502"
                                            strokeDashoffset="75"
                                            strokeLinecap="round"
                                        />
                                        <circle
                                            cx="96"
                                            cy="96"
                                            r="80"
                                            stroke="#f59e0b"
                                            strokeWidth="16"
                                            fill="none"
                                            strokeDasharray="502"
                                            strokeDashoffset="420"
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-5xl font-black text-blue-700">
                                            {taskStats.total > 0 ? ((taskStats.completed / taskStats.total) * 100).toFixed(1) : "0.0"}%
                                        </span>
                                        <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">Overall</span>
                                    </div>
                                </div>

                                {/* LEGEND */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-6 w-full md:w-auto">
                                    <div className="flex items-center gap-3">
                                        <span className="w-4 h-4 rounded-full bg-green-500 shadow-sm shadow-green-200"></span>
                                        <span className="font-bold text-gray-700">Completed:</span>
                                        <span className="text-gray-500 font-medium ml-auto">
                                            {taskStats.total > 0 ? ((taskStats.completed / taskStats.total) * 100).toFixed(1) : "0.0"}%
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="w-4 h-4 rounded-full bg-orange-500 shadow-sm shadow-orange-200"></span>
                                        <span className="font-bold text-gray-700">Pending:</span>
                                        <span className="text-gray-500 font-medium ml-auto">
                                            {taskStats.total > 0 ? ((taskStats.pending / taskStats.total) * 100).toFixed(1) : "0.0"}%
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="w-4 h-4 rounded-full bg-gray-300 shadow-sm"></span>
                                        <span className="font-bold text-gray-700">Not Done:</span>
                                        <span className="text-gray-500 font-medium ml-auto">0.0%</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="w-4 h-4 rounded-full bg-red-500 shadow-sm shadow-red-200"></span>
                                        <span className="font-bold text-gray-700">Overdue:</span>
                                        <span className="text-gray-500 font-medium ml-auto">
                                            {taskStats.total > 0 ? ((taskStats.overdue / taskStats.total) * 100).toFixed(1) : "0.0"}%
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    )
}
export default HomePage;