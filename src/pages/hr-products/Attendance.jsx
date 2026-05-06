import React, { useEffect, useState } from 'react';
import { Search, Download, Filter, ChevronDown, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import { SCRIPT_URLS, DEVICE_LOGS_BASE_URL } from '../../utils/envConfig';

const DEVICES = [
  { name: 'ALL DEVICES', serial: 'ALL', apiName: 'ALL' },
  { name: 'BAWDHAN', apiName: 'BAVDHAN', serial: 'C26238441B1E342D' },
  { name: 'HINJEWADI', apiName: 'HINJEWADI', serial: 'AMDB25061400335' },
  { name: 'WAGHOLI', apiName: 'WAGHOLI', serial: 'AMDB25061400343' },
  { name: 'AKOLE', apiName: 'AKOLE', serial: 'C262CC13CF202038' },
  { name: 'MUMBAI', apiName: 'MUMBAI', serial: 'C2630450C32A2327' }
];

const JOINING_API_URL = `${SCRIPT_URLS.HR_JOINING}?sheet=JOINING&action=fetch`;
const LEAVE_API_URL = `${SCRIPT_URLS.HR_JOINING}?sheet=Leave Management&action=fetch`;

const Attendance = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedDevice, setSelectedDevice] = useState(DEVICES[0]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [joiningData, setJoiningData] = useState([]);
  const [deviceMapping, setDeviceMapping] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const getDaysInMonth = (month, year) => {
    return new Date(year, month, 0).getDate();
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

  const timeToSeconds = (timeStr) => {
    if (!timeStr || timeStr === '-' || timeStr === '0.0' || timeStr === '0') return 0;
    try {
      const timeMatch = timeStr.toString().match(/(\d+):(\d+):(\d+)/);
      if (timeMatch) {
        return parseInt(timeMatch[1], 10) * 3600 + parseInt(timeMatch[2], 10) * 60 + parseInt(timeMatch[3], 10);
      }
      if (timeStr.toString().includes('T')) {
        const d = new Date(timeStr);
        if (!isNaN(d.getTime())) {
          return d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
        }
      }
    } catch (e) {
      return 0;
    }
    return 0;
  };

  const secondsToTime = (totalSeconds) => {
    if (!totalSeconds || totalSeconds === 0) return '-';
    const absSeconds = Math.abs(totalSeconds);
    const hours = Math.floor(absSeconds / 3600);
    const minutes = Math.floor((absSeconds % 3600) / 60);
    const seconds = absSeconds % 60;
    const sign = totalSeconds < 0 ? '-' : '';
    return `${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const calculateDays = (startDateStr, endDateStr) => {
    if (!startDateStr || !endDateStr) return 0;
    let startDate, endDate;
    try {
      if (startDateStr.toString().includes('/')) {
        const [startDay, startMonth, startYear] = startDateStr.toString().split('/').map(Number);
        startDate = new Date(startYear, startMonth - 1, startDay);
      } else {
        startDate = new Date(startDateStr);
      }

      if (endDateStr.toString().includes('/')) {
        const [endDay, endMonth, endYear] = endDateStr.toString().split('/').map(Number);
        endDate = new Date(endYear, endMonth - 1, endDay);
      } else {
        endDate = new Date(endDateStr);
      }
      const diffTime = endDate.getTime() - startDate.getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    } catch (e) {
      return 0;
    }
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

  const getSundaysCount = (month, year) => {
    let count = 0;
    const days = new Date(year, month, 0).getDate();
    for (let i = 1; i <= days; i++) {
      if (new Date(year, month - 1, i).getDay() === 0) count++;
    }
    return count;
  };

  const fetchAttendanceData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Load Local Holidays
      const localHolidaysRaw = localStorage.getItem('local_holiday_list');
      const localHolidays = localHolidaysRaw ? JSON.parse(localHolidaysRaw) : [];
      
      const isHoliday = (dateStr) => {
        if (!dateStr) return false;
        const compareStr = dateStr.includes(' ') ? dateStr.split(' ')[0] : dateStr;
        return localHolidays.some(h => h.date === compareStr);
      };

      // Count holidays in selected month
      let holidaysInMonth = 0;
      const daysInMonthTotal = getDaysInMonth(selectedMonth, selectedYear);
      for (let i = 1; i <= daysInMonthTotal; i++) {
        const d = new Date(selectedYear, selectedMonth - 1, i);
        const dateKey = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        if (localHolidays.some(h => h.date === dateKey)) {
           holidaysInMonth++;
        }
      }
      // 1. Fetch Metadata (Joining & Master Mapping)
      let currentJoining = joiningData;
      if (joiningData.length === 0) {
        try {
          const jRes = await fetch(JOINING_API_URL);
          if (!jRes.ok) throw new Error(`Joining API returned ${jRes.status}`);
          const contentType = jRes.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) {
            throw new Error('Joining API returned non-JSON response');
          }
          const jData = await jRes.json();
          if (jData.success) {
            const raw = jData.data || jData;
            const headers = raw[5];
            const dataRows = raw.slice(6);
            const getIdx = (n) => headers.findIndex(h => h && h.toString().trim().toLowerCase() === n.toLowerCase());

            const desIdx = getIdx('Designation');
            const storeIdx = getIdx('Joining Place');

            currentJoining = dataRows.map(r => ({
              id: r[getIdx('Employee ID')]?.toString().trim(),
              name: r[getIdx('Name As Per Aadhar')]?.toString().trim(),
              designation: r[getIdx('Designation')]?.toString().trim() || r[desIdx]?.toString().trim(),
              store: r[getIdx('Joining Place')]?.toString().trim() || r[storeIdx]?.toString().trim()
            })).filter(h => h.id);
            setJoiningData(currentJoining);
          }
        } catch (e) {
          console.warn('Joining fetch failed:', e);
        }
      }
      //some changes
      let currentMapping = deviceMapping;
      try {
        const MASTER_MAP_URL = `${SCRIPT_URLS.HR_JOINING}?sheet=MASTER&action=fetch`;
        const dmRes = await fetch(MASTER_MAP_URL);
        if (dmRes.ok) {
          const contentType = dmRes.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const dmData = await dmRes.json();
            if (dmData.success) {
              const rows = dmData.data.slice(1);
              currentMapping = rows.map(r => ({
                userId: r[5]?.toString().trim(),
                name: r[6]?.toString().trim(),
                deviceId: r[7]?.toString().trim(),
                serialNo: r[8]?.toString().trim(),
                storeName: r[9]?.toString().trim()
              }));
              setDeviceMapping(currentMapping);
            }
          }
        }
      } catch (e) {
        console.warn('Master Map fetch failed:', e);
      }

      const startDay = '01';
      const endDay = getDaysInMonth(selectedMonth, selectedYear);
      const paddedMonth = selectedMonth.toString().padStart(2, '0');
      let fromDate = `${selectedYear}-${paddedMonth}-${startDay}`;
      let toDate = `${selectedYear}-${paddedMonth}-${endDay}`;

      // Cap toDate to today if the selected month/year is current or in the future
      const today = new Date();
      const selectedDate = new Date(selectedYear, selectedMonth - 1, 1);
      const currentDate = new Date(today.getFullYear(), today.getMonth(), 1);

      if (selectedDate >= currentDate) {
        const todayDay = String(today.getDate()).padStart(2, '0');
        const todayMonth = String(today.getMonth() + 1).padStart(2, '0');
        const todayYear = today.getFullYear();
        // If it's a future month, we shouldn't even query, but capping it to today is safer
        if (selectedDate > currentDate) {
           toDate = `${todayYear}-${todayMonth}-${todayDay}`;
           fromDate = `${todayYear}-${todayMonth}-01`; // Also move fromDate to current month
        } else {
           toDate = `${selectedYear}-${paddedMonth}-${todayDay}`;
        }
      }

      if (selectedYear < 2026 || (selectedYear === 2026 && selectedMonth < 4)) {
        setAttendanceData([]);
        return;
      }

      let rawLogs = [];
      if (selectedDevice.name === 'ALL DEVICES') {
        const otherDevices = DEVICES.filter(d => d.name !== 'ALL DEVICES');
        const allResponses = await Promise.all(
          otherDevices.map(async (device) => {
            try {
              const url = `${DEVICE_LOGS_BASE_URL}?APIKey=211616032630&SerialNumber=${device.serial}&DeviceName=${device.apiName}&FromDate=${fromDate}&ToDate=${toDate}`;
              const res = await fetch(url);
              if (!res.ok) return [];
              const contentType = res.headers.get('content-type');
              if (!contentType || !contentType.includes('application/json')) return [];
              const logs = await res.json();
              return Array.isArray(logs) ? logs.map(l => ({ ...l, _DeviceName: device.name })) : [];
            } catch (e) {
              console.error(`Error fetching for ${device.name}:`, e);
              return [];
            }
          })
        );
        rawLogs = allResponses.flat();
        if (rawLogs.length === 0) {
          setAttendanceData([]);
          return;
        }
      } else {
        const API_URL = `${DEVICE_LOGS_BASE_URL}?APIKey=211616032630&SerialNumber=${selectedDevice.serial}&DeviceName=${selectedDevice.apiName}&FromDate=${fromDate}&ToDate=${toDate}`;
        const response = await fetch(API_URL);
        if (!response.ok) {
          setAttendanceData([]);
          return;
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          setAttendanceData([]);
          return;
        }

        const data = await response.json();
        if (!Array.isArray(data)) {
          setAttendanceData([]);
          return;
        }
        rawLogs = data.map(l => ({ ...l, _DeviceName: selectedDevice.name }));
      }

      const logs = rawLogs.filter(log => {
        if (!log.LogDate) return false;
        const logDateStr = log.LogDate.split(' ')[0];
        return logDateStr >= '2026-04-01';
      });

      const dailyGrouped = {};
      logs.sort((a, b) => new Date(a.LogDate) - new Date(b.LogDate));

      logs.forEach(log => {
        if (!log.EmployeeCode || !log.LogDate) return;
        const dateKey = log.LogDate.split(' ')[0];
        const key = `${log.EmployeeCode}_${dateKey}`;
        if (!dailyGrouped[key]) dailyGrouped[key] = { id: log.EmployeeCode, date: dateKey, logs: [], DeviceName: log._DeviceName, SerialNumber: log.SerialNumber };
        dailyGrouped[key].logs.push(log.LogDate);
      });

      const monthlyAgg = {};
      const totalSundays = getSundaysCount(selectedMonth, selectedYear);
      const totalDaysInMonth = getDaysInMonth(selectedMonth, selectedYear);

      Object.values(dailyGrouped).forEach(day => {
        const id = day.id.toString().trim();
        if (!monthlyAgg[id]) {
          monthlyAgg[id] = {
            id,
            presentDays: 0,
            lateDays: 0,
            punchMissDays: 0,
            totalWorkSecs: 0,
            totalLunchSecs: 0,
            holidayDays: 0,
            userId: id,
            actualSerial: day.SerialNumber || '-',
            actualDeviceName: day.DeviceName || selectedDevice.name
          };
        }

        const agg = monthlyAgg[id];
        // Only count as machine present if it's NOT a holiday (holidays are added later)
        if (!isHoliday(day.date)) {
          agg.presentDays += 1;
        }

        const inTime = day.logs[0];
        const outTime = day.logs[day.logs.length - 1];

        if (calculateLateMinutes(inTime) > 0) agg.lateDays += 1;
        if (day.logs.length === 1) agg.punchMissDays += 1;
        else {
          const start = new Date(inTime.replace(/-/g, '/'));
          const end = new Date(outTime.replace(/-/g, '/'));
          agg.totalWorkSecs += (end - start) / 1000;
          if (day.logs.length >= 4) {
            const lStart = new Date(day.logs[1].replace(/-/g, '/'));
            const lEnd = new Date(day.logs[2].replace(/-/g, '/'));
            agg.totalLunchSecs += (lEnd - lStart) / 1000;
          }
        }
      });

      const finalData = Object.values(monthlyAgg).map((agg, idx) => {
        const code = agg.id.toString().trim();
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
        const displayStore = dMap ? dMap.storeName : (empMeta ? empMeta.store : agg.actualDeviceName);
        const displayDeviceId = dMap ? dMap.deviceId : '-';
        const displayAssignedSerial = dMap ? dMap.serialNo : agg.actualSerial;

        const absentDays = Math.max(0, totalDaysInMonth - agg.presentDays);

        return {
          sNo: idx + 1,
          year: selectedYear,
          month: monthNames[selectedMonth - 1],
          employeeCode: displayCode,
          employeeName: displayName,
          designation: empMeta ? empMeta.designation : '-',
          storeName: displayStore,
          deviceId: displayDeviceId,
          serialNo: displayAssignedSerial,
          presentDays: agg.presentDays + holidaysInMonth,
          absentDays: Math.max(0, totalDaysInMonth - (agg.presentDays + holidaysInMonth)),
          punchMiss: agg.punchMissDays,
          lateDays: agg.lateDays,
          totalWorkHours: formatSecsToHrsMins(agg.totalWorkSecs),
          totalLunchTime: formatSecsToHrsMins(agg.totalLunchSecs),
          holidays: holidaysInMonth
        };
      });

      setAttendanceData(finalData);
    } catch (err) {
      console.error(err);
      setError(err.message);
      setAttendanceData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendanceData();
  }, [selectedMonth, selectedYear, selectedDevice]);

  const months = [...new Set(attendanceData.map(r => r.month))].filter(Boolean);
  const years = [...new Set(attendanceData.map(r => r.year))].filter(Boolean);

  const filteredData = attendanceData.filter(item => {
    const matchesSearch =
      item.employeeName.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.employeeCode.toString().toLowerCase().includes(searchTerm.toLowerCase());

    // Since data is already fetched for the specific month/year/device, 
    // these filters are primarily for the search bar, but we'll fix the logic anyway.
    const matchesMonth = selectedMonth ? item.month === monthNames[selectedMonth - 1] : true;
    const matchesYear = selectedYear ? item.year.toString() === selectedYear.toString() : true;

    return matchesSearch && matchesMonth && matchesYear;
  });

  const downloadExcel = () => {
    const dataToExport = filteredData.map(item => ({
      'S.No.': item.sNo,
      'Month/Year': `${item.month} ${item.year}`,
      'Employee Code': item.employeeCode,
      'Employee Name': item.employeeName,
      'Designation': item.designation,
      'Store Name': item.storeName,
      'Device ID': item.deviceId,
      'Serial NO': item.serialNo,
      'Present': item.presentDays,
      'Absent': item.absentDays,
      'Punch Miss': item.punchMiss,
      'Holidays': item.holidays,
      'Late Days': item.lateDays,
      'Total Working Hour': item.totalWorkHours,
      'Total Lunch Time': item.totalLunchTime
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Monthly Attendance");
    XLSX.writeFile(workbook, `attendance_${selectedMonth}_${selectedYear}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-[#f5f6fa] p-4 lg:p-8 space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">
            Attendance Records Monthly
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Analyze employee attendance and performance metrics
          </p>
        </div>
        <button
          onClick={downloadExcel}
          disabled={filteredData.length === 0}
          className={`flex items-center justify-center px-6 py-3 rounded-xl text-white font-bold transition-all shadow-lg active:scale-95 ${filteredData.length === 0
            ? 'bg-slate-300 cursor-not-allowed shadow-none'
            : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-200 shadow-indigo-100'
            }`}
        >
          <Download size={20} className="mr-2" />
          Download Excel
        </button>
      </div>

      {/* Main Container Card */}
      <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-100 overflow-hidden">

        {/* Filter Section */}
        <div className="p-6 lg:p-8 border-b border-slate-50 bg-slate-50/40">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
            <div className="lg:col-span-1">
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Search Employee</label>
              <div className="relative group">
                <input
                  type="text"
                  placeholder="Name or Employee ID..."
                  className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 text-sm font-medium transition-all group-hover:border-slate-300"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Search size={18} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Select Device</label>
              <div className="relative group">
                <select
                  value={selectedDevice.name}
                  onChange={(e) => setSelectedDevice(DEVICES.find(d => d.name === e.target.value))}
                  className="w-full appearance-none pl-4 pr-10 py-3 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 text-sm font-bold text-slate-700 cursor-pointer transition-all group-hover:border-slate-300"
                >
                  {DEVICES.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <Filter size={16} />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Select Month</label>
              <div className="relative group">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="w-full appearance-none pl-4 pr-10 py-3 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 text-sm font-bold text-slate-700 cursor-pointer transition-all group-hover:border-slate-300"
                >
                  {monthNames.map((m, idx) => <option key={m} value={idx + 1}>{m}</option>)}
                </select>
                <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Select Year</label>
              <div className="relative group">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="w-full appearance-none pl-4 pr-10 py-3 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 text-sm font-bold text-slate-700 cursor-pointer transition-all group-hover:border-slate-300"
                >
                  {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Table Section */}
        <div className="overflow-x-auto overflow-y-auto max-h-[65vh] scrollbar-hide">
          <table className="min-w-full table-fixed border-separate border-spacing-0" style={{ minWidth: '1500px' }}>
            <colgroup>
              <col style={{ width: '60px' }} />
              <col style={{ width: '120px' }} />
              <col style={{ width: '120px' }} />
              <col style={{ width: '200px' }} />
              <col style={{ width: '150px' }} />
              <col style={{ width: '120px' }} />
              <col style={{ width: '100px' }} />
              <col style={{ width: '160px' }} />
              <col style={{ width: '90px' }} />
              <col style={{ width: '90px' }} />
              <col style={{ width: '100px' }} />
              <col style={{ width: '90px' }} />
              <col style={{ width: '90px' }} />
              <col style={{ width: '110px' }} />
              <col style={{ width: '110px' }} />
            </colgroup>
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-50 shadow-sm shadow-slate-200/50">
                <th className="px-4 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">S.No.</th>
                <th className="px-4 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Month/Yr</th>
                <th className="px-4 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Employee Code</th>
                <th className="px-4 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Employee Name</th>
                <th className="px-4 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Designation</th>
                <th className="px-4 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Store Name</th>
                <th className="px-4 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Device ID</th>
                <th className="px-4 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Serial NO</th>
                <th className="px-4 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Present</th>
                <th className="px-4 py-4 text-center text-[10px] font-black text-rose-500 uppercase tracking-widest border-b border-slate-100">Absent</th>
                <th className="px-4 py-4 text-center text-[10px] font-black text-red-500 uppercase tracking-widest border-b border-slate-100">Punch Miss</th>
                <th className="px-4 py-4 text-center text-[10px] font-black text-indigo-500 uppercase tracking-widest border-b border-slate-100">Holidays</th>
                <th className="px-4 py-4 text-center text-[10px] font-black text-orange-500 uppercase tracking-widest border-b border-slate-100">Late Days</th>
                <th className="px-4 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Duration</th>
                <th className="px-4 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Lunch</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan="15" className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center">
                      <div className="relative">
                        <div className="w-12 h-12 border-4 border-indigo-100 rounded-full"></div>
                        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin absolute inset-0"></div>
                      </div>
                      <span className="mt-4 text-slate-500 font-bold text-sm tracking-wide">Fetching Records...</span>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan="15" className="px-6 py-20 text-center">
                    <div className="inline-flex flex-col items-center p-8 bg-rose-50 rounded-3xl border border-rose-100">
                      <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mb-4">
                        <X size={24} />
                      </div>
                      <p className="text-rose-600 font-bold mb-4">Connection Error: {error}</p>
                      <button
                        onClick={fetchAttendanceData}
                        className="px-6 py-2 bg-rose-600 text-white rounded-xl hover:bg-rose-700 font-bold shadow-lg shadow-rose-200 transition-all active:scale-95 text-sm"
                      >
                        Retry Connection
                      </button>
                    </div>
                  </td>
                </tr>
              ) : filteredData.length > 0 ? (
                filteredData.map((item, index) => (
                  <tr key={index} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-4 py-4 whitespace-nowrap text-[10px] font-bold text-slate-400">{item.sNo}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-center text-[10px] font-bold text-slate-500">{item.month} {item.year}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-[10px] font-bold text-indigo-500/70">{item.employeeCode}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-[11px] font-black text-slate-800">{item.employeeName}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-[11px] font-bold text-blue-500">{item.designation}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-center text-[11px] font-black text-slate-800">{item.storeName}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-center text-[11px] font-bold text-blue-600">{item.deviceId}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-center text-[11px] font-medium text-slate-500">{item.serialNo}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      <span className="px-2 py-1 bg-green-50 text-green-600 rounded text-[10px] font-black">
                        {item.presentDays}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      <span className="px-2 py-1 bg-rose-50 text-rose-600 rounded text-[10px] font-black">
                        {item.absentDays}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      <span className="text-red-500 text-[11px] font-bold border-b border-dotted border-red-500 leading-none pb-0.5">{item.punchMiss}</span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center text-[11px] font-bold text-indigo-600">{item.holidays}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-center text-[11px] font-bold text-orange-500">
                      {item.lateDays}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center text-[11px] font-black text-slate-800">{item.totalWorkHours}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-center text-[11px] font-bold text-blue-600">{item.totalLunchTime}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="15" className="px-6 py-32 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                        <Search size={32} className="text-slate-200" />
                      </div>
                      <p className="font-extrabold text-xl text-slate-800">No Records Found</p>
                      <p className="text-sm mt-1 font-medium text-slate-400">Try adjusting your filters or search term</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info inside card if needed */}
        <div className="p-4 bg-slate-50/30 border-t border-slate-50 text-[10px] font-bold text-slate-400 text-center tracking-widest uppercase">
          Showing {filteredData.length} records for {selectedDevice.name} - {monthNames[selectedMonth - 1]} {selectedYear}
        </div>
      </div>
    </div>
  );
};

export default Attendance;
