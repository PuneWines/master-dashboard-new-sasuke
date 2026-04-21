import React, { useEffect, useState } from 'react';
import {
  Calendar, Clock, CheckCircle2, XCircle, Info,
  Search, Filter, Download, ArrowUpRight, ArrowDownRight,
  User, Hash, Timer, Coffee, AlertCircle, FileText
} from 'lucide-react';
import toast from 'react-hot-toast';
import { SCRIPT_URLS, DEVICE_LOGS_BASE_URL } from '../../utils/envConfig';

const DEVICES = [
  { name: 'BAWDHAN', apiName: 'BAVDHAN', serial: 'C26238441B1E342D' },
  { name: 'HINJEWADI', apiName: 'HINJEWADI', serial: 'AMDB25061400335' },
  { name: 'WAGHOLI', apiName: 'WAGHOLI', serial: 'AMDB25061400343' },
  { name: 'AKOLE', apiName: 'AKOLE', serial: 'C262CC13CF202038' },
  { name: 'MUMBAI', apiName: 'MUMBAI', serial: 'C2630450C32A2327' }
];

const MyAttendance = () => {
  const DUMMY_ATTENDANCE = [
    {
      employeeCode: 'DEMO101', employeeName: 'Sample Employee', date: '01/04/2024',
      inTime: '09:00:00 AM', outTime: '06:00:00 PM', totalDuration: '9:00:00',
      totalWithLunchDuration: '8:00:00', lunchTime: '1:00:00', actualTotalDuration: '8:00:00',
      status: 'Present', missAdjustCondition: 'None', month: 'April', year: '2024'
    }
  ];

  const [selectedMonth, setSelectedMonth] = useState(new Date().toLocaleString('default', { month: 'long' }));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [attendanceData, setAttendanceData] = useState([]);
  const [isDemo, setIsDemo] = useState(false);
  const [resolvedUserInfo, setResolvedUserInfo] = useState(null);

  const formatSheetDate = (dateStr) => {
    if (!dateStr || dateStr === '-') return '-';
    try {
      // Handle DD/MM/YYYY format
      if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
          const d = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10);
          const y = parseInt(parts[2], 10);
          return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
        }
      }
      // Handle YYYY-MM-DD format
      if (dateStr.includes('-') && dateStr.length === 10) {
        const [y, m, d] = dateStr.split('-');
        return `${d}/${m}/${y}`;
      }
      // Default - try native parsing
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch (e) {
      return dateStr;
    }
  };

  const parseDateForSort = (dateStr) => {
    if (!dateStr || dateStr === '-') return new Date(0);
    try {
      // Handle DD/MM/YYYY format
      if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
          const d = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10) - 1; // Month is 0-indexed
          const y = parseInt(parts[2], 10);
          // Handle 2-digit years
          const fullYear = y < 100 ? (y > 50 ? 1900 + y : 2000 + y) : y;
          return new Date(fullYear, m, d);
        }
      }
      // Handle YYYY-MM-DD format
      if (dateStr.includes('-') && dateStr.length === 10) {
        const [y, m, d] = dateStr.split('-');
        return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
      }
      // Default parsing
      return new Date(dateStr);
    } catch (e) {
      return new Date(0);
    }
  };

  const formatSheetTime = (timeStr) => {
    if (!timeStr || timeStr === '-' || timeStr === '0.0' || timeStr === '0' || timeStr === '') return '-';
    try {
      const str = timeStr.toString().trim();
      
      // Handle Excel decimal format (e.g., 0.375 = 9:00 AM)
      if (!str.includes(':') && !str.includes('T') && !str.includes(' ')) {
        const num = parseFloat(str);
        if (!isNaN(num) && num > 0 && num < 1) {
          const hours = Math.floor(num * 24);
          const minutes = Math.floor((num * 24 * 60) % 60);
          const ampm = hours >= 12 ? 'PM' : 'AM';
          const displayHour = hours % 12 || 12;
          return `${displayHour}:${minutes.toString().padStart(2, '0')} ${ampm}`;
        }
        // Handle duration format like "9.30" or "9.5"
        if (!isNaN(num)) {
          const hours = Math.floor(num);
          const minutes = Math.round((num - hours) * 60);
          return `${hours}h ${minutes}m`;
        }
      }
      
      // Handle "1899-12-30T09:00:00" format from Excel
      if (str.includes('T') && str.includes(':')) {
        const date = new Date(str);
        if (!isNaN(date.getTime())) {
          return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
          });
        }
      }
      
      // Handle "09:00:00" or "9:00:00" format
      if (str.includes(':')) {
        const parts = str.split(':');
        let hours = parseInt(parts[0], 10);
        const minutes = parts[1] || '00';
        const seconds = parts[2] || '00';
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHour = hours % 12 || 12;
        return `${displayHour}:${minutes}:${seconds} ${ampm}`;
      }
      
      return str;
    } catch (e) {
      return timeStr;
    }
  };

  const parseTimeToSecs = (timeStr) => {
    if (!timeStr || timeStr === '-' || timeStr === '0.0' || timeStr === '0' || timeStr === '') return 0;
    try {
      const str = timeStr.toString().trim();
      
      // Handle decimal format (0.375 = 9 AM)
      if (!str.includes(':') && !str.includes(' ')) {
        const num = parseFloat(str);
        if (!isNaN(num) && num > 0 && num < 1) return num * 86400;
        if (!isNaN(num)) return num * 3600;
      }

      // Handle "1899-12-30T09:00:00"
      if (str.includes('T') && str.includes(':')) {
        const date = new Date(str);
        if (!isNaN(date.getTime())) {
          return date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds();
        }
      }

      // Handle AM/PM format "09:00:00 AM" or "9:00 PM"
      if (str.toLowerCase().includes('am') || str.toLowerCase().includes('pm')) {
        const parts = str.split(':');
        let hours = parseInt(parts[0], 10);
        const minutes = parts[1] ? parseInt(parts[1], 10) : 0;
        const seconds = parts[2] ? parseInt(parts[2], 10) : 0;
        const isPM = str.toLowerCase().includes('pm');
        if (isPM && hours < 12) hours += 12;
        if (!isPM && hours === 12) hours = 0;
        return hours * 3600 + minutes * 60 + seconds;
      }
      
      // Handle HH:mm:ss format
      if (str.includes(':')) {
        const parts = str.split(':').map(p => parseInt(p, 10) || 0);
        if (parts.length >= 2) return parts[0] * 3600 + parts[1] * 60 + (parts[2] || 0);
      }
    } catch (e) {
      return 0;
    }
    return 0;
  };

  const formatDuration = (durationStr) => {
    if (!durationStr || durationStr === '-' || durationStr === '0.0' || durationStr === '0' || durationStr === '') return '-';
    try {
      const str = durationStr.toString().trim();
      
      // If already formatted (contains 'h'), return as is
      if (str.includes('h')) return str;

      // Handle decimal duration like "9.30" or "9.5"
      const num = parseFloat(str);
      if (!isNaN(num) && !str.includes(':')) {
        const hours = Math.floor(num);
        const minutes = Math.round((num - hours) * 60);
        return `${hours}h ${minutes}m`;
      }
      
      return str;
    } catch (e) {
      return durationStr;
    }
  };

  const formatSecsToHrsMins = (totalSecs) => {
    if (!totalSecs) return '0h 0m';
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    return `${hrs}h ${mins}m`;
  };

  const formatTimeAMPM = (timeStr) => {
    if (!timeStr || timeStr === '-') return '-';
    if (timeStr.startsWith('-')) return timeStr;
    const parts = timeStr.toString().split(':');
    if (parts.length < 3) return timeStr;
    const h = parseInt(parts[0], 10);
    const m = parts[1];
    const s = parts[2];
    
    const isPM = (h % 24) >= 12;
    const ampm = isPM ? 'PM' : 'AM';
    let displayH = h % 12;
    if (displayH === 0) displayH = 12;
    
    return `${displayH.toString().padStart(2, '0')}:${m}:${s} ${ampm}`;
  };

  const fetchDataSheet = async (month, year) => {
    setLoading(true);
    setError(null);

    try {
      const userData = localStorage.getItem('user');
      const user = userData ? JSON.parse(userData) : {};
      const cachedEmployeeId = localStorage.getItem("employeeId");
      
      const loggedInName = (user.Name || user.name || user.candidateName || user.candidate_name || '').toString().trim().toLowerCase();
      const loggedInUsername = (user.Username || user.username || '').toString().trim().toLowerCase();
      const loggedInEmployeeId = (user.joiningNo || user.EmployeeID || user.employeeId || user.empId || cachedEmployeeId || '').toString().trim().toLowerCase();

      // 1. Resolve Identity and Mapping (JOINING & MASTER)
      let resolvedId = loggedInEmployeeId;
      let resolvedName = loggedInName;
      let userMapping = null;

      try {
        const JOINING_URL = `${SCRIPT_URLS.HR_JOINING}?sheet=JOINING&action=fetch`;
        const jRes = await fetch(JOINING_URL);
        if (jRes.ok) {
          const jData = await jRes.json();
          if (jData.success) {
            const raw = jData.data;
            const headers = raw[5];
            const dataRows = raw.slice(6);
            const getIdx = (n) => headers.findIndex(h => h && h.toString().trim().toLowerCase() === n.toLowerCase());
            const idIdx = getIdx('Employee ID');
            const nameIdx = getIdx('Name As Per Aadhar');
            
            const match = dataRows.find(r => {
              const id = r[idIdx]?.toString().trim().toLowerCase();
              const name = r[nameIdx]?.toString().trim().toLowerCase();
              return (id && id === loggedInEmployeeId) || 
                     (id && id === loggedInUsername) || 
                     (name && name === loggedInName);
            });

            if (match) {
              resolvedId = match[idIdx]?.toString().trim().toLowerCase();
              resolvedName = match[nameIdx]?.toString().trim().toLowerCase();
              setResolvedUserInfo({ id: match[idIdx], name: match[nameIdx] });
            }
          }
        }

        const MASTER_URL = `${SCRIPT_URLS.HR_JOINING}?sheet=MASTER&action=fetch`;
        const mRes = await fetch(MASTER_URL);
        if (mRes.ok) {
          const mData = await mRes.json();
          if (mData.success) {
            const rows = mData.data.slice(1);
            userMapping = rows.find(r => {
              const uId = r[5]?.toString().trim().toLowerCase();
              const uName = r[6]?.toString().trim().toLowerCase();
              return (uId && (uId === resolvedId || uId === loggedInUsername)) || 
                     (uName && uName === resolvedName);
            });
          }
        }
      } catch (e) {
        console.warn('Metadata resolution failed:', e);
      }

      const monthList = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const monthIndex = monthList.findIndex(m => m.toLowerCase() === month?.toLowerCase());
      const queryYear = year || new Date().getFullYear();
      const queryMonth = monthIndex !== -1 ? monthIndex + 1 : new Date().getMonth() + 1;

      // 2. Fetch Biometric Logs
      let biometricData = [];
      if (userMapping && userMapping[8]) {
        try {
          const serial = userMapping[8].toString().trim();
          const deviceApiName = userMapping[7]?.toString().trim() || '';
          const deviceCode = userMapping[5]?.toString().trim();
          
          const firstDay = `${queryYear}-${String(queryMonth).padStart(2, '0')}-01`;
          const lastDayDate = new Date(queryYear, queryMonth, 0);
          const lastDay = `${queryYear}-${String(queryMonth).padStart(2, '0')}-${String(lastDayDate.getDate()).padStart(2, '0')}`;
          
          const BIO_URL = `${DEVICE_LOGS_BASE_URL}?APIKey=211616032630&SerialNumber=${serial}&DeviceName=${deviceApiName}&FromDate=${firstDay}&ToDate=${lastDay}`;
          const bioRes = await fetch(BIO_URL);
          if (bioRes.ok) {
            const rawLogs = await bioRes.json();
            if (Array.isArray(rawLogs)) {
              const myLogs = rawLogs.filter(log => log.EmployeeCode?.toString().trim().toLowerCase() === deviceCode.toLowerCase());
              
              const dailyGrouped = {};
              myLogs.forEach(log => {
                const dateKey = log.LogDate.split(' ')[0];
                if (!dailyGrouped[dateKey]) dailyGrouped[dateKey] = [];
                dailyGrouped[dateKey].push(log.LogDate);
              });

              biometricData = Object.entries(dailyGrouped).map(([date, logs], idx) => {
                const sortedLogs = [...logs].sort((a, b) => new Date(a.replace(/-/g, '/')).getTime() - new Date(b.replace(/-/g, '/')).getTime());
                const logDateObj = new Date(date.replace(/-/g, '/'));
                const isToday = logDateObj.toDateString() === new Date().toDateString();

                const fullIn = sortedLogs[0];
                let fullOut = sortedLogs.length > 1 ? sortedLogs[sortedLogs.length - 1] : null;
                let status = 'Present';

                let workSecs = 0, lunchSecs = 0;
                
                // If it's today and only one punch exists, calculate duration until now
                if (!fullOut && isToday) {
                  const startTime = new Date(fullIn.replace(/-/g, '/')).getTime();
                  const now = new Date().getTime();
                  if (!isNaN(startTime)) {
                    workSecs = (now - startTime) / 1000;
                    status = 'Clocked In';
                  }
                } else if (!fullOut) {
                   status = 'Punch Miss';
                }

                if (fullOut) {
                   const startTime = new Date(fullIn.replace(/-/g, '/')).getTime();
                   const endTime = new Date(fullOut.replace(/-/g, '/')).getTime();
                   if (!isNaN(startTime) && !isNaN(endTime)) {
                     workSecs = (endTime - startTime) / 1000;
                   }
                   if (sortedLogs.length >= 4) {
                      const lunchStart = new Date(sortedLogs[1].replace(/-/g, '/')).getTime();
                      const lunchEnd = new Date(sortedLogs[2].replace(/-/g, '/')).getTime();
                      if (!isNaN(lunchStart) && !isNaN(lunchEnd)) {
                        lunchSecs = (lunchEnd - lunchStart) / 1000;
                      }
                   }
                }
                
                // Standard lunch adjustment logic
                if (lunchSecs === 0 && workSecs > 5 * 3600) {
                  lunchSecs = 3600;
                }

                const actualSecs = Math.max(0, workSecs - lunchSecs);

                return {
                  id: `bio-${idx}-${date}`,
                  employeeCode: deviceCode,
                  employeeName: userMapping[6] || resolvedName,
                  date: date.split('-').reverse().join('/'),
                  inTime: formatTimeAMPM(fullIn.split(' ')[1]),
                  outTime: fullOut ? formatTimeAMPM(fullOut.split(' ')[1]) : '-',
                  totalDuration: workSecs > 0 ? formatSecsToHrsMins(workSecs) : '-',
                  totalWithLunchDuration: actualSecs > 0 ? formatSecsToHrsMins(actualSecs) : '-',
                  lunchTime: lunchSecs > 0 ? formatSecsToHrsMins(lunchSecs) : '0h 0m',
                  actualTotalDuration: actualSecs > 0 ? formatSecsToHrsMins(actualSecs) : (workSecs > 0 ? formatSecsToHrsMins(workSecs) : '-'),
                  status: status,
                  month: monthList[queryMonth - 1],
                  year: queryYear.toString()
                };
              });
            }
          }
        } catch (e) {
          console.warn('Biometric fetch failed:', e);
        }
      }

      // 3. Fetch Spreadsheet Data (Fallback/Secondary)
      const SCRIPT_URL = SCRIPT_URLS.HR_PAYROLL;
      const SPREADSHEET_ID = '1lg8cvRaYHpnR75bWxHoh-a30-gGL94-_WAnE7Zue6r8';
      const response = await fetch(`${SCRIPT_URL}?sheet=Data&action=fetch&spreadsheetId=${SPREADSHEET_ID}`);

      let sheetData = [];
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          const raw = result.data || result;
          const dataRows = Array.isArray(raw) ? (raw.length > 1 ? raw.slice(1) : raw) : [];
          
          sheetData = dataRows.map((row, idx) => {
            const inTimeStr = row[3] || '';
            const outTimeStr = row[4] || '';
            
            let totalDur = row[5] || '0';
            let lunchTime = row[7] || '0';
            let actualDur = row[8] || '0';
            let status = (inTimeStr && outTimeStr) ? 'Present' : 'Absent';

            // Calculate durations if they are missing but In/Out times exist
            if ((!totalDur || totalDur === '0' || totalDur === '-') && inTimeStr && outTimeStr) {
               const startSecs = parseTimeToSecs(inTimeStr);
               const endSecs = parseTimeToSecs(outTimeStr);
               if (endSecs > startSecs) {
                 const grossSecs = endSecs - startSecs;
                 let lSecs = parseTimeToSecs(lunchTime);
                 
                 // Apply default lunch if missing and work > 5 hours
                 if (lSecs === 0 && grossSecs > 5 * 3600) {
                   lSecs = 3600;
                   lunchTime = "1h 0m";
                 }
                 
                 totalDur = formatSecsToHrsMins(grossSecs);
                 actualDur = formatSecsToHrsMins(Math.max(0, grossSecs - lSecs));
               }
            }

            return {
              id: `sheet-${idx}`,
              employeeCode: row[0] || '',
              employeeName: row[1] || '',
              date: row[2] || '',
              inTime: inTimeStr,
              outTime: outTimeStr,
              totalDuration: totalDur,
              totalWithLunchDuration: row[6] || actualDur,
              lunchTime: lunchTime,
              actualTotalDuration: actualDur,
              status: status,
              month: row[12] || '',
              year: row[11] || '',
            };
          }).filter(record => {
            const code = record.employeeCode.toString().trim().toLowerCase();
            const name = record.employeeName.toString().trim().toLowerCase();
            return (code && (code === resolvedId || code === loggedInUsername || code === loggedInEmployeeId)) || 
                   (name && (name === resolvedName || name === loggedInName));
          });
        }
      }

      // 4. Merge Data
      const combinedData = [...biometricData, ...sheetData];
      const uniqueData = [];
      const seenDates = new Set();
      biometricData.forEach(d => { uniqueData.push(d); seenDates.add(d.date); });
      sheetData.forEach(d => {
        const formattedDate = formatSheetDate(d.date);
        if (!seenDates.has(formattedDate)) { uniqueData.push(d); seenDates.add(formattedDate); }
      });

      if (uniqueData.length > 0) {
        setAttendanceData(uniqueData);
        setIsDemo(false);
      } else {
        setAttendanceData(DUMMY_ATTENDANCE);
        setIsDemo(true);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError(error.message);
      setAttendanceData(DUMMY_ATTENDANCE);
      setIsDemo(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDataSheet(selectedMonth, selectedYear);
  }, [selectedMonth, selectedYear]);

  const filteredAttendance = attendanceData.filter(record => {
    // Get actual month from the date field
    const recordDate = parseDateForSort(record.date);
    const recordMonthIndex = recordDate.getMonth();
    const recordYear = recordDate.getFullYear();
    
    // Get selected month index
    const monthList = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const selectedMonthIndex = selectedMonth ? monthList.findIndex(m => m.toLowerCase() === selectedMonth.toLowerCase()) : -1;
    const selectedYearNum = selectedYear ? parseInt(selectedYear) : null;
    
    // Filter based on actual date
    const monthMatch = selectedMonth === '' || selectedMonthIndex === -1 || recordMonthIndex === selectedMonthIndex;
    const yearMatch = selectedYear === '' || !selectedYearNum || recordYear === selectedYearNum;
    
    return monthMatch && yearMatch;
  }).sort((a, b) => parseDateForSort(a.date) - parseDateForSort(b.date));

  // Remove duplicate dates - keep only first occurrence per date
  const uniqueAttendance = filteredAttendance.filter((record, index, self) => {
    const recordDateStr = record.date?.toString().trim() || '';
    return index === self.findIndex(r => (r.date?.toString().trim() || '') === recordDateStr);
  });

  const totalDays = uniqueAttendance.length;
  const presentDays = uniqueAttendance.filter(r => r.status.trim().toLowerCase() === 'present').length;
  const absentDays = totalDays - presentDays;
  const totalHours = uniqueAttendance.reduce((sum, r) => {
    const dur = r.actualTotalDuration.toString();
    if (dur === '-') return sum;
    
    let hrs = 0;
    if (dur.includes('h')) {
      const parts = dur.split(' ');
      const h = parseFloat(parts[0]) || 0;
      const m = parts[1] ? parseFloat(parts[1]) || 0 : 0;
      hrs = h + m / 60;
    } else if (dur.includes(':')) {
      const parts = dur.split(':').map(Number);
      hrs = (parts[0] || 0) + (parts[1] || 0) / 60 + (parts[2] || 0) / 3600;
    } else {
      hrs = parseFloat(dur) || 0;
    }
    return sum + hrs;
  }, 0);

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  
  const months = [...new Set(attendanceData.map(r => {
    const d = parseDateForSort(r.date);
    return isNaN(d.getTime()) ? null : monthNames[d.getMonth()];
  }))].filter(Boolean);
  
  const years = [...new Set(attendanceData.map(r => {
    const d = parseDateForSort(r.date);
    return isNaN(d.getTime()) ? null : d.getFullYear();
  }))].filter(Boolean).sort((a, b) => b - a);

  const StatCard = ({ title, value, icon: Icon, colorClass }) => (
    <div className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100 transition-all hover:-translate-y-1">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-2xl ${colorClass} shadow-lg`}>
          <Icon size={24} className="text-white" />
        </div>
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{title}</p>
          <h3 className="text-2xl font-black text-gray-900 mt-1">{value}</h3>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-4 md:p-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">My Attendance</h1>
            {isDemo && (
              <span className="px-3 py-1 bg-amber-100 text-amber-700 text-[10px] font-black uppercase tracking-widest rounded-full border border-amber-200 animate-pulse">
                Demo Mode
              </span>
            )}
          </div>
          <p className="text-gray-500 mt-1 flex items-center gap-2">
            <Timer size={16} className="text-indigo-500" />
            Showing records for logged-in user.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 bg-white p-2 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 px-2 border-r border-gray-100 mr-2">
            <Filter size={16} className="text-indigo-400" />
            <span className="text-xs font-bold text-gray-400 uppercase">Filters</span>
          </div>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-transparent text-sm font-bold text-gray-700 focus:outline-none cursor-pointer"
          >
            <option value="">All Months</option>
            {months.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="bg-transparent text-sm font-bold text-gray-700 focus:outline-none cursor-pointer border-l border-gray-100 pl-4"
          >
            <option value="">All Years</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Present Days" value={presentDays} icon={CheckCircle2} colorClass="bg-green-500" />
        <StatCard title="Absent Days" value={absentDays} icon={XCircle} colorClass="bg-red-500" />
        <StatCard title="Total Duration" value={totalHours.toFixed(2)} icon={Clock} colorClass="bg-indigo-500" />
        <StatCard title="Total Records" value={totalDays} icon={FileText} colorClass="bg-blue-500" />
      </div>

      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
          <h2 className="text-xl font-bold text-gray-800">
            Attendance Records - {selectedMonth || 'All'} {selectedYear || 'Time'}
          </h2>
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
            <Calendar size={14} className="text-indigo-500" />
            Sheet Data: A2:J
          </div>
        </div>

        <div className="overflow-auto max-h-[60vh]">
          <table className="w-full text-left border-collapse relative">
            <thead className="sticky top-0 z-20 bg-white shadow-sm ring-1 ring-gray-100">
              <tr className="bg-white text-gray-400 uppercase text-[10px] font-black tracking-widest">
                <th className="bg-white px-6 py-4 border-b border-gray-100 whitespace-nowrap">Emp Code</th>
                <th className="bg-white px-6 py-4 border-b border-gray-100 whitespace-nowrap">Emp Name</th>
                <th className="bg-white px-6 py-4 border-b border-gray-100 whitespace-nowrap">Date</th>
                <th className="bg-white px-6 py-4 border-b border-gray-100 text-green-600 whitespace-nowrap">IN Time</th>
                <th className="bg-white px-6 py-4 border-b border-gray-100 text-red-600 whitespace-nowrap">OUT Time</th>
                <th className="bg-white px-6 py-4 border-b border-gray-100 whitespace-nowrap">Total Duration</th>
                <th className="bg-white px-6 py-4 border-b border-gray-100 whitespace-nowrap">Total With Lunch Duration</th>
                <th className="bg-white px-6 py-4 border-b border-gray-100 whitespace-nowrap">Lunch Time</th>
                <th className="bg-white px-6 py-4 border-b border-gray-100 text-indigo-600 whitespace-nowrap">Actual</th>
                <th className="bg-white px-6 py-4 border-b border-gray-100 whitespace-nowrap">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan="11" className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-gray-500 font-medium font-bold">Matching User ID...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredAttendance.length === 0 ? (
                <tr>
                  <td colSpan="11" className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <AlertCircle size={40} className="text-gray-200" />
                      <p className="text-gray-500 font-medium">No records found for your ID in this period.</p>
                      <button onClick={fetchDataSheet} className="text-xs font-black text-indigo-600 hover:underline">RETRY SYNC</button>
                    </div>
                  </td>
                </tr>
              ) : uniqueAttendance.map((record, index) => (
                <tr key={index} className="group hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-5 text-sm font-bold text-gray-900">{record.employeeCode}</td>
                  <td className="px-6 py-5 text-sm font-medium text-gray-700">{record.employeeName}</td>
                  <td className="px-6 py-5 text-sm text-gray-500 font-bold">{formatSheetDate(record.date)}</td>
                  <td className="px-6 py-5 text-sm text-green-600 font-bold">{formatSheetTime(record.inTime)}</td>
                  <td className="px-6 py-5 text-sm text-red-600 font-bold">{formatSheetTime(record.outTime)}</td>
                  <td className="px-6 py-5 text-sm text-gray-500 font-medium">{formatDuration(record.totalDuration)}</td>
                  <td className="px-6 py-5 text-sm text-gray-500 font-medium">{formatDuration(record.totalWithLunchDuration)}</td>
                  <td className="px-6 py-5 text-xs text-amber-600 font-bold flex items-center gap-1 mt-4">
                    <Coffee size={12} /> {formatDuration(record.lunchTime)}
                  </td>
                  <td className="px-6 py-5 text-sm font-black text-indigo-600">{formatDuration(record.actualTotalDuration)}</td>
                  <td className="px-6 py-5">
                    <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-full ${
                      record.status.trim().toLowerCase() === 'present' || record.status.trim().toLowerCase() === 'clocked in'
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-700'
                      }`}>
                      {record.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MyAttendance;
