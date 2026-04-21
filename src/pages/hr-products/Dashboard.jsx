import React, { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import {
  Users,
  UserCheck,
  UserX,
  UserPlus,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  Calendar,
  Loader2
} from 'lucide-react';
import { SCRIPT_URLS, DEVICE_LOGS_BASE_URL } from '../../utils/envConfig';

const Dashboard = () => {
  const [totalEmployee, setTotalEmployee] = useState(0);
  const [activeEmployee, setActiveEmployee] = useState(0);
  const [leftEmployee, setLeftEmployee] = useState(0);
  const [leaveThisMonth, setLeaveThisMonth] = useState(0);
  const [monthlyHiringData, setMonthlyHiringData] = useState([]);
  const [designationData, setDesignationData] = useState([]);
  const [resignations, setResignations] = useState(0);
  const [terminations, setTerminations] = useState(0);

  const DEVICES = [
    { name: 'BAVDHAN', serial: 'C26238441B1E342D' },
    { name: 'HINJEWADI', serial: 'AMDB25061400335' },
    { name: 'WAGHOLI', serial: 'AMDB25061400343' },
    { name: 'AKOLE', serial: 'C262CC13CF202038' }
  ];

  const MONTHS = [
    { label: 'January', value: '01' },
    { label: 'February', value: '02' },
    { label: 'March', value: '03' },
    { label: 'April', value: '04' },
    { label: 'May', value: '05' },
    { label: 'June', value: '06' },
    { label: 'July', value: '07' },
    { label: 'August', value: '08' },
    { label: 'September', value: '09' },
    { label: 'October', value: '10' },
    { label: 'November', value: '11' },
    { label: 'December', value: '12' },
  ];

  const [selectedDevice, setSelectedDevice] = useState(DEVICES[0]);
  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString().padStart(2, '0'));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [attendanceData, setAttendanceData] = useState([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  // Mock data for other charts
  const employeeStatusData = [
    { name: 'Active', value: activeEmployee, color: '#10B981' },
    { name: 'Resigned', value: leftEmployee, color: '#EF4444' }
  ];

  const performanceData = [
    { month: 'Jan', productivity: 85, satisfaction: 78 },
    { month: 'Feb', productivity: 88, satisfaction: 82 },
    { month: 'Mar', productivity: 92, satisfaction: 85 },
    { month: 'Apr', productivity: 89, satisfaction: 88 },
    { month: 'May', productivity: 94, satisfaction: 90 },
    { month: 'Jun', productivity: 96, satisfaction: 92 }
  ];

  const parseSheetDate = (dateStr) => {
    if (!dateStr) return null;

    // Already a Date object
    if (dateStr instanceof Date) return dateStr;

    // Try ISO / normal parse
    const iso = Date.parse(dateStr);
    if (!isNaN(iso)) return new Date(iso);

    // Try dd/mm/yyyy or d/m/yyyy
    const parts = dateStr.toString().split(/[\/\-]/); // split by "/" or "-"
    if (parts.length === 3) {
      let [day, month, year] = parts.map(p => parseInt(p, 10));
      if (year < 100) year += 2000; // handle yy
      return new Date(year, month - 1, day);
    }

    return null;
  };

  const fetchJoiningCount = async () => {
    try {
      const response = await fetch(
        `${SCRIPT_URLS.HR_JOINING}?sheet=JOINING&action=fetch`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch data from JOINING sheet');
      }

      const rawData = result.data || result;
      if (!Array.isArray(rawData)) {
        throw new Error('Expected array data not received');
      }

      // Headers are row 6 → index 5
      const headers = rawData[5];
      const dataRows = rawData.length > 6 ? rawData.slice(6) : [];

      // Find index of "Status", "Date of Joining", and "Designation" columns
      const statusIndex = headers.findIndex(
        h => h && h.toString().trim().toLowerCase() === "status"
      );

      const dateOfJoiningIndex = headers.findIndex(
        h => h && h.toString().trim().toLowerCase().includes("date of joining")
      );

      const designationIndex = headers.findIndex(
        h => h && h.toString().trim().toLowerCase() === "designation"
      );

      let activeCount = 0;
      const monthlyHiring = {};
      const designationCounts = {};

      // Initialize monthly hiring data for the last 6 months
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const currentDate = new Date();
      for (let i = 5; i >= 0; i--) {
        const monthIndex = (currentDate.getMonth() - i + 12) % 12;
        const monthYear = `${months[monthIndex]} ${currentDate.getFullYear()}`;
        monthlyHiring[monthYear] = { hired: 0 };
      }

      if (statusIndex !== -1) {
        activeCount = dataRows.filter(
          row => row[statusIndex]?.toString().trim().toLowerCase() === "active"
        ).length;
      }

      // Count hires by month if date of joining column exists
      if (dateOfJoiningIndex !== -1) {
        dataRows.forEach(row => {
          const dateStr = row[dateOfJoiningIndex];
          if (dateStr) {
            const date = parseSheetDate(dateStr);
            if (date) {
              const monthYear = `${months[date.getMonth()]} ${date.getFullYear()}`;
              if (monthlyHiring[monthYear]) {
                monthlyHiring[monthYear].hired += 1;
              } else {
                monthlyHiring[monthYear] = { hired: 1 };
              }
            }
          }
        });
      }

      // Count employees by designation
      if (designationIndex !== -1) {
        dataRows.forEach(row => {
          const designation = row[designationIndex]?.toString().trim();
          if (designation) {
            if (designationCounts[designation]) {
              designationCounts[designation] += 1;
            } else {
              designationCounts[designation] = 1;
            }
          }
        });

        // Convert to array format for the chart
        const designationArray = Object.keys(designationCounts).map(key => ({
          designation: key,
          employees: designationCounts[key]
        }));

        setDesignationData(designationArray);
      }

      // Update state
      setTotalEmployee(dataRows.length);
      setActiveEmployee(activeCount);

      // Return both counts and monthly hiring data
      return {
        total: dataRows.length,
        active: activeCount,
        monthlyHiring
      };

    } catch (error) {
      console.error("Error fetching joining count:", error);
      return { total: 0, active: 0, monthlyHiring: {} };
    }
  };

  const fetchLeaveCount = async () => {
    try {
      const response = await fetch(
        `${SCRIPT_URLS.HR_JOINING}?sheet=LEAVING&action=fetch`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch data from LEAVING sheet');
      }

      const rawData = result.data || result;
      if (!Array.isArray(rawData)) {
        throw new Error('Expected array data not received');
      }

      const headers = rawData[5];       // Row 6 headers
      const dataRows = rawData.slice(6); // Row 7 onwards

      const normalize = (str) =>
        str ? str.toString().trim().toLowerCase().replace(/\s+/g, " ") : "";

      const dateIndex = headers.findIndex(
        (h) => normalize(h) === "date of leaving"
      );

      if (dateIndex === -1) {
        console.warn("⚠️ 'Date Of Leaving' column not found");
        setLeftEmployee(dataRows.length);
        setLeaveThisMonth(0);
        return { total: dataRows.length, monthlyLeaving: {} };
      }

      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const thisMonthRows = dataRows.filter(row => {
        const dateFromColD = row[3]; // Column D
        const parsedDate = parseSheetDate(dateFromColD);
        const planned = row[12]; // Column M
        const actual = row[13];  // Column N

        return (
          parsedDate &&
          parsedDate.getMonth() === currentMonth &&
          parsedDate.getFullYear() === currentYear &&
          planned && actual // Both must be not null
        );
      });

      const thisMonthCount = thisMonthRows.length;

      // Count resignations and terminations dynamically
      // Column F (index 5) is Reason of Leaving
      const resignationsCount = thisMonthRows.filter(row =>
        row[5]?.toString().toLowerCase().includes('resignation')
      ).length;

      const terminationsCount = thisMonthRows.filter(row =>
        row[5]?.toString().toLowerCase().includes('termination')
      ).length;

      setResignations(resignationsCount);
      setTerminations(terminationsCount);

      // Count leaving by month
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthlyLeaving = {};

      // Initialize monthly leaving data for the last 6 months
      for (let i = 5; i >= 0; i--) {
        const monthIndex = (now.getMonth() - i + 12) % 12;
        const monthYear = `${months[monthIndex]} ${now.getFullYear()}`;
        monthlyLeaving[monthYear] = { left: 0 };
      }

      dataRows.forEach(row => {
        const dateStr = row[dateIndex];
        if (dateStr) {
          const date = parseSheetDate(dateStr);
          if (date) {
            const monthYear = `${months[date.getMonth()]} ${date.getFullYear()}`;
            if (monthlyLeaving[monthYear]) {
              monthlyLeaving[monthYear].left += 1;
            } else {
              monthlyLeaving[monthYear] = { left: 1 };
            }
          }
        }
      });

      // Update states
      setLeftEmployee(dataRows.length);
      setLeaveThisMonth(thisMonthCount);

      return { total: dataRows.length, monthlyLeaving };

    } catch (error) {
      console.error("Error fetching leave count:", error);
      return { total: 0, monthlyLeaving: {} };
    }
  };

  const prepareMonthlyHiringData = (hiringData, leavingData) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentDate = new Date();
    const result = [];

    // Get data for the last 6 months
    for (let i = 5; i >= 0; i--) {
      const monthIndex = (currentDate.getMonth() - i + 12) % 12;
      const monthYear = `${months[monthIndex]} ${currentDate.getFullYear()}`;

      result.push({
        month: months[monthIndex],
        hired: hiringData[monthYear]?.hired || 0,
        left: leavingData[monthYear]?.left || 0
      });
    }

    return result;
  };

  const fetchAttendanceLogs = async () => {
    setAttendanceLoading(true);
    try {
      const start = new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1, 1);
      const end = new Date(parseInt(selectedYear), parseInt(selectedMonth), 0);

      const formatString = (d) => {
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        return `${yyyy}-${mm}-${dd}`;
      };

      const queryStart = formatString(start);
      const queryEnd = formatString(end);
      let totalDaysInMonth = end.getDate();

      const today = new Date();
      if (today.getMonth() === start.getMonth() && today.getFullYear() === start.getFullYear()) {
        totalDaysInMonth = today.getDate();
      }

      const API_URL = `${DEVICE_LOGS_BASE_URL}?APIKey=211616032630&SerialNumber=${selectedDevice.serial}&DeviceName=${selectedDevice.name}&FromDate=${queryStart}&ToDate=${queryEnd}`;

      const response = await fetch(API_URL);
      if (!response.ok) throw new Error('API failed');

      const result = await response.json();
      if (!Array.isArray(result)) throw new Error('Invalid API Data');

      const grouped = {};
      result.forEach(log => {
        if (!log.EmployeeCode || !log.LogDate) return;
        const dateStr = log.LogDate.split(' ')[0];
        if (!grouped[log.EmployeeCode]) {
          grouped[log.EmployeeCode] = { code: log.EmployeeCode, presentDates: new Set() };
        }
        grouped[log.EmployeeCode].presentDates.add(dateStr);
      });

      const processed = Object.values(grouped).map(emp => {
        const presentCount = emp.presentDates.size;
        return {
          employeeCode: emp.code,
          attendanceDate: `${MONTHS.find(m => m.value === selectedMonth)?.label} ${selectedYear}`,
          totalPresent: presentCount,
          totalAbsent: totalDaysInMonth - presentCount
        };
      });

      setAttendanceData(processed);
    } catch (err) {
      console.error('Error fetching dashboard attendance:', err);
      setAttendanceData([]);
    } finally {
      setAttendanceLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendanceLogs();
  }, [selectedDevice, selectedMonth, selectedYear]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [joiningResult, leavingResult] = await Promise.all([
          fetchJoiningCount(),
          fetchLeaveCount()
        ]);

        // Prepare the monthly hiring data for the chart
        const monthlyData = prepareMonthlyHiringData(
          joiningResult.monthlyHiring,
          leavingResult.monthlyLeaving
        );

        setMonthlyHiringData(monthlyData);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="space-y-6 page-content p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">HR Dashboard</h1>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-lg border p-6 flex items-start">
          <div className="p-3 rounded-full bg-blue-100 mr-4">
            <Users size={24} className="text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-gray-600 font-medium">Total Employees</p>
            <h3 className="text-2xl font-bold text-gray-800">{totalEmployee}</h3>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border p-6 flex items-start">
          <div className="p-3 rounded-full bg-green-100 mr-4">
            <UserCheck size={24} className="text-green-600" />
          </div>
          <div>
            <p className="text-sm text-gray-600 font-medium">Active Employees</p>
            <h3 className="text-2xl font-bold text-gray-800">{activeEmployee}</h3>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border p-6 flex items-start">
          <div className="p-3 rounded-full bg-amber-100 mr-4">
            <Clock size={24} className="text-amber-600" />
          </div>
          <div>
            <p className="text-sm text-gray-600 font-medium">On Resigned</p>
            <h3 className="text-2xl font-bold text-gray-800">{leftEmployee}</h3>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border p-6 flex items-start">
          <div className="p-3 rounded-full bg-red-100 mr-4">
            <UserX size={24} className="text-red-600" />
          </div>
          <div>
            <p className="text-sm text-gray-600 font-medium">Left This Month</p>
            <h3 className="text-2xl font-bold text-gray-800">{leaveThisMonth}</h3>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-lg border p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center">
            <Users size={20} className="mr-2" />
            Employee Status Distribution
          </h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={employeeStatusData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {employeeStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ color: '#374151' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center">
            <TrendingUp size={20} className="mr-2" />
            Monthly Hiring vs Attrition
          </h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyHiringData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
                <XAxis dataKey="month" stroke="#374151" />
                <YAxis stroke="#374151" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    color: '#374151'
                  }}
                />
                <Legend wrapperStyle={{ color: '#374151' }} />
                <Bar dataKey="hired" name="Hired" fill="#10B981" />
                <Bar dataKey="left" name="Left" fill="#EF4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>


      </div>
      <div className="bg-white rounded-xl shadow-lg border p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center">
          <UserPlus size={20} className="mr-2" />
          Designation-wise Employee Count
        </h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={designationData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
              <XAxis dataKey="designation" stroke="#374151" />
              <YAxis stroke="#374151" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  color: '#374151'
                }}
              />
              <Bar dataKey="employees" name="Employees">
                {designationData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={index % 3 === 0 ? '#EF4444' : index % 3 === 1 ? '#10B981' : '#3B82F6'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Monthly Attendance Table */}
      <div className="bg-white rounded-xl shadow-lg border p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
          <h2 className="text-lg font-bold text-gray-800 flex items-center">
            <Calendar size={20} className="mr-2 text-indigo-500" />
            Monthly Device Attendance
          </h2>
          <div className="flex space-x-4">
            <select
              className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-gray-700"
              value={selectedDevice.name}
              onChange={(e) => setSelectedDevice(DEVICES.find(d => d.name === e.target.value))}
            >
              {DEVICES.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
            </select>
            <select
              className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-gray-700"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[400px]">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap">Employee Code</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap">Attendance Date</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap">Present</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap">Absent</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {attendanceLoading ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center">
                    <Loader2 size={32} className="mx-auto animate-spin text-indigo-500 mb-2" />
                    <p className="text-sm font-medium text-gray-500">Loading Attendance...</p>
                  </td>
                </tr>
              ) : attendanceData.length > 0 ? (
                attendanceData.sort((a, b) => b.totalPresent - a.totalPresent).map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 border-l-2 border-transparent hover:border-indigo-500">
                      {item.employeeCode}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-indigo-700 bg-indigo-50/30">
                      {item.attendanceDate}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">
                      {item.totalPresent} <span className="text-xs text-gray-400 font-medium">Days</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-red-500">
                      {item.totalAbsent > 0 ? `${item.totalAbsent} Days` : '-'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="px-6 py-16 text-center">
                    <p className="font-bold text-gray-400">No Attendance Records Found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default Dashboard;
