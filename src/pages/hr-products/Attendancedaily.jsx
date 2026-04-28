import React, { useEffect, useState } from 'react';
import { Search, Download, Calendar, Loader2, CheckCircle, X, Clock, Pencil, CheckCircle2, XCircle, FileText } from 'lucide-react';
import * as XLSX from 'xlsx';
import { DEVICE_LOGS_BASE_URL } from '../../utils/envConfig';

const DEVICES = [
  { name: 'ALL DEVICES', serial: 'ALL', apiName: 'ALL' },
  { name: 'BAWDHAN', apiName: 'BAVDHAN', serial: 'C26238441B1E342D' },
  { name: 'HINJEWADI', apiName: 'HINJEWADI', serial: 'AMDB25061400335' },
  { name: 'WAGHOLI', apiName: 'WAGHOLI', serial: 'AMDB25061400343' },
  { name: 'AKOLE', apiName: 'AKOLE', serial: 'C262CC13CF202038' },
  { name: 'MUMBAI', apiName: 'MUMBAI', serial: 'C2630450C32A2327' }
];


const JOINING_API_URL = 'https://script.google.com/macros/s/AKfycbyGp3onARkG7QfXKSZ22J6PokX-rYEYjOd-loijl7CqfnmDev_-aukiXp1vZ7yToJKQ/exec?sheet=JOINING&action=fetch';
const HOLIDAY_API_URL = 'https://script.google.com/macros/s/AKfycbyGp3onARkG7QfXKSZ22J6PokX-rYEYjOd-loijl7CqfnmDev_-aukiXp1vZ7yToJKQ/exec?spreadsheetId=1GnzBl9yq2M5FXBeCNnPIVL5PFSTXi2T3SBBOCHAKqMs&sheet=Holiday%20List&action=fetch';
const SYNC_URL = 'https://script.google.com/macros/s/AKfycbz009j6fH3ADRbVJYJGt2QnXu6si3isPR3CHvtv06W7DOEret6CEiJWc_PbDcKY5SSs/exec';
const MASTER_MAP_URL = 'https://script.google.com/macros/s/AKfycbyGp3onARkG7QfXKSZ22J6PokX-rYEYjOd-loijl7CqfnmDev_-aukiXp1vZ7yToJKQ/exec?sheet=MASTER&action=fetch';

