import { toast } from 'react-hot-toast';
import React, { useEffect, useState } from 'react';
import {
  DollarSign, Download, Eye, Calendar, TrendingUp,
  ArrowUpRight, ArrowDownRight, CreditCard, Receipt,
  X, Printer, CheckCircle2, AlertCircle, Info, PlusCircle, RefreshCcw
} from 'lucide-react';
import { SCRIPT_URLS } from '../../utils/envConfig';

const PayslipModal = ({ isOpen, onClose, record }) => {
  if (!isOpen || !record) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 print:shadow-none print:rounded-none">
        {/* Modal Header */}
        <div className="px-8 py-6 bg-indigo-600 text-white flex items-center justify-between print:bg-white print:text-black print:border-b print:px-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg print:hidden">
              <Receipt size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Salary Payslip</h2>
              <p className="text-indigo-100 text-sm print:text-gray-500">{record.month} {record.year}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <button
              onClick={handlePrint}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
              title="Print Payslip"
            >
              <Printer size={20} />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-8 space-y-8 print:p-4">
          {/* Employee Info Header */}
          <div className="flex justify-between items-start border-b border-gray-100 pb-6 print:border-gray-300">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Employee Details</p>
              <h3 className="text-lg font-bold text-gray-900">{record.employeeName}</h3>
              <p className="text-gray-600 font-medium">{record.employeeId}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Payment Status</p>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${record.status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                }`}>
                {record.status === 'Paid' ? <CheckCircle2 size={12} className="mr-1" /> : <AlertCircle size={12} className="mr-1" />}
                {record.status}
              </span>
              <p className="text-gray-500 text-xs mt-2">Paid on: {record.payDate}</p>
            </div>
          </div>

          {/* Earnings & Deductions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h4 className="font-bold text-gray-800 flex items-center gap-2 border-b border-gray-100 pb-2">
                <ArrowUpRight size={16} className="text-green-500" />
                Earnings
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Basic Salary</span>
                  <span className="font-semibold text-gray-900">₹{record.basicSalary.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Allowances</span>
                  <span className="font-semibold text-gray-900">₹{record.allowances.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Overtime</span>
                  <span className="font-semibold text-gray-900">₹{record.overtime.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-bold text-gray-800 flex items-center gap-2 border-b border-gray-100 pb-2">
                <ArrowDownRight size={16} className="text-red-500" />
                Deductions
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Advance Deduction</span>
                  <span className="font-semibold text-gray-900">₹{record.advanceDeduction?.toLocaleString() || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Other Deductions</span>
                  <span className="font-semibold text-gray-900">₹0</span>
                </div>
              </div>
            </div>
          </div>

          {/* Net Pay Summary */}
          <div className="bg-gray-50 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-center gap-4 border border-gray-100 print:bg-white print:border-gray-300">
            <div>
              <p className="text-gray-600 text-sm font-medium">Net Payable Amount</p>
              <p className="text-xs text-gray-400 italic mt-1">Total Earnings - Total Deductions</p>
            </div>
            <div className="text-center md:text-right">
              <p className="text-3xl font-black text-indigo-600">₹{record.netSalary.toLocaleString()}</p>
            </div>
          </div>

          <div className="text-[10px] text-gray-400 text-center italic mt-6 print:block">
            This is a computer-generated document and does not require a physical signature.
          </div>
        </div>
      </div>
    </div>
  );
};

const DEVICES = [
  { name: 'BAWDHAN', apiName: 'BAVDHAN', serial: 'C26238441B1E342D' },
  { name: 'HINJEWADI', apiName: 'HINJEWADI', serial: 'AMDB25061400335' },
  { name: 'WAGHOLI', apiName: 'WAGHOLI', serial: 'AMDB25061400343' },
  { name: 'AKOLE', apiName: 'AKOLE', serial: 'C262CC13CF202038' },
  { name: 'MUMBAI', apiName: 'MUMBAI', serial: 'C2630450C32A2327' }
];

const MySalary = () => {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const toNumber = (value) => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const cleaned = value.replace(/[^\d.]/g, '');
      return parseFloat(cleaned) || 0;
    }
    return 0;
  };

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(months[new Date().getMonth()]);
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [salaryData, setSalaryData] = useState([]);
  const [error, setError] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDemo, setIsDemo] = useState(false);

  const filteredSalary = salaryData.filter(record =>
    record.year.toString() === selectedYear.toString() &&
    record.month.toLowerCase() === selectedMonth.toLowerCase()
  );

  const fetchSalaryData = async () => {
    setLoading(true);
    setTableLoading(true);
    setError(null);

    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      let employeeId = localStorage.getItem("employeeId") || user?.joiningNo || user?.EmployeeID || user?.employeeId || user?.empId || '';
      const employeeName = user?.Name || user?.name || user?.candidateName || '';

      if (!employeeName && !employeeId) {
        throw new Error("User session not found. Please login again.");
      }

      const PAYROLL_SCRIPT_URL = SCRIPT_URLS.HR_PAYROLL;
      const JOINING_SCRIPT_URL = SCRIPT_URLS.HR_JOINING;
      const SPREADSHEET_ID = '1lg8cvRaYHpnR75bWxHoh-a30-gGL94-_WAnE7Zue6r8';

      // Normalize ID helper (strips prefixes like "JN-", leading zeros)
      const normalizeId = (id) => {
        if (!id) return '';
        return id.toString().replace(/[^0-9]/g, '').replace(/^0+/, '');
      };
      const nEmpId = normalizeId(employeeId);

      // ── 1. Fetch PAYROLL sheet records ─────────────────────────────────
      const pRes = await fetch(`${PAYROLL_SCRIPT_URL}?sheet=PAYROLL&action=fetch&spreadsheetId=${SPREADSHEET_ID}`);
      const pData = await pRes.json();
      let spreadsheetRows = [];
      let spreadsheetHeaders = [];
      if (pData.success && pData.data && pData.data.length > 2) {
        spreadsheetHeaders = pData.data[2]; // Row 3 = headers
        spreadsheetRows = pData.data.slice(3); // Row 4+ = data
      }

      // ── 2. Fetch Payroll "master" sheet (Payroll V.01) for Designation, DOJ, Monthly Salary ──
      // Sheet columns: A=EMP ID, B=Name of the Employee, C=Designation, D=Location, E=DOJ, F=Monthly Salary
      const pmRes = await fetch(`${PAYROLL_SCRIPT_URL}?sheet=master&action=fetch&spreadsheetId=${SPREADSHEET_ID}`);
      const pmData = await pmRes.json();
      let payrollMasterEntry = null;
      if (pmData.success && pmData.data && pmData.data.length > 0) {
        const pmHeaders = pmData.data[0];
        const pmRows = pmData.data.slice(1);
        const getPmIdx = (...aliases) => {
          for (const alias of aliases) {
            const idx = pmHeaders.findIndex(h => h && h.toString().trim().toLowerCase() === alias.toLowerCase());
            if (idx !== -1) return idx;
          }
          return -1;
        };
        const pmEmpIdIdx = getPmIdx('EMP ID', 'Employee ID', 'Emp Id');
        const pmNameIdx  = getPmIdx('Name of the Employee', 'Name', 'Employee Name');
        const pmDesigIdx = getPmIdx('Designation');
        const pmLocIdx   = getPmIdx('Location');
        const pmDojIdx   = getPmIdx('DOJ', 'Date of Joining');
        const pmSalIdx   = getPmIdx('Monthly Salary', 'Salary');

        const eNameSafe = employeeName.trim().toLowerCase();
        payrollMasterEntry = pmRows.find(r => {
          const rowId = pmEmpIdIdx !== -1 ? r[pmEmpIdIdx]?.toString().trim() : '';
          const rowName = pmNameIdx !== -1 ? r[pmNameIdx]?.toString().trim().toLowerCase() : '';
          const idMatch = employeeId && rowId && normalizeId(rowId) === nEmpId;
          const nameMatch = eNameSafe && rowName && (rowName === eNameSafe || rowName.includes(eNameSafe) || eNameSafe.includes(rowName));
          return idMatch || nameMatch;
        });

        if (payrollMasterEntry) {
          payrollMasterEntry = {
            id:          pmEmpIdIdx !== -1 ? payrollMasterEntry[pmEmpIdIdx]?.toString().trim() : '',
            name:        pmNameIdx  !== -1 ? payrollMasterEntry[pmNameIdx]?.toString().trim()  : '',
            designation: pmDesigIdx !== -1 ? payrollMasterEntry[pmDesigIdx]?.toString().trim() : '',
            location:    pmLocIdx   !== -1 ? payrollMasterEntry[pmLocIdx]?.toString().trim()   : '',
            doj:         pmDojIdx   !== -1 ? payrollMasterEntry[pmDojIdx]?.toString().trim()   : '',
            salary:      pmSalIdx   !== -1 ? payrollMasterEntry[pmSalIdx]?.toString().trim()   : '',
          };
        }
      }

      // ── 3. Fetch HR MASTER mapping sheet for store/location ──────
      const mRes = await fetch(`${SCRIPT_URLS.HR_JOINING}?sheet=MASTER&action=fetch`);
      const mData = await mRes.json();
      let hrmEntry = null;
      if (mData.success && mData.data) {
        const rows = mData.data.slice(1);
        const eNameSafe = employeeName.trim().toLowerCase();
        hrmEntry = rows.find(r => {
          const rowId = r[5]?.toString().trim();
          const rowName = r[6]?.toString().trim().toLowerCase();
          const idMatch = employeeId && rowId && normalizeId(rowId) === nEmpId;
          const nameMatch = eNameSafe && rowName && (rowName === eNameSafe || rowName.includes(eNameSafe));
          return idMatch || nameMatch;
        });
      }

      // ── 3b. Fetch JOINING sheet as final fallback for metadata ──────
      let joiningEntry = null;
      if (!payrollMasterEntry) {
        try {
          const jRes = await fetch(`${SCRIPT_URLS.HR_JOINING}?sheet=JOINING&action=fetch`);
          const jData = await jRes.json();
          if (jData.success && jData.data && jData.data.length > 6) {
            const jHeaders = jData.data[5];
            const jRows = jData.data.slice(6);
            const getJIdx = (...aliases) => {
              for (const alias of aliases) {
                const idx = jHeaders.findIndex(h => h && h.toString().trim().toLowerCase() === alias.toLowerCase());
                if (idx !== -1) return idx;
              }
              return -1;
            };
            const jIdIdx = getJIdx('Employee ID', 'Joining No');
            const jNameIdx = getJIdx('Name As Per Aadhar', 'Candidate Name');
            const eNameSafe = employeeName.trim().toLowerCase();

            const matched = jRows.find(r => {
              const rowId = jIdIdx !== -1 ? r[jIdIdx]?.toString().trim() : '';
              const rowName = jNameIdx !== -1 ? r[jNameIdx]?.toString().trim().toLowerCase() : '';
              const idMatch = employeeId && rowId && normalizeId(rowId) === nEmpId;
              const nameMatch = eNameSafe && rowName && (rowName === eNameSafe || rowName.includes(eNameSafe));
              return idMatch || nameMatch;
            });
            if (matched) {
              joiningEntry = {
                designation: matched[getJIdx('Designation', 'Post')]?.toString().trim(),
                doj:         matched[getJIdx('Date of Joining', 'DOJ')]?.toString().trim(),
                salary:      matched[getJIdx('Salary', 'Monthly Salary')]?.toString().trim()
              };
            }
          }
        } catch (e) {}
      }

      const formatDate = (dateStr) => {
        if (!dateStr) return '';
        try {
          if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) return dateStr;
          const d = new Date(dateStr);
          if (isNaN(d.getTime())) return dateStr;
          const day = d.getDate().toString().padStart(2, '0');
          const month = (d.getMonth() + 1).toString().padStart(2, '0');
          const year = d.getFullYear();
          return `${day}/${month}/${year}`;
        } catch (e) { return dateStr; }
      };

      // Merge Strategy: Payroll Master > Joining Sheet Fallback
      const empMeta = {
        id:          payrollMasterEntry?.id          || (hrmEntry ? hrmEntry[5]?.toString().trim() : '') || employeeId || '',
        name:        payrollMasterEntry?.name        || (hrmEntry ? hrmEntry[6]?.toString().trim() : '') || employeeName || '',
        designation: payrollMasterEntry?.designation || joiningEntry?.designation || '',
        doj:         formatDate(payrollMasterEntry?.doj || joiningEntry?.doj),
        salary:      payrollMasterEntry?.salary      || joiningEntry?.salary || '',
        location:    (hrmEntry ? hrmEntry[9]?.toString().trim() : '') || payrollMasterEntry?.location || '',
      };


      // ── 4. Fetch biometric attendance (only 2026-04 onwards) ──────────
      const monthIndex = months.findIndex(m => m.toLowerCase() === selectedMonth.toLowerCase()) + 1;
      const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
      let attendanceCount = 0;

      const paddedMonth = monthIndex.toString().padStart(2, '0');
      const endDay = new Date(selectedYear, monthIndex, 0).getDate();
      const fromDate = `${selectedYear}-${paddedMonth}-01`;
      const toDate = `${selectedYear}-${paddedMonth}-${endDay}`;

      const lookupId = empMeta.id || employeeId || '';
      const nLookupId = normalizeId(lookupId);


      if (lookupId && !(selectedYear < 2026 || (selectedYear === 2026 && monthIndex < 4))) {
        await Promise.all(DEVICES.map(async (dev) => {
          try {
            const apiRes = await fetch(`/api/device-logs?APIKey=211616032630&SerialNumber=${dev.serial}&DeviceName=${dev.apiName}&FromDate=${fromDate}&ToDate=${toDate}`);
            const rawLogs = await apiRes.json();
            if (Array.isArray(rawLogs)) {
              const dailyGrouped = {};
              rawLogs.forEach(log => {
                if (!log.EmployeeCode || !log.LogDate) return;
                // Match by normalized ID (handles "1001" == "1001", "JN-011" vs "011" etc.)
                if (normalizeId(log.EmployeeCode) !== nLookupId) return;
                const dateKey = log.LogDate.split(' ')[0];
                if (dateKey < '2026-04-01') return;
                dailyGrouped[dateKey] = true;
              });
              attendanceCount += Object.keys(dailyGrouped).length;
            }
          } catch (e) { /* ignore individual device errors */ }
        }));
      }

      // ── 5. Mirror Payroll.jsx merge strategy ──────────────────────────
      const monthStr = monthNames[monthIndex - 1];
      const yearStr = selectedYear.toString();

      // Build finalHeaders with all required columns (same as Payroll.jsx)
      const requiredHeaders = [
        'EMP ID', 'Name of the Employee', 'Year', 'Month',
        'Designation', 'Location', 'DOJ', 'Monthly Salary',
        'Days in a Month', 'Mgmt Adjustment', 'Total Present',
        'Advance Deduction', 'Brackage', 'Medical', 'Total Salary', 'Pay Date'
      ];
      const finalHeaders = [...spreadsheetHeaders];
      requiredHeaders.forEach(rh => {
        if (finalHeaders.findIndex(h => h && h.toString().trim().toLowerCase() === rh.toLowerCase()) === -1) {
          finalHeaders.push(rh);
        }
      });

      const getIdxFinal = (n) => finalHeaders.findIndex(h => h && h.toString().trim().toLowerCase() === n.toLowerCase());

      // Build lookup map from PAYROLL sheet (key = empId_Month_Year)
      const ssEmpIdIdx = spreadsheetHeaders.findIndex(h => h && h.toString().trim().toLowerCase() === 'emp id');
      const ssMonthIdx = spreadsheetHeaders.findIndex(h => h && h.toString().trim().toLowerCase() === 'month');
      const ssYearIdx = spreadsheetHeaders.findIndex(h => h && h.toString().trim().toLowerCase() === 'year');
      const spreadsheetMap = {};
      spreadsheetRows.forEach(row => {
        const id = ssEmpIdIdx !== -1 ? row[ssEmpIdIdx]?.toString().trim() : '';
        const m = ssMonthIdx !== -1 ? row[ssMonthIdx]?.toString().trim() : '';
        const y = ssYearIdx !== -1 ? row[ssYearIdx]?.toString().trim() : '';
        if (id && m && y) {
          spreadsheetMap[`${id}_${m}_${y}`] = row;
          // Also index by normalized ID for flexible matching
          spreadsheetMap[`${normalizeId(id)}_${m}_${y}`] = row;
        }
      });

      // Resolved identity from Payroll master sheet (primary) + HR master (fallback)
      const resolvedUserId = empMeta.id   || employeeId   || '';
      const resolvedName   = empMeta.name || employeeName || '';

      // Find existing PAYROLL record for this user + month + year
      const key1 = `${resolvedUserId}_${monthStr}_${yearStr}`;
      const key2 = `${nLookupId}_${monthStr}_${yearStr}`;
      const existing = spreadsheetMap[key1] || spreadsheetMap[key2];

      // Build the merged row (exactly as Payroll.jsx does in mergedRows)
      const row = new Array(finalHeaders.length).fill('');

      if (existing) {
        // Fill from PAYROLL sheet first
        spreadsheetHeaders.forEach((h, i) => {
          const targetIdx = finalHeaders.indexOf(h);
          if (targetIdx !== -1) row[targetIdx] = existing[i];
        });
      }

      const eIdIdx    = getIdxFinal('EMP ID');
      const nIdx      = getIdxFinal('Name of the Employee');
      const yIdx      = getIdxFinal('Year');
      const mIdx      = getIdxFinal('Month');
      const dIdx      = getIdxFinal('Designation');
      const lIdx      = getIdxFinal('Location');
      const dojIdx    = getIdxFinal('DOJ');
      const mSalIdx   = getIdxFinal('Monthly Salary');
      const daysIdx   = getIdxFinal('Days in a Month');
      const presIdx   = getIdxFinal('Total Present');
      const totSalIdx = getIdxFinal('Total Salary');
      const advIdx    = getIdxFinal('Advance Deduction');
      const brkIdx    = getIdxFinal('Brackage');
      const medIdx    = getIdxFinal('Medical');
      const mgmtIdx   = getIdxFinal('Mgmt Adjustment');

      // Override / populate — Designation, DOJ, Monthly Salary come from Payroll master sheet
      if (eIdIdx  !== -1) row[eIdIdx]  = resolvedUserId;
      if (nIdx    !== -1) row[nIdx]    = resolvedName;
      if (yIdx    !== -1) row[yIdx]    = yearStr;
      if (mIdx    !== -1) row[mIdx]    = monthStr;
      if (dIdx    !== -1) row[dIdx]    = empMeta.designation;
      if (lIdx    !== -1) row[lIdx]    = empMeta.location;
      if (dojIdx  !== -1) row[dojIdx]  = empMeta.doj;
      if (mSalIdx !== -1 && (!existing || !row[mSalIdx])) row[mSalIdx] = empMeta.salary;


      const daysInMonthCalc = new Date(selectedYear, monthIndex, 0).getDate();
      if (daysIdx !== -1) row[daysIdx] = existing && row[daysIdx] ? row[daysIdx] : daysInMonthCalc;

      // Attendance: prefer biometric count, else fall back to PAYROLL sheet value
      const ssPresIdx = spreadsheetHeaders.findIndex(h => h && h.toString().trim().toLowerCase() === 'total present');
      const savedPresent = existing && ssPresIdx !== -1 ? existing[ssPresIdx] : 0;
      const finalPresent = attendanceCount || savedPresent || 0;
      if (presIdx !== -1) row[presIdx] = finalPresent;

      // Auto-calc Total Salary for rows without a saved PAYROLL record
      if (!existing && totSalIdx !== -1 && mSalIdx !== -1) {
        const monthlySalary = Number(row[mSalIdx]?.toString().replace(/[^\d.]/g, '')) || 0;
        const totalPresent = Number(row[presIdx]) || 0;
        const advance = Number(row[advIdx]) || 0;
        const brackage = Number(row[brkIdx]) || 0;
        const medical = Number(row[medIdx]) || 0;
        row[totSalIdx] = Math.ceil((monthlySalary / daysInMonthCalc) * totalPresent) + brackage + medical - advance;
      }

      if (!existing) {
        if (advIdx  !== -1) row[advIdx]  = 0;
        if (brkIdx  !== -1) row[brkIdx]  = 0;
        if (medIdx  !== -1) row[medIdx]  = 0;
        if (mgmtIdx !== -1) row[mgmtIdx] = 0;
      }

      // Convert the merged row into the processedData object shape
      const processedRecord = {
        id: 1,
        employeeId:      row[eIdIdx]    || resolvedUserId,
        employeeName:    row[nIdx]      || resolvedName,
        year:            row[yIdx]      || yearStr,
        month:           row[mIdx]      || monthStr,
        designation:     row[dIdx]      || '',
        location:        row[lIdx]      || '',
        doj:             formatDate(row[dojIdx]),
        monthlySalary:   toNumber(row[mSalIdx]),
        daysInMonth:     row[daysIdx]   || daysInMonthCalc,
        mgmtAdjustment:  row[mgmtIdx]   || 0,
        totalPresent:    row[presIdx]   || 0,
        advanceDeduction: toNumber(row[advIdx]),
        brackage:        row[brkIdx]    || 0,
        medical:         toNumber(row[medIdx]),
        totalSalary:     toNumber(row[totSalIdx]),
        status:          existing ? 'Paid' : 'Projected',
        basicSalary:     toNumber(row[mSalIdx]),
        allowances:      0,
        overtime:        0,
        netSalary:       toNumber(row[totSalIdx]),
        payDate:         formatDate(row[getIdxFinal('Pay Date')]),
      };

      setSalaryData([processedRecord]);
      setIsDemo(false);

    } catch (error) {
      console.error('Error fetching payroll data:', error);
      setError(error.message);
      toast.error(`Failed to load payroll data: ${error.message}`);
    } finally {
      setLoading(false);
      setTableLoading(false);
    }
  };

  useEffect(() => {
    fetchSalaryData();
  }, []);


  const totalEarnings = filteredSalary.reduce((sum, r) => sum + r.totalSalary, 0);
  const averageSalary = filteredSalary.length > 0 ? totalEarnings / filteredSalary.length : 0;
  const totalDeductions = filteredSalary.reduce((sum, r) => sum + (r.advanceDeduction || 0), 0);
  const totalOvertime = 0; // Not explicitly in the new columns

  const years = [2023, 2024, 2025, 2026];

  const StatCard = ({ title, value, icon: Icon, colorClass }) => (
    <div className={`relative overflow-hidden bg-white rounded-3xl p-6 shadow-xl border border-gray-100 group transition-all hover:-translate-y-1`}>
      <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 opacity-10 transition-transform group-hover:scale-110`}>
        <Icon size={96} />
      </div>
      <div className="relative flex items-center gap-4">
        <div className={`p-3 rounded-2xl ${colorClass} shadow-lg`}>
          <Icon size={24} className="text-white" />
        </div>
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{title}</p>
          <h3 className="text-2xl font-black text-gray-900 mt-1">₹{value.toLocaleString()}</h3>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-4 md:p-8 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Financial Overview</h1>
            {isDemo && (
              <span className="px-3 py-1 bg-amber-100 text-amber-700 text-[10px] font-black uppercase tracking-widest rounded-full border border-amber-200 animate-pulse">
                Demo Mode
              </span>
            )}
          </div>
          <p className="text-gray-500 mt-1 flex items-center gap-2">
            <CreditCard size={16} className="text-indigo-500" />
            Track your earnings and salary history from Payroll.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {/* Year Filter */}
          <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100">
            <span className="text-[10px] font-bold text-gray-400 uppercase px-2">Year</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-transparent text-sm font-bold text-gray-700 outline-none pr-4"
            >
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          {/* Month Filter */}
          <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100">
            <span className="text-[10px] font-bold text-gray-400 uppercase px-2">Month</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-sm font-bold text-gray-700 outline-none pr-4"
            >
              {months.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <button
            onClick={fetchSalaryData}
            className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95"
          >
            <RefreshCcw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Monthly Salary" value={salaryData[0]?.monthlySalary || 0} icon={DollarSign} colorClass="bg-green-500" />
        <StatCard title="Basic Salary" value={salaryData[0]?.totalSalary || 0} icon={TrendingUp} colorClass="bg-blue-500" />
        <StatCard title="Advance Deduction" value={salaryData[0]?.advanceDeduction || 0} icon={ArrowDownRight} colorClass="bg-red-500" />
        <StatCard title="Medical" value={toNumber(salaryData[0]?.medical || 0)} icon={PlusCircle} colorClass="bg-amber-500" />
      </div>

      {/* Salary Table */}
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
          <h2 className="text-xl font-bold text-gray-800">My Salary Stage</h2>
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
            <Calendar size={14} className="text-indigo-500" />
            {selectedMonth} {selectedYear}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1500px]">
            <thead>
              <tr className="bg-white">
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">EMP ID</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">Name of the Employee</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">Designation</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">Location</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">DOJ</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">Monthly Salary</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">Days in a Month</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">Mgmt Adjustment</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">Total Present</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">Advance Deduction</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">Brackage</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">Medical</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 font-black text-gray-900 bg-indigo-50/50">Total Salary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {tableLoading ? (
                <tr>
                  <td colSpan="13" className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-gray-500 font-medium">Loading payroll records...</p>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan="13" className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="p-3 bg-red-50 text-red-500 rounded-full">
                        <AlertCircle size={32} />
                      </div>
                      <p className="text-gray-600 font-medium">{error}</p>
                      <button onClick={fetchSalaryData} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:shadow-lg transition-all active:scale-95">Retry Sync</button>
                    </div>
                  </td>
                </tr>
              ) : filteredSalary.length === 0 ? (
                <tr>
                  <td colSpan="13" className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <Info size={40} className="opacity-20" />
                      <p className="font-medium">No salary records found for {selectedMonth} {selectedYear}.</p>
                    </div>
                  </td>
                </tr>
              ) : filteredSalary.map((record) => (
                <tr key={record.id} className="group hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 text-xs font-bold text-gray-900 border-b border-gray-100">{record.employeeId}</td>
                  <td className="px-6 py-4 text-xs text-gray-600 border-b border-gray-100">{record.employeeName}</td>
                  <td className="px-6 py-4 text-xs text-gray-600 border-b border-gray-100">{record.designation}</td>
                  <td className="px-6 py-4 text-xs text-gray-600 border-b border-gray-100">{record.location}</td>
                  <td className="px-6 py-4 text-xs text-gray-600 border-b border-gray-100">{record.doj}</td>
                  <td className="px-6 py-4 text-xs text-gray-600 border-b border-gray-100">₹{record.monthlySalary?.toLocaleString()}</td>
                  <td className="px-6 py-4 text-xs text-gray-600 border-b border-gray-100">{record.daysInMonth}</td>
                  <td className="px-6 py-4 text-xs text-gray-600 border-b border-gray-100">{record.mgmtAdjustment}</td>
                  <td className="px-6 py-4 text-xs text-gray-600 border-b border-gray-100">{record.totalPresent}</td>
                  <td className="px-6 py-4 text-xs text-red-600 border-b border-gray-100">₹{record.advanceDeduction?.toLocaleString()}</td>
                  <td className="px-6 py-4 text-xs text-gray-600 border-b border-gray-100">{record.brackage}</td>
                  <td className="px-6 py-4 text-xs text-gray-600 border-b border-gray-100">{record.medical}</td>
                  <td className="px-6 py-4 text-xs font-black text-indigo-600 bg-indigo-50/30 border-b border-gray-100">₹{record.totalSalary?.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payslip Modal */}
      <PayslipModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        record={selectedRecord}
      />
    </div>
  );
};

export default MySalary;