const Attendancedaily = () => {
  const todayDate = new Date().toISOString().split('T')[0];
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState(todayDate);
  const [endDate, setEndDate] = useState(todayDate);
  const [selectedDevice, setSelectedDevice] = useState(DEVICES[0]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [rawLogs, setRawLogs] = useState([]);
  const [rawSearchId, setRawSearchId] = useState('');
  const [rawSearchStore, setRawSearchStore] = useState('');
  const [joiningData, setJoiningData] = useState([]);
  const [holidayData, setHolidayData] = useState([]);
  const [deviceMapping, setDeviceMapping] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [editingId, setEditingId] = useState(null);
  const [tempInTime, setTempInTime] = useState('');
  const [tempOutTime, setTempOutTime] = useState('');
  const [activeTab, setActiveTab] = useState('All');



  const formatTime12h = (dateStr) => {
    if (!dateStr || dateStr === '-') return '-';
    try {
      const parts = dateStr.trim().split(' ');
      let timePart = parts[1] || parts[0];
      if (!timePart) return dateStr;

      // Check if already in 12h format or has AM/PM
      const hasAMPM = timePart.toLowerCase().includes('am') || timePart.toLowerCase().includes('pm');
      if (hasAMPM && !dateStr.includes('-')) {
        return timePart.toUpperCase();
      }

      if (!timePart.includes(':')) return dateStr;

      let [hoursPart, minutesFull] = timePart.split(':');
      let hours = parseInt(hoursPart);
      let minutes = minutesFull ? minutesFull.slice(0, 2) : '00'; // Take only first 2 digits

      const isPM = timePart.toLowerCase().includes('pm') || hours >= 12;
      const ampm = isPM ? 'PM' : 'AM';
      const h12 = hours % 12 || 12;

      return `${h12}:${minutes.padStart(2, '0')} ${ampm}`;
    } catch (e) {
      return dateStr;
    }
  };

  const calculateHoursMins = (diffMs) => {
    if (!diffMs || isNaN(diffMs) || diffMs <= 0) return '00:00:00';
    const totalSecs = Math.floor(diffMs / 1000);
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const calculateWorkHours = (inStr, outStr, dateContext = '') => {
    if (!inStr || !outStr || inStr === '-' || outStr === '-' || inStr === outStr) return '00:00:00';
    try {
      const parse = (s) => {
        if (!s || s === '-') return null;
        try {
          // 1. Try full date string first
          if (s.includes('-') && s.includes(':')) {
            const d = new Date(s.replace(/-/g, '/'));
            if (!isNaN(d.getTime())) return d;
          }

          // 2. Manual robust parsing for time-only strings (e.g. "7:00PM", "11:04 AM")
          let cleanTime = s.trim().toUpperCase();
          const isPM = cleanTime.includes('PM');
          const isAM = cleanTime.includes('AM');
          cleanTime = cleanTime.replace(/[AP]M/g, '').trim();

          const parts = cleanTime.split(':');
          let h = parseInt(parts[0]) || 0;
          let m = parseInt(parts[1]) || 0;
          let sec = parseInt(parts[2]) || 0;

          if (isPM && h < 12) h += 12;
          if (isAM && h === 12) h = 0;

          // Use provided dateContext or current date
          const baseDate = dateContext ? new Date(dateContext.replace(/-/g, '/')) : new Date();
          baseDate.setHours(h, m, sec, 0);
          return baseDate;
        } catch (e) {
          return null;
        }
      };

      const inDate = parse(inStr);
      const outDate = parse(outStr);
      if (!inDate || !outDate || outDate <= inDate) return '00:00:00';
      return calculateHoursMins(outDate - inDate);
    } catch (e) {
      return '00:00:00';
    }
  };

  const calculateOvertime = (workHoursStr) => {
    if (!workHoursStr || workHoursStr === '0h 0m' || workHoursStr === '00:00:00') return '0h 0m';
    try {
      let h = 0, m = 0;
      if (workHoursStr.includes(':')) {
        const parts = workHoursStr.split(':').map(Number);
        h = parts[0] || 0;
        m = parts[1] || 0;
      } else {
        const parts = workHoursStr.split(' ').map(s => parseInt(s) || 0);
        h = parts[0] || 0;
        m = parts[1] || 0;
      }
      const totalMinutes = h * 60 + m;
      const standardMinutes = 8 * 60;
      if (totalMinutes <= standardMinutes) return '0h 0m';
      const otMinutes = totalMinutes - standardMinutes;
      return `${Math.floor(otMinutes / 60)}h ${otMinutes % 60}m`;
    } catch (e) { return '0h 0m'; }
  };

  const calculateLateMinutes = (inStr, dateContext = '') => {
    if (!inStr || inStr === '-') return 0;
    try {
      const parse = (s) => {
        if (!s || s === '-') return null;
        try {
          if (s.includes('-') && s.includes(':')) {
            const d = new Date(s.replace(/-/g, '/'));
            if (!isNaN(d.getTime())) return d;
          }
          let cleanTime = s.trim().toUpperCase();
          const isPM = cleanTime.includes('PM');
          const isAM = cleanTime.includes('AM');
          cleanTime = cleanTime.replace(/[AP]M/g, '').trim();

          const parts = cleanTime.split(':');
          let h = parseInt(parts[0]) || 0;
          let m = parseInt(parts[1]) || 0;
          let sec = parseInt(parts[2]) || 0;

          if (isPM && h < 12) h += 12;
          if (isAM && h === 12) h = 0;

          const baseDate = dateContext ? new Date(dateContext.replace(/-/g, '/')) : new Date();
          baseDate.setHours(h, m, sec, 0);
          return baseDate;
        } catch (e) {
          return null;
        }
      };

      const inDate = parse(inStr);
      if (!inDate) return 0;

      const hours = inDate.getHours();
      const minutes = inDate.getMinutes();
      const totalMinutes = hours * 60 + minutes;

      const officialStartTime = 10 * 60 + 0; // 10:00 AM
      const graceTimeThreshold = 10 * 60 + 10; // 10:10 AM
      const lateCutoffTime = 12 * 60 + 0; // 12:00 PM

      // 1 Condtion: 10:00 AM to 12:00 PM
      if (totalMinutes > graceTimeThreshold && totalMinutes <= lateCutoffTime) {
        return totalMinutes - officialStartTime;
      }
      
      // 2 Condtion: After 12:00 PM - No late time added
      return 0;
    } catch (e) {
      return 0;
    }
  };

  const syncToMachineDataSheet = async (data) => {
    if (!data || data.length === 0) return;

    setSyncing(true);
    setSyncProgress(0);
    const SPECIFIED_SPREADSHEET_ID = '1lg8cvRaYHpnR75bWxHoh-a30-gGL94-_WAnE7Zue6r8';

    let successCount = 0;
    let failCount = 0;
    const batchSize = 5; // Sync 5 records at a time for speed

    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);

      await Promise.all(batch.map(async (item) => {
        const rowData = [
          item.EmployeeID || item.EmployeeCode || '-',
          item.EmployeeName || '-',
          item.Date || '-',
          formatTime12h(item.InTime),
          formatTime12h(item.OutTime),
          item.WorkingHour || '-',
          item.StoreName || '-'
        ];


        try {
          const response = await fetch(SYNC_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              sheetName: 'Formatted_Attendance',
              spreadsheetId: SPECIFIED_SPREADSHEET_ID,
              action: 'insert',
              rowData: JSON.stringify(rowData)
            })
          });
          const result = await response.json();
          if (result.success) successCount++;
          else failCount++;
        } catch (err) {
          console.error('Sync failed for row:', item, err);
          failCount++;
        }
      }));

      setSyncProgress(Math.round((Math.min(i + batchSize, data.length) / data.length) * 100));
    }

    setSyncing(false);
    if (successCount > 0) {
      console.log(`Synced ${successCount} records to Formatted_Attendance Sheet. ${failCount} failed.`);
    }
  };

  const handleStartEdit = (item) => {
    setEditingId(`${item.EmployeeID}_${item.Date}`);
    setTempInTime(item.InTime === '-' ? '' : item.InTime);
    setTempOutTime(item.OutTime === '-' ? '' : item.OutTime);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setTempInTime('');
    setTempOutTime('');
  };

  const handleSaveEdit = async (item, index) => {
    setLoading(true);
    try {
      const newInTime = tempInTime || item.InTime;
      const newOutTime = tempOutTime || item.OutTime;

      // Recalculate values for the edited row with date context
      const newLateMins = calculateLateMinutes(newInTime, item.Date);
      const newWorkHrs = calculateWorkHours(newInTime, newOutTime, item.Date);
      const newOvertimeHrs = calculateOvertime(newWorkHrs);

      const isInEdited = newInTime !== item.InTime;
      const isOutEdited = newOutTime !== item.OutTime;

      const updatedItem = {
        ...item,
        InTime: newInTime,
        OutTime: newOutTime,
        LateMinute: newLateMins,
        WorkingHour: newWorkHrs,
        Overtime: newOvertimeHrs,
        IsInEdited: isInEdited || item.IsInEdited,
        IsOutEdited: isOutEdited || item.IsOutEdited,
        Status: newLateMins > 0 ? 'LET' : 'PRESENT'
      };

      // Update local state
      const newData = [...attendanceData];
      const dataIndex = attendanceData.findIndex(d => d.EmployeeID === item.EmployeeID && d.Date === item.Date);
      if (dataIndex !== -1) {
        newData[dataIndex] = updatedItem;
        setAttendanceData(newData);
      }

      // Sync to machine/database (Google Sheet)
      const SPECIFIED_SPREADSHEET_ID = '1lg8cvRaYHpnR75bWxHoh-a30-gGL94-_WAnE7Zue6r8';

      const rowData = [
        updatedItem.EmployeeID,
        updatedItem.EmployeeName,
        updatedItem.Date,
        formatTime12h(updatedItem.InTime),
        formatTime12h(updatedItem.OutTime),
        updatedItem.WorkingHour,
        updatedItem.StoreName,
        'MANUAL_EDIT' // Identifier
      ];

      await fetch(SYNC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          sheetName: 'Formatted_Attendance',
          spreadsheetId: SPECIFIED_SPREADSHEET_ID,
          action: 'insert', // Re-inserting for now as current backend logic might handle deduplication or auditing
          rowData: JSON.stringify(rowData)
        })
      });

      setEditingId(null);
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setLoading(false);
    }
  };



  const fetchDeviceLogs = async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch Joining Data if not already loaded
      let currentJoining = joiningData;
      if (joiningData.length === 0) {
        const jResponse = await fetch(JOINING_API_URL);
        const jResult = await jResponse.json();
        if (jResult.success) {
          const rawRows = jResult.data || jResult;
          const headers = rawRows[5];
          const dataRows = rawRows.slice(6);

          const getIdx = (name) => headers.findIndex(h => h && h.toString().trim().toLowerCase() === name.toLowerCase());
          const empIdIdx = getIdx('Employee ID');
          const nameIdx = getIdx('Name As Per Aadhar');
          const desIdx = getIdx('Designation');
          const storeIdx = getIdx('Joining Place');

          currentJoining = dataRows.map(r => ({
            id: r[empIdIdx]?.toString().trim(),
            name: r[nameIdx]?.toString().trim(),
            designation: r[getIdx('Designation')]?.toString().trim() || r[desIdx]?.toString().trim(),
            store: r[getIdx('Joining Place')]?.toString().trim() || r[storeIdx]?.toString().trim()
          })).filter(h => h.id);
          setJoiningData(currentJoining);
        }
      }

      // 1b. Fetch Device User Mapping from MASTER sheet (HR FMS V.1)
      const dmResponse = await fetch(MASTER_MAP_URL);
      const dmResult = await dmResponse.json();
      let currentMapping = [];
      if (dmResult.success) {
        const rows = dmResult.data.slice(1); // Skip headers
        currentMapping = rows.map(r => ({
          userId: r[5]?.toString().trim(),
          name: r[6]?.toString().trim(),
          deviceId: r[7]?.toString().trim(),
          serialNo: r[8]?.toString().trim(),
          storeName: r[9]?.toString().trim()
        }));
        setDeviceMapping(currentMapping);
      }

      // 2. Fetch Device Logs
      const queryStart = startDate || '2026-04-01';
      const queryEnd = endDate || '2026-04-30';

      let rawLogs = [];
      if (selectedDevice.name === 'ALL DEVICES') {
        const otherDevices = DEVICES.filter(d => d.name !== 'ALL DEVICES');
        const allResponses = await Promise.all(
          otherDevices.map(async (device) => {
            try {
              const url = `${DEVICE_LOGS_BASE_URL}?APIKey=211616032630&SerialNumber=${device.serial}&DeviceName=${device.apiName}&FromDate=${queryStart}&ToDate=${queryEnd}`;
              const res = await fetch(url);
              if (!res.ok) return [];
              const logs = await res.json();
              // Inject Device Name for identification
              return Array.isArray(logs) ? logs.map(l => ({ ...l, _DeviceName: device.name })) : [];
            } catch (e) {
              console.error(`Error fetching for ${device.name}:`, e);
              return [];
            }
          })
        );
        rawLogs = allResponses.flat();
      } else {
        const API_URL = `${DEVICE_LOGS_BASE_URL}?APIKey=211616032630&SerialNumber=${selectedDevice.serial}&DeviceName=${selectedDevice.apiName}&FromDate=${queryStart}&ToDate=${queryEnd}`;
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        rawLogs = Array.isArray(data) ? data.map(l => ({ ...l, _DeviceName: selectedDevice.name })) : [];
      }

      if (!rawLogs || rawLogs.length === 0) {
        setAttendanceData([]);
        return;
      }


      // Strict filter for records from April 1st, 2026 onwards
      const filteredLogs = rawLogs.filter(log => {
        if (!log.LogDate) return false;
        const logDateStr = log.LogDate.split(' ')[0];
        return logDateStr >= '2026-04-01';
      });

      filteredLogs.sort((a, b) => new Date(a.LogDate) - new Date(b.LogDate));

      const grouped = {};
      filteredLogs.forEach(log => {
        if (!log.EmployeeCode || !log.LogDate) return;
        const dateStr = log.LogDate.split(' ')[0];
        const key = `${log.EmployeeCode}_${dateStr}`;

        if (!grouped[key]) {
          grouped[key] = {
            EmployeeCode: log.EmployeeCode.toString().trim(),
            Date: dateStr,
            SerialNumber: log.SerialNumber,
            SourceDeviceName: log._DeviceName, // Store the source device
            logs: []
          };
        }
        grouped[key].logs.push(log.LogDate);

      });

      const aggregatedData = Object.values(grouped).map(group => {
        const logs = group.logs;
        let inTime = '-';
        let outTime = '-';
        let lunchOut = '-';
        let lunchIn = '-';

        if (logs.length === 1) {
          const punchTime = logs[0];
          const timePart = punchTime.split(' ')[1] || '';
          const hours = parseInt(timePart.split(':')[0]) || 0;
          // If single punch is 3 PM or later, it's likely an OUT punch (Morning Missed)
          if (hours >= 15) {
            inTime = '-';
            outTime = logs[0];
          } else {
            inTime = logs[0];
            outTime = '-';
          }
        } else if (logs.length > 1) {
          inTime = logs[0];
          outTime = logs[logs.length - 1];
          if (logs.length >= 4) {
            lunchOut = logs[1];
            lunchIn = logs[2];
          } else if (logs.length === 3) {
            lunchOut = logs[1];
          }
        }

        const serial = group.SerialNumber.toString().trim();
        const code = group.EmployeeCode.toString().trim();
        const isNumeric = !isNaN(code) && code !== '';

        // Fallback to Joining Meta (Original Source)
        const empMeta = currentJoining.find(e =>
          (e.id && e.id.toLowerCase() === code.toLowerCase()) ||
          (e.name && e.name.toLowerCase() === code.toLowerCase())
        );

        // Flexible Mapping: Find in MASTER mapping
        // Priority 1: Match by UserId (Employee Code)
        let dMap = currentMapping.find(m => m.userId && m.userId.toString().toLowerCase() === code.toLowerCase());

        // Priority 2: Match by Name if UserId didn't match (for some "Unknown" cases where code is actually a name)
        if (!dMap) {
          const entryName = (empMeta?.name || code).toString().trim().toLowerCase();
          dMap = currentMapping.find(m => m.name && m.name.toString().toLowerCase() === entryName);
        }

        const displayName = dMap ? dMap.name : (empMeta ? empMeta.name : (isNumeric ? 'Unknown' : code));
        const displayCode = dMap ? dMap.userId : (empMeta ? empMeta.id : (isNumeric ? code : 'Unknown'));
        const displayStore = dMap ? dMap.storeName : (empMeta ? empMeta.store : group.SourceDeviceName);
        const displayDeviceId = dMap ? dMap.deviceId : '-';
        const displayAssignedSerial = dMap ? dMap.serialNo : serial;


        const lateMins = calculateLateMinutes(inTime);
        const workHrs = (inTime === '-' || outTime === '-') ? '0h 0m' : calculateWorkHours(inTime, outTime);
        const overtimeHrs = calculateOvertime(workHrs);

        // LUNCH & WASTE TIME LOGIC
        // Actual lunch time is the sum of all gaps between middle punches
        let actualLunchMs = 0;
        if (logs.length > 2) {
          for (let i = 1; i < logs.length - 1; i += 2) {
            const lOut = new Date(logs[i].replace(/-/g, '/'));
            const lIn = new Date(logs[i + 1].replace(/-/g, '/'));
            actualLunchMs += Math.max(0, lIn - lOut);
          }
        }

        // Standard lunch = 2 hours 30 mins = 9000 seconds
        const standardLunchMs = 2.5 * 3600 * 1000;
        const wasteTimeMs = Math.max(0, actualLunchMs - standardLunchMs);
        const displayLunchMs = Math.min(actualLunchMs, standardLunchMs);

        const dateObj = new Date(group.Date);
        const dayName = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(dateObj);
        const isWorkingDay = 'Yes';

        const totalDurationMs = (inTime !== '-' && outTime !== '-') ? (new Date(outTime.replace(/-/g, '/')) - new Date(inTime.replace(/-/g, '/'))) : 0;
        const netWorkMs = Math.max(0, totalDurationMs - actualLunchMs);
        const netWorkHours = netWorkMs / (1000 * 3600);

        const isToday = group.Date === todayDate;
        const holiday = holidayData.find(h => h.date === group.Date);

        let status = 'PRESENT';
        let statusReason = '';

        if (holiday) {
          status = 'PRESENT';
          statusReason = `Holiday: ${holiday.name}`;
        } else if (inTime === '-' || outTime === '-') {
          // Missing punch - mark as absent
          if (isToday && inTime !== '-' && outTime === '-') {
            // Today with only in-time - still working
            if (lateMins > 0) {
              status = 'LET';
              statusReason = `Late arrival: ${lateMins} min`;
            } else {
              status = 'PRESENT';
            }
          } else {
            status = 'ABSENT';
            statusReason = 'Incomplete punch record';
          }
        } else {
          // Both punches present
          if (lateMins > 0) {
            status = 'LET';
            statusReason = `Late arrival: ${lateMins} min`;
          } else {
            status = 'PRESENT';
          }
        }

        // Full Punch Log (All recorded times for this day)
        const punchLogStr = logs.map(l => formatTime12h(l)).join(' | ');

        // PUNCH LOG STATUS LOGIC
        let punchLogStatus = 'Bahar';
        if (logs.length > 0) {
          if (logs.length % 2 === 1) {
            // Odd number of punches
            if (logs.length === 1) {
              const punchTime = logs[0];
              const timePart = punchTime.split(' ')[1] || '';
              const hours = parseInt(timePart.split(':')[0]) || 0;
              punchLogStatus = hours >= 15 ? 'Bahar' : 'Andar';
            } else {
              punchLogStatus = 'Andar';
            }
          } else {
            // Even number of punches
            punchLogStatus = 'Bahar';
          }
        }

        return {
          EmployeeID: displayCode,
          EmployeeName: displayName,
          Date: group.Date,
          Day: dayName,
          IsWorkingDay: isWorkingDay,
          InTime: inTime,
          StandardLunch: calculateHoursMins(displayLunchMs), // Shows actual lunch time up to 2:30
          WasteTime: calculateHoursMins(wasteTimeMs),
          OutTime: outTime,
          PunchLog: punchLogStr, // NEW: Full list of punches
          PunchLogStatus: punchLogStatus,
          StoreName: displayStore,
          DeviceID: displayDeviceId,
          Designation: empMeta ? empMeta.designation : '-',
          SerialNumber: serial, // Actual punch serial
          AssignedSerial: displayAssignedSerial,
          Status: status,
          StatusReason: statusReason,
          WorkingHour: workHrs,
          Overtime: overtimeHrs,
          LateMinute: lateMins,
          PunchMiss: (inTime === '-' || outTime === '-') && !(inTime === '-' && outTime === '-') ? 'Yes' : 'No',
          PunchMissMsg: inTime === '-' && outTime !== '-' ? 'Morning Punch Miss' : 
                        inTime !== '-' && outTime === '-' ? 'Evening Punch Miss' : ''
        };
      });

      // Post-process for Holidays: Ensure ALL employees are PRESENT on holiday dates
      const rangeDates = getDatesInRange(queryStart, queryEnd);
      const holidayDatesInSelectedRange = rangeDates.filter(d => holidayData.some(h => h.date === d));

      let finalAggregated = [...aggregatedData];

      holidayDatesInSelectedRange.forEach(hDate => {
        const holidayInfo = holidayData.find(h => h.date === hDate);
        currentJoining.forEach(emp => {
          const existingIdx = finalAggregated.findIndex(a => a.EmployeeID === emp.id && a.Date === hDate);
          if (existingIdx !== -1) {
            // Force present status for existing record
            finalAggregated[existingIdx] = {
              ...finalAggregated[existingIdx],
              Status: 'PRESENT',
              StatusReason: `Holiday: ${holidayInfo.name}`,
              LateMinute: 0,
              PunchMiss: 'No',
              PunchMissMsg: ''
            };
          } else {
            // Add new record for employee who didn't punch on holiday
            finalAggregated.push({
              EmployeeID: emp.id,
              EmployeeName: emp.name,
              Date: hDate,
              Day: new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date(hDate)),
              IsWorkingDay: 'Yes',
              InTime: '-',
              StandardLunch: '00:00:00',
              WasteTime: '00:00:00',
              OutTime: '-',
              PunchLog: 'Holiday (No Punch)',
              PunchLogStatus: 'Bahar',
              StoreName: emp.store || '-',
              DeviceID: '-',
              Designation: emp.designation || '-',
              SerialNumber: '-',
              AssignedSerial: '-',
              Status: 'PRESENT',
              StatusReason: `Holiday: ${holidayInfo.name}`,
              WorkingHour: '00:00:00',
              Overtime: '0h 0m',
              LateMinute: 0,
              PunchMiss: 'No',
              PunchMissMsg: ''
            });
          }
        });
      });

      finalAggregated.sort((a, b) => {
        const dateA = new Date(a.Date);
        const dateB = new Date(b.Date);
        return dateB - dateA;
      });
      setAttendanceData(finalAggregated);

      // Process individual log entries for the "Attendance Log" table
      const processedRawLogs = filteredLogs.map(log => {
        const code = log.EmployeeCode.toString().trim();
        const empMeta = currentJoining.find(e =>
          (e.id && e.id.toLowerCase() === code.toLowerCase()) ||
          (e.name && e.name.toLowerCase() === code.toLowerCase())
        );

        let dMap = currentMapping.find(m => m.userId && m.userId.toString().toLowerCase() === code.toLowerCase());
        if (!dMap) {
          const entryName = (empMeta?.name || code).toString().trim().toLowerCase();
          dMap = currentMapping.find(m => m.name && m.name.toString().toLowerCase() === entryName);
        }

        const displayName = dMap ? dMap.name : (empMeta ? empMeta.name : (isNaN(code) ? code : 'Unknown'));
        const displayCode = dMap ? dMap.userId : (empMeta ? empMeta.id : (isNaN(code) ? 'Unknown' : code));
        const displayStore = dMap ? dMap.storeName : (empMeta ? empMeta.store : log._DeviceName);
        const displayDeviceId = dMap ? dMap.deviceId : '-';
        const displayAssignedSerial = dMap ? dMap.serialNo : log.SerialNumber;

        const dateObj = new Date(log.LogDate.replace(/-/g, '/'));

        return {
          date: log.LogDate.split(' ')[0],
          day: dateObj.toLocaleDateString('en-US', { weekday: 'long' }),
          time: log.LogDate.split(' ')[1] || '',
          employeeId: displayCode,
          employeeName: displayName,
          storeName: displayStore,
          deviceId: displayDeviceId,
          serialNo: displayAssignedSerial
        };
      });

      setRawLogs(processedRawLogs);

      // Automatic background sync to Google Sheet
      syncToMachineDataSheet(aggregatedData);
    } catch (error) {

      console.error('Error fetching data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchHolidays = async () => {
      try {
        const localHolidaysRaw = localStorage.getItem('local_holiday_list');
        const localHolidays = localHolidaysRaw ? JSON.parse(localHolidaysRaw) : [];
        
        const response = await fetch(HOLIDAY_API_URL);
        const result = await response.json();
        let apiHolidays = [];
        if (result.success) {
          const rows = result.data.slice(1);
          apiHolidays = rows.map(r => {
            if (!r[0]) return null;
            let formattedDate = r[0].toString().trim();
            if (formattedDate.includes('/')) {
              const parts = formattedDate.split('/');
              if (parts.length === 3) {
                formattedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
              }
            } else if (formattedDate.includes(' ')) {
              formattedDate = formattedDate.split(' ')[0];
            } else if (formattedDate.includes('T')) {
              formattedDate = formattedDate.split('T')[0];
            }
            return { date: formattedDate, name: (r[2] || r[1] || 'Holiday').toString().trim() };
          }).filter(h => h && h.date);
        }
        
        // Merge API and Local Holidays (Local takes precedence)
        const combined = [...localHolidays];
        apiHolidays.forEach(ah => {
          if (!combined.some(lh => lh.date === ah.date)) {
            combined.push(ah);
          }
        });
        setHolidayData(combined);
      } catch (e) { 
        console.error('Holiday fetch error:', e);
        // Fallback to local if API fails
        const localHolidaysRaw = localStorage.getItem('local_holiday_list');
        if (localHolidaysRaw) setHolidayData(JSON.parse(localHolidaysRaw));
      }
    };
    fetchHolidays();
  }, []);

  useEffect(() => {
    fetchDeviceLogs();
  }, [startDate, endDate, selectedDevice]);

  const filteredData = attendanceData.filter(item => {
    const matchesSearch =
      (item.EmployeeID && item.EmployeeID.toString().toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.EmployeeName && item.EmployeeName.toString().toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.SerialNumber && item.SerialNumber.toString().toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesSearch;
  });

  const filteredRawLogs = rawLogs.filter(log => {
    const matchesGeneral = log.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.employeeId.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.serialNo.toString().toLowerCase().includes(searchTerm.toLowerCase());

    const matchesId = !rawSearchId || log.employeeId.toString() === rawSearchId;
    const matchesStore = !rawSearchStore || log.storeName === rawSearchStore;

    return matchesGeneral && matchesId && matchesStore;
  });

  const uniqueIds = [...new Set(rawLogs.map(l => l.employeeId))].filter(Boolean).sort();
  const uniqueStores = [...new Set(rawLogs.map(l => l.storeName))].filter(Boolean).sort();

  const durationToSecs = (val) => {
    if (!val || val === '0h 0m' || val === '00:00:00' || val === '-') return 0;
    try {
      const parts = val.split(':');
      if (parts.length >= 2) {
        let h = parseInt(parts[0], 10) || 0;
        let m = parseInt(parts[1], 10) || 0;
        let s = parts[2] ? parseInt(parts[2], 10) : 0;
        return h * 3600 + m * 60 + s;
      }
    } catch (e) { return 0; }
    return 0;
  };

  const calculateHoursMinsFromSecs = (totalSecs) => {
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = Math.floor(totalSecs % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getDaysDiff = (start, end) => {
    if (!start || !end) return 1;
    const d1 = new Date(start);
    const d2 = new Date(end);
    const diffTime = Math.abs(d2 - d1);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays + 1;
  };

  const StatCard = ({ title, value, icon: Icon, colorClass, onClick, active }) => (
    <div
      onClick={onClick}
      className={`bg-white items-center flex gap-4 rounded-3xl p-6 shadow-xl border-2 transition-all hover:-translate-y-1 cursor-pointer ${active ? 'border-indigo-500 bg-indigo-50/50' : 'border-transparent'}`}
    >
      <div className={`p-3 flex items-center justify-center rounded-2xl ${colorClass} shadow-lg shrink-0`}>
        <Icon size={24} className="text-white" />
      </div>
      <div>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{title}</p>
        <h3 className="text-2xl font-black text-gray-900 mt-1">{value}</h3>
      </div>
    </div>
  );

  const getDatesInRange = (start, end) => {
    const dates = [];
    let current = new Date(start);
    const endDate = new Date(end);
    while (current <= endDate) {
      dates.push(new Date(current).toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };

  const showStats = searchTerm.trim() !== '';
  const totalDaysInRange = getDaysDiff(startDate, endDate);
  const presentDaysLogs = filteredData.filter(d => ['PRESENT', 'Present', 'LET', 'Late'].includes(d.Status));
  const presentDaysCount = presentDaysLogs.length;
  const absentDaysCount = Math.max(0, totalDaysInRange - presentDaysCount);
  const totalRecordsCount = filteredData.length;
  const totalDurationSecs = filteredData.reduce((sum, r) => sum + durationToSecs(r.WorkingHour || '00:00:00'), 0);
  const totalDurationFormatted = calculateHoursMinsFromSecs(totalDurationSecs);

  const getFilteredRenderData = () => {
    if (!showStats || activeTab === 'All') return filteredData;

    if (activeTab === 'Present') {
      return presentDaysLogs;
    }

    const presentDates = filteredData.map(d => d.Date);
    const datesInRange = getDatesInRange(startDate, endDate);
    const empTemplate = filteredData[0] || {};

    // Generate full calendar for the searched employee
    const fullCalendar = datesInRange.map(dateStr => {
      const existingRecord = filteredData.find(d => d.Date === dateStr);
      if (existingRecord) return existingRecord;

      const d = new Date(dateStr);
      const holiday = holidayData.find(h => h.date === dateStr);

      return {
        EmployeeID: empTemplate.EmployeeID || searchTerm,
        EmployeeName: empTemplate.EmployeeName || '-',
        Date: dateStr,
        Day: new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(d),
        IsWorkingDay: 'Yes',
        InTime: '-',
        StandardLunch: '-',
        WasteTime: '-',
        OutTime: '-',
        PunchLog: '-',
        PunchLogStatus: '-',
        StoreName: empTemplate.StoreName || '-',
        DeviceID: empTemplate.DeviceID || '-',
        Designation: empTemplate.Designation || '-',
        SerialNumber: empTemplate.SerialNumber || '-',
        AssignedSerial: empTemplate.AssignedSerial || '-',
        Status: holiday ? 'PRESENT' : 'Absent',
        StatusReason: holiday ? `Holiday: ${holiday.name}` : '',
        WorkingHour: '00:00:00',
        Overtime: '0h 0m',
        LateMinute: 0,
        PunchMiss: 'No',
        PunchMissMsg: ''
      };
    });

    if (activeTab === 'Present') {
      return fullCalendar.filter(d => ['PRESENT', 'Present', 'LET', 'Late'].includes(d.Status));
    }
    if (activeTab === 'Absent') {
      return fullCalendar.filter(d => ['ABSENT', 'Absent', 'Holiday'].includes(d.Status));
    }

    return fullCalendar;
  };

  const dataToRender = getFilteredRenderData();

  const downloadExcel = () => {
    const dataToExport = dataToRender.map((item, index) => ({
      'S.No.': index + 1,
      'Date': item.Date,
      'Day': item.Day,
      'Working Day': item.IsWorkingDay,
      'Employee ID': item.EmployeeID,
      'Employee Name': item.EmployeeName,
      'Designation': item.Designation,
      'IN Time': formatTime12h(item.InTime),

      'Lunch Time': item.StandardLunch,
      'Wast Time': item.WasteTime,
      'OUT Time': formatTime12h(item.OutTime),
      'Punch Logs': item.PunchLog, // Included in Export
      'Punch Log Status': item.PunchLogStatus,
      'Status': item.Status,
      'Working Hour': item.WorkingHour,
      'Late Minute': item.LateMinute,
      'Punch Miss': item.PunchMiss,
      'Store Name': item.StoreName,
      'Device ID': item.DeviceID,
      'Serial NO': item.AssignedSerial
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Device Logs");
    XLSX.writeFile(workbook, `device_logs_${startDate || 'all'}_to_${endDate || 'all'}.xlsx`);
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:ml-12">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-black">
            Daily Device Logs
          </h1>
          <p className="text-sm text-gray-500 mt-1">Track real-time device check-ins and check-outs</p>
        </div>
        <div className="flex items-center space-x-4 w-full sm:w-auto">
          {syncing && (
            <div className="flex items-center bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100 animate-pulse">
              <Loader2 size={16} className="text-indigo-600 animate-spin mr-2" />
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">
                Syncing to Sheet... {syncProgress}%
              </span>
            </div>
          )}
          <button
            onClick={downloadExcel}
            disabled={filteredData.length === 0}
            className={`flex items-center justify-center px-5 py-2.5 rounded-xl text-white font-semibold transition-all shadow-lg shadow-indigo-200 group active:scale-95 w-full sm:w-auto ${filteredData.length === 0 ? 'bg-gray-400 cursor-not-allowed shadow-none' : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-xl'}`}
          >
            <Download size={18} className="mr-2 group-hover:scale-110 transition-transform" />
            Download Excel
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
          <div className="md:col-span-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 ml-1">Search Logs</label>
            <div className="relative group">
              <input
                type="text"
                placeholder="Search by Employee ID, Name or Serial Number..."
                className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-inner text-sm font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 ml-1">Device Name</label>
            <div className="relative group">
              <select
                className="w-full appearance-none pl-4 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-medium text-gray-700 cursor-pointer transition-all shadow-inner"
                value={selectedDevice.name}
                onChange={(e) => {
                  const device = DEVICES.find(d => d.name === e.target.value);
                  setSelectedDevice(device);
                }}
              >
                {DEVICES.map(d => (
                  <option key={d.name} value={d.name} className="font-medium text-gray-700">{d.name}</option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 ml-1">Start Date</label>
            <div className="relative group">
              <input
                type="date"
                className="w-full pl-4 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-medium text-gray-700 transition-all shadow-inner"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 ml-1">End Date</label>
            <div className="relative group">
              <input
                type="date"
                className="w-full pl-4 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-medium text-gray-700 transition-all shadow-inner"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

        {showStats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <StatCard title="Present Days" value={presentDaysCount} icon={CheckCircle2} colorClass="bg-green-500" onClick={() => setActiveTab(activeTab === 'Present' ? 'All' : 'Present')} active={activeTab === 'Present'} />
          <StatCard title="Absent Days" value={absentDaysCount} icon={XCircle} colorClass="bg-red-500" onClick={() => setActiveTab(activeTab === 'Absent' ? 'All' : 'Absent')} active={activeTab === 'Absent'} />
          <StatCard title="Total Duration" value={totalDurationFormatted} icon={Clock} colorClass="bg-indigo-500" onClick={() => setActiveTab('All')} active={false} />
          <StatCard title="Total Records" value={totalRecordsCount} icon={FileText} colorClass="bg-blue-500" onClick={() => setActiveTab('All')} active={false} />
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto max-h-[70vh]">
          <table className="min-w-full table-fixed">
            <colgroup>
              <col className="w-[60px]" />
              <col className="w-[100px]" />
              <col className="w-[90px]" />
              <col className="w-[100px]" />
              <col className="w-[110px]" />
              <col className="w-[160px]" />
              <col className="w-[120px]" />
              <col className="w-[90px]" />
              <col className="w-[80px]" />
              <col className="w-[80px]" />
              <col className="w-[90px]" />
              <col className="w-[250px]" />
              <col className="w-[110px]" />
              <col className="w-[90px]" />
              <col className="w-[100px]" />
              <col className="w-[90px]" />
              <col className="w-[90px]" />
              <col className="w-[120px]" />
              <col className="w-[120px]" />
              <col className="w-[120px]" />
              <col className="w-[80px]" />
            </colgroup>
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50 shadow-sm shadow-gray-200/50">
                <th className="px-4 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">S.NO.</th>
                <th className="px-4 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">DATE</th>
                <th className="px-4 py-4 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">DAY</th>
                <th className="px-4 py-4 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">WORKING DAY</th>
                <th className="px-4 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">EMPLOYEE ID</th>
                <th className="px-4 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">EMPLOYEE NAME</th>
                <th className="px-4 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">DESIGNATION</th>
                <th className="px-4 py-4 text-center text-[10px] font-bold text-indigo-600 uppercase tracking-wider border-b border-gray-200">IN TIME</th>
                <th className="px-4 py-4 text-center text-[10px] font-bold text-orange-500 uppercase tracking-wider border-b border-gray-200">LUNCH</th>
                <th className="px-4 py-4 text-center text-[10px] font-bold text-orange-600 uppercase tracking-wider border-b border-gray-200">WASTE</th>
                <th className="px-4 py-4 text-center text-[10px] font-bold text-red-600 uppercase tracking-wider border-b border-gray-200">OUT TIME</th>
                <th className="px-4 py-4 text-left text-[10px] font-bold text-blue-600 uppercase tracking-wider border-b border-gray-200">PUNCH LOGS</th>
                <th className="px-4 py-4 text-center text-[10px] font-bold text-cyan-600 uppercase tracking-wider border-b border-gray-200">PUNCH STATUS</th>
                <th className="px-4 py-4 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">STATUS</th>
                <th className="px-4 py-4 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">WORKING HOUR</th>
                <th className="px-4 py-4 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">LATE MIN</th>
                <th className="px-4 py-4 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">PUNCH MISS</th>
                <th className="px-4 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">STORE NAME</th>
                <th className="px-4 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">DEVICE ID</th>
                <th className="px-4 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">SERIAL NO</th>
                <th className="px-4 py-4 text-center text-[10px] font-bold text-indigo-600 uppercase tracking-wider border-b border-gray-200">ACTION</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="22" className="px-6 py-20 text-center">
                    <div className="flex justify-center flex-col items-center">
                      <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                      <span className="text-indigo-600 font-black tracking-widest text-xs uppercase animate-pulse">Fetching Device Logs...</span>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan="22" className="px-6 py-12 text-center">
                    <p className="text-red-500 font-bold mb-4">Error: {error}</p>
                    <button
                      onClick={fetchDeviceLogs}
                      className="px-6 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 font-bold shadow-lg shadow-red-100 transition-all"
                    >
                      Retry Connection
                    </button>
                  </td>
                </tr>
              ) : dataToRender.length > 0 ? (
                dataToRender.map((item, index) => (
                  <tr key={index} className="group hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-[10px] font-semibold text-gray-400">{index + 1}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-[10px] font-semibold text-gray-600">{item.Date}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-center text-[10px] font-semibold text-gray-500 uppercase">{item.Day}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <span className={`px-2 py-1 text-[9px] font-bold uppercase rounded-full ${item.IsWorkingDay === 'Yes' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {item.IsWorkingDay}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-[10px] font-semibold text-indigo-600">{item.EmployeeID || '-'}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                      <div className="flex items-center gap-2">
                        {item.EmployeeName || '-'}
                        <span className={`w-2 h-2 rounded-full ${item.PunchLogStatus === 'Andar' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} title={item.PunchLogStatus}></span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-[10px] font-medium text-gray-500">{item.Designation || '-'}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-center text-xs font-bold text-indigo-700">
                      {editingId === `${item.EmployeeID}_${item.Date}` ? (
                        <input
                          type="text"
                          className="w-24 px-2 py-1 border border-indigo-300 rounded focus:ring-1 focus:ring-indigo-500 outline-none text-xs"
                          value={tempInTime}
                          onChange={(e) => setTempInTime(e.target.value)}
                        />
                      ) : (
                        formatTime12h(item.InTime)
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center text-[10px] font-semibold text-orange-600">{item.StandardLunch}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-center text-[10px] font-semibold text-orange-700">{item.WasteTime}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-center text-xs font-bold text-red-600">
                      {editingId === `${item.EmployeeID}_${item.Date}` ? (
                        <input
                          type="text"
                          className="w-24 px-2 py-1 border border-red-300 rounded focus:ring-1 focus:ring-red-500 outline-none text-xs"
                          value={tempOutTime}
                          onChange={(e) => setTempOutTime(e.target.value)}
                        />
                      ) : (
                        formatTime12h(item.OutTime)
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-left text-[10px] font-semibold text-blue-600">
                      <div className="max-w-[260px] overflow-x-auto py-1 flex items-center gap-2">{item.PunchLog}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <span className={`px-2 py-1 text-[9px] font-bold uppercase rounded-full ${item.PunchLogStatus === 'Andar' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {item.PunchLogStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <span className={`px-2 py-1 text-[9px] font-bold uppercase rounded-full ${item.Status === 'PRESENT' || item.Status === 'Present' ? 'bg-green-100 text-green-700' : item.Status === 'LET' || item.Status === 'Late' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                        {item.Status}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center text-xs font-semibold text-gray-700">{item.WorkingHour}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-center text-[10px] font-semibold text-red-500">{item.LateMinute === 'MISS' ? 'MISS' : item.LateMinute > 0 ? `${item.LateMinute} min` : '-'}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <span className={`text-[9px] font-bold ${item.PunchMiss === 'Yes' ? 'text-red-600' : 'text-gray-400'}`}>
                        {item.PunchMiss === 'Yes' ? item.PunchMissMsg : 'No'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-[10px] font-semibold text-gray-600">{item.StoreName || '-'}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-[10px] font-semibold text-indigo-600">{item.DeviceID || '-'}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-[10px] font-semibold text-gray-500">{item.AssignedSerial || '-'}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      {editingId === `${item.EmployeeID}_${item.Date}` ? (
                        <div className="flex justify-center gap-1">
                          <button onClick={() => handleSaveEdit(item)} className="p-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700" title="Save"><CheckCircle size={14} /></button>
                          <button onClick={handleCancelEdit} className="p-1.5 bg-gray-500 text-white rounded-lg hover:bg-gray-600" title="Cancel"><X size={14} /></button>
                        </div>
                      ) : (
                        <button onClick={() => handleStartEdit(item)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg" title="Edit"><Pencil size={14} /></button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="22" className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-400 bg-gray-50/50 rounded-3xl p-10 border-2 border-dashed border-gray-100 mx-10">
                      <Search size={48} className="mb-4 opacity-20" />
                      <p className="font-bold uppercase tracking-wider text-sm text-gray-500">No Logs Found</p>
                      <p className="text-xs mt-2 font-medium text-gray-400">Try adjusting search or dates</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Raw Logs Table */}
      <div className="mt-12 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-gray-50 to-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Attendance Log (Raw Punches)</h2>
            <p className="text-xs font-medium text-gray-400 mt-1">Complete history of all device punches</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Searchable ID Dropdown */}
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400 group-focus-within:text-indigo-500 transition-colors">
                <Search size={14} />
              </div>
              <input
                list="rawIds"
                placeholder="Filter ID..."
                className="pl-9 pr-4 py-2 text-sm font-medium border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 w-full sm:w-36 bg-white shadow-sm transition-all"
                value={rawSearchId}
                onChange={(e) => setRawSearchId(e.target.value)}
              />
              <datalist id="rawIds">
                {uniqueIds.map(id => <option key={id} value={id} />)}
              </datalist>
            </div>

            {/* Searchable Store Dropdown */}
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400 group-focus-within:text-purple-500 transition-colors">
                <Search size={14} />
              </div>
              <input
                list="rawStores"
                placeholder="Filter Store..."
                className="pl-9 pr-4 py-2 text-sm font-medium border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 w-full sm:w-44 bg-white shadow-sm transition-all"
                value={rawSearchStore}
                onChange={(e) => setRawSearchStore(e.target.value)}
              />
              <datalist id="rawStores">
                {uniqueStores.map(store => <option key={store} value={store} />)}
              </datalist>
            </div>

            {(rawSearchId || rawSearchStore) && (
              <button
                onClick={() => { setRawSearchId(''); setRawSearchStore(''); }}
                className="px-4 py-2 text-xs font-bold text-rose-500 bg-rose-50 hover:bg-rose-100 hover:text-rose-600 rounded-xl transition-all shadow-sm"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-50/50 to-transparent h-20 pointer-events-none"></div>
          <div className="overflow-x-auto max-h-[70vh] relative z-10 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
            <table className="min-w-full divide-y divide-gray-100/80">
              <thead className="bg-white/90 backdrop-blur-md sticky top-0 z-20 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border-b border-gray-100">
                <tr>
                  <th className="px-6 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap">Date & Day</th>
                  <th className="px-6 py-5 text-left text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] whitespace-nowrap">Punch Time</th>
                  <th className="px-6 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap">Employee Details</th>
                  <th className="px-6 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap">Location/Store</th>
                  <th className="px-6 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap">Device Info</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-16 text-center">
                      <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
                      <span className="text-xs font-black uppercase tracking-widest text-indigo-600 animate-pulse">Syncing Raw Logs...</span>
                    </td>
                  </tr>
                ) : filteredRawLogs.length > 0 ? (
                  filteredRawLogs.map((log, idx) => (
                    <tr key={idx} className="group hover:bg-indigo-50/30 transition-colors duration-200">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-gray-700">{log.date}</span>
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">{log.day}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="inline-flex items-center px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-sm font-black border border-indigo-100 shadow-sm group-hover:scale-105 transition-transform">
                          <svg className="w-4 h-4 mr-1.5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                          {formatTime12h(log.time)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-slate-700">
                        <div className="flex items-center">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-gray-100 to-gray-200 flex items-center justify-center text-gray-600 font-bold mr-3 border border-gray-200 shadow-sm">
                            {log.employeeName.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-black text-gray-800">{log.employeeName}</span>
                            <span className="text-[10px] font-bold text-gray-400 mt-0.5">ID: {log.employeeId}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-gray-100 text-gray-600 border border-gray-200">
                          {log.storeName}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center text-[10px] font-bold text-emerald-600 bg-emerald-50 w-max px-2 py-0.5 rounded border border-emerald-100">
                            {log.deviceId !== '-' ? `ID: ${log.deviceId}` : 'API LOG'}
                          </div>
                          <div className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest">
                            SN: {log.serialNo}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="px-6 py-24 text-center">
                      <div className="flex flex-col items-center justify-center text-gray-400 max-w-sm mx-auto">
                        <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4 transform rotate-3 shadow-inner">
                          <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                        </div>
                        <p className="font-black uppercase tracking-[0.2em] text-sm text-gray-600 mb-1">No Raw Logs Found</p>
                        <p className="text-xs font-medium text-gray-400">Try adjusting your filters or search terms to find what you're looking for.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Attendancedaily;
