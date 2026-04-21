import { toast } from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import { Search, Loader2, Download, Plus, X, Calendar, Save, Edit2 } from 'lucide-react';
import { SCRIPT_URLS, DEVICE_LOGS_BASE_URL } from '../../utils/envConfig';

const PAYROLL_SCRIPT_URL = SCRIPT_URLS.HR_PAYROLL;
const JOINING_SCRIPT_URL = SCRIPT_URLS.HR_JOINING;



const DEVICES = [
  { name: 'BAWDHAN', apiName: 'BAVDHAN', serial: 'C26238441B1E342D' },
  { name: 'HINJEWADI', apiName: 'HINJEWADI', serial: 'AMDB25061400335' },
  { name: 'WAGHOLI', apiName: 'WAGHOLI', serial: 'AMDB25061400343' },
  { name: 'AKOLE', apiName: 'AKOLE', serial: 'C262CC13CF202038' },
  { name: 'MUMBAI', apiName: 'MUMBAI', serial: 'C2630450C32A2327' }
];

const Payroll = () => {
  const [activeTab, setActiveTab] = useState('salary');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [salaryData, setSalaryData] = useState({ headers: [], rows: [] });
  const [payrollRowMap, setPayrollRowMap] = useState({}); // "EMPID_Month_Year" -> real sheet row number
  const [historyData, setHistoryData] = useState({ headers: [], rows: [] });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [employees, setEmployees] = useState([]);
  // --- Edit & Select State ---
  const [selectedRows, setSelectedRows] = useState(new Set()); // Set of rowIndexes
  const [editingData, setEditingData] = useState({});         // rowIndex -> [...cellValues]
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSubmittingPayments, setIsSubmittingPayments] = useState(false);

  const [formData, setFormData] = useState({
    employeeId: '',
    employeeName: '',
    year: new Date().getFullYear().toString(),
    month: new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date()),
    basicSalary: '0',
    lta: '0',
    bonus: '0',
    otherAllowance: '0',
    overtime: '0',
    pf: '0',
    loan: '0',
    otherDeduction: '0',
    status: 'Draft',
    payDate: new Date().toISOString().split('T')[0]
  });





  const formatDate = (dateStr) => {
    if (!dateStr) return '';

    let date;
    if (dateStr instanceof Date) {
      date = dateStr;
    } else {
      // Try to parse common formats
      const iso = Date.parse(dateStr);
      if (!isNaN(iso)) {
        date = new Date(iso);
      } else {
        // Try dd/mm/yyyy
        const parts = dateStr.toString().split(/[\/\-]/);
        if (parts.length === 3) {
          let [day, month, year] = parts.map(p => parseInt(p, 10));
          if (year < 100) year += 2000;
          date = new Date(year, month - 1, day);
        }
      }
    }

    if (!date || isNaN(date.getTime())) return dateStr;

    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const fetchPayrollData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch spreadsheet records
      const response = await fetch(`${PAYROLL_SCRIPT_URL}?sheet=PAYROLL&action=fetch&spreadsheetId=1lg8cvRaYHpnR75bWxHoh-a30-gGL94-_WAnE7Zue6r8`);
      const result = await response.json();
      let spreadsheetRows = [];
      let spreadsheetHeaders = [];
      if (result.success && result.data && result.data.length > 2) {
        spreadsheetHeaders = result.data[2]; // Row 3
        spreadsheetRows = result.data.slice(3); // Row 4+
      }

      // 2. Fetch Metadata (JOINING)
      const jRes = await fetch(`${JOINING_SCRIPT_URL}?sheet=JOINING&action=fetch`);
      const jData = await jRes.json();
      let joiningRows = [];
      let jHeaders = [];
      if (jData.success && jData.data && jData.data.length > 6) {
        jHeaders = jData.data[5];
        joiningRows = jData.data.slice(6);
      }
      const getJIdx = (...aliases) => {
        for (const alias of aliases) {
          const idx = jHeaders.findIndex(h => h && h.toString().trim().toLowerCase() === alias.toLowerCase());
          if (idx !== -1) return idx;
        }
        return -1;
      };

      const joiningMeta = joiningRows.map(r => ({
        id: r[getJIdx('Employee ID', 'Joining No')]?.toString().trim(),
        name: r[getJIdx('Name As Per Aadhar', 'Candidate Name')]?.toString().trim(),
        designation: r[getJIdx('Designation', 'Post', 'Role')]?.toString().trim(),
        doj: r[getJIdx('Date of Joining', 'DOJ', 'Joining Date')]?.toString().trim(),
        salary: r[getJIdx('Salary', 'Monthly Salary', 'CTC')]?.toString().trim()
      })).filter(h => h.id);

      // 3. Fetch Master Mapping
      const MASTER_MAP_URL = `${JOINING_SCRIPT_URL}?sheet=MASTER&action=fetch`;
      const dmRes = await fetch(MASTER_MAP_URL);
      const dmData = await dmRes.json();
      let currentMapping = [];
      if (dmData.success && dmData.data) {
        const rows = dmData.data.slice(1);
        currentMapping = rows.map(r => ({
          userId: r[5]?.toString().trim(),
          name: r[6]?.toString().trim(),
          storeName: r[9]?.toString().trim()
        }));
      }

      // 4. Fetch Attendance for all devices
      const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      const attendanceAgg = {}; // code -> totalPresent
      
      const startDay = '01';
      const endDay = new Date(selectedYear, selectedMonth, 0).getDate();
      const paddedMonth = selectedMonth.toString().padStart(2, '0');
      let fromDate = `${selectedYear}-${paddedMonth}-${startDay}`;
      let toDate = `${selectedYear}-${paddedMonth}-${endDay}`;

      // Only fetch logs if in 2026-04 onwards
      if (!(selectedYear < 2026 || (selectedYear === 2026 && selectedMonth < 4))) {
        await Promise.all(DEVICES.map(async (dev) => {
          try {
            const apiRes = await fetch(`${DEVICE_LOGS_BASE_URL}?APIKey=211616032630&SerialNumber=${dev.serial}&DeviceName=${dev.apiName}&FromDate=${fromDate}&ToDate=${toDate}`);
            const rawLogs = await apiRes.json();
            if (Array.isArray(rawLogs)) {
              const dailyGrouped = {};
              rawLogs.forEach(log => {
                if (!log.EmployeeCode || !log.LogDate) return;
                const dateKey = log.LogDate.split(' ')[0];
                if (dateKey < '2026-04-01') return;
                const key = `${log.EmployeeCode}_${dateKey}`;
                dailyGrouped[key] = true;
              });
              Object.keys(dailyGrouped).forEach(key => {
                const code = key.split('_')[0];
                attendanceAgg[code] = (attendanceAgg[code] || 0) + 1;
              });
            }
          } catch (e) { console.error(`Error fetching logs for ${dev.name}`, e); }
        }));
      }

      // 5. Merge Strategy
      // If a row exists in spreadsheet for this Emp + Month + Year, use it.
      // Otherwise, create "virtual" row for everyone in Master/Joining.
      
      const monthStr = monthNames[selectedMonth - 1];
      const yearStr = selectedYear.toString();

      // Ensure specific columns are present in headers
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

      const getIdx = (n) => finalHeaders.findIndex(h => h && h.toString().trim().toLowerCase() === n.toLowerCase());
      
      const empIdIdx = getIdx('EMP ID');
      const nameIdx = getIdx('Name of the Employee');
      const yearIdx = getIdx('Year');
      const monthIdx = getIdx('Month');
      const desigIdx = getIdx('Designation');
      const locIdx = getIdx('Location');
      const presentIdx = getIdx('Total Present');

      // Index of spreadsheet data for quick lookup
      const spreadsheetMap = {};
      const rowNumberMap = {}; // key -> real sheet row number (1-based)
      const ssEmpIdIdx = spreadsheetHeaders.findIndex(h => h && h.toString().trim().toLowerCase() === 'emp id');
      const ssMonthIdx = spreadsheetHeaders.findIndex(h => h && h.toString().trim().toLowerCase() === 'month');
      const ssYearIdx = spreadsheetHeaders.findIndex(h => h && h.toString().trim().toLowerCase() === 'year');
      spreadsheetRows.forEach((row, i) => {
        const id = ssEmpIdIdx !== -1 ? row[ssEmpIdIdx]?.toString().trim() : '';
        const m = ssMonthIdx !== -1 ? row[ssMonthIdx]?.toString().trim() : '';
        const y = ssYearIdx !== -1 ? row[ssYearIdx]?.toString().trim() : '';
        if (id && m && y) {
          const key = `${id}_${m}_${y}`;
          spreadsheetMap[key] = row;
          // spreadsheetRows starts at data.slice(3), so index 0 = sheet row 4
          rowNumberMap[key] = i + 4;
        }
      });
      setPayrollRowMap(rowNumberMap);

      const mergedRows = currentMapping.map(m => {
        const key = `${m.userId}_${monthStr}_${yearStr}`;
        const existing = spreadsheetMap[key];
        
        let row = new Array(finalHeaders.length).fill('');
        
        // If existing row, fill what we have
        if (existing) {
            spreadsheetHeaders.forEach((h, i) => {
                const targetIdx = finalHeaders.indexOf(h);
                if (targetIdx !== -1) row[targetIdx] = existing[i];
            });
        }
        
        const empMeta = joiningMeta.find(j => 
          (j.id && j.id.toLowerCase() === m.userId.toLowerCase()) || 
          (j.name && j.name.toLowerCase() === m.name.toLowerCase())
        );

        // Populate/Override with metadata
        const getIdxFinal = (n) => finalHeaders.findIndex(h => h && h.toString().trim().toLowerCase() === n.toLowerCase());
        
        const eIdIdx = getIdxFinal('EMP ID');
        const nIdx = getIdxFinal('Name of the Employee');
        const yIdx = getIdxFinal('Year');
        const mIdx = getIdxFinal('Month');
        const dIdx = getIdxFinal('Designation');
        const lIdx = getIdxFinal('Location');
        const dojIdxFinal = getIdxFinal('DOJ');
        const mSalIdx = getIdxFinal('Monthly Salary');
        const daysInMonIdx = getIdxFinal('Days in a Month');
        const presIdx = getIdxFinal('Total Present');
        const totalSalIdxFinal = getIdxFinal('Total Salary');
        const advIdx = getIdxFinal('Advance Deduction');
        const brkIdx = getIdxFinal('Brackage');
        const medIdx = getIdxFinal('Medical');
        const mgmtIdx = getIdxFinal('Mgmt Adjustment');
        const payDateIdxFinal = getIdxFinal('Pay Date');

        if (eIdIdx !== -1) row[eIdIdx] = m.userId;
        if (nIdx !== -1) row[nIdx] = m.name;
        if (yIdx !== -1) row[yIdx] = yearStr;
        if (mIdx !== -1) row[mIdx] = monthStr;
        if (dIdx !== -1 && empMeta) row[dIdx] = empMeta.designation;
        if (lIdx !== -1) row[lIdx] = m.storeName;
        if (dojIdxFinal !== -1 && empMeta) row[dojIdxFinal] = empMeta.doj;
        if (mSalIdx !== -1 && empMeta && (!existing || !row[mSalIdx])) row[mSalIdx] = empMeta.salary;
        
        const daysInMonthCalculated = new Date(selectedYear, selectedMonth, 0).getDate();
        if (daysInMonIdx !== -1) row[daysInMonIdx] = existing && row[daysInMonIdx] ? row[daysInMonIdx] : daysInMonthCalculated;
        
        if (presIdx !== -1) {
            row[presIdx] = attendanceAgg[m.userId] || (existing && existing[spreadsheetHeaders.indexOf('Total Present')] ? existing[spreadsheetHeaders.indexOf('Total Present')] : 0);
        }

        // Auto-calculate Total Salary for new rows
        if (!existing && totalSalIdxFinal !== -1 && mSalIdx !== -1 && daysInMonIdx !== -1 && presIdx !== -1) {
            const monthlySalary = Number(row[mSalIdx]?.toString().replace(/[^\d.]/g, '')) || 0;
            const totalPresent = Number(row[presIdx]) || 0;
            const advance = 0;
            const brackage = 0;
            const medical = 0;
            
            row[totalSalIdxFinal] = Math.ceil((monthlySalary / daysInMonthCalculated) * totalPresent) + brackage + medical - advance;
        }

        // Initialize missing fields for new rows
        if (!existing) {
            if (advIdx !== -1) row[advIdx] = 0;
            if (brkIdx !== -1) row[brkIdx] = 0;
            if (medIdx !== -1) row[medIdx] = 0;
            if (mgmtIdx !== -1) row[mgmtIdx] = 0;
            if (payDateIdxFinal !== -1) row[payDateIdxFinal] = new Date().toISOString().split('T')[0];
        }

        return row;
      });

      setSalaryData({ headers: finalHeaders, rows: mergedRows });

    } catch (err) {
      setError("Failed to fetch data: " + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistoryData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${PAYROLL_SCRIPT_URL}?sheet=PAID Record&action=fetch&spreadsheetId=1lg8cvRaYHpnR75bWxHoh-a30-gGL94-_WAnE7Zue6r8`);
      const result = await response.json();
      if (result.success) {
        const allData = result.data || [];
        if (allData.length > 0) {
          const headers = allData[0];
          const dataRows = allData.slice(1);
          setHistoryData({ headers, rows: dataRows });
        }
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError("Failed to fetch history data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'salary') {
      fetchPayrollData();
    } else {
      fetchHistoryData();
    }
    fetchEmployees();
  }, [activeTab, selectedMonth, selectedYear]);

  // Dedicated JOINING sheet script (same as Employee.jsx, Dashboard.jsx, LeaveManagement.jsx)


  const fetchEmployees = async () => {
    try {
      const response = await fetch(
        `${JOINING_SCRIPT_URL}?sheet=JOINING&action=fetch`
      );
      const result = await response.json();
      if (result.success && result.data) {
        // E7:E → data starts row 7 (index 6), Col E (index 4) = Name, Col B (index 1) = ID
        const emps = result.data.slice(6)
          .filter(row => row[4] && row[4].toString().trim() !== '')
          .map(row => ({
            id: row[1] || '',
            name: row[4].toString().trim()
          }));
        setEmployees(emps);
      }
    } catch (err) {
      console.error('Error fetching employees from JOINING sheet:', err);
    }
  };

  const handleEmployeeChange = (name) => {
    const emp = employees.find(e => e.name === name);
    setFormData(prev => ({
      ...prev,
      employeeName: name,
      employeeId: emp ? emp.id : ''
    }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'employeeName') {
      handleEmployeeChange(value);
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.employeeName || !formData.employeeId) {
      toast.error("Please select an employee");
      return;
    }

    setIsSubmitting(true);
    try {
      const now = new Date();
      const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

      // A=Timestamp | B:N=13 data cols | O=Pay Date
      const rowData = [
        timestamp,                  // A - Timestamp
        formData.employeeId,        // B - Employee ID
        formData.employeeName,      // C - Employee Name
        formData.year,              // D - Year
        formData.month,             // E - Month
        formData.basicSalary,       // F - Basic Salary
        formData.lta,               // G - LTA
        formData.bonus,             // H - Bonus
        formData.otherAllowance,    // I - Other Allowance
        formData.overtime,          // J - Overtime
        formData.pf,                // K - PF
        formData.loan,              // L - Loan
        formData.otherDeduction,    // M - Other Deduction
        formData.status,            // N - Status
        formData.payDate            // O - Pay Date
      ];

      const response = await fetch(SCRIPT_URLS.HR_JOINING, {
        method: 'POST',
        body: new URLSearchParams({
          sheetName: 'New Payroll',
          action: 'insert',
          spreadsheetId: '1lg8cvRaYHpnR75bWxHoh-a30-gGL94-_WAnE7Zue6r8',
          rowData: JSON.stringify(rowData)
        })
      });

      const result = await response.json();
      if (result.success) {
        toast.success("Payroll entry added successfully!");
        setShowModal(false);
        fetchPayrollData(); // Refresh table
        // Reset form except year/month/status/paydate defaults
        setFormData(prev => ({
          ...prev,
          employeeId: '',
          employeeName: '',
          basicSalary: '0',
          lta: '0',
          bonus: '0',
          otherAllowance: '0',
          overtime: '0',
          pf: '0',
          loan: '0',
          otherDeduction: '0',
          status: 'Draft',
          payDate: new Date().toISOString().split('T')[0]
        }));
      } else {
        toast.error(result.error || "Failed to add payroll entry");
      }
    } catch (err) {
      toast.error("An error occurred during submission");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Checkbox & Edit Handlers ---
  const handleCheckbox = (rowIndex, row) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(rowIndex)) {
        next.delete(rowIndex);
        setEditingData(d => { const nd = { ...d }; delete nd[rowIndex]; return nd; });
      } else {
        next.add(rowIndex);
        setEditingData(d => ({ ...d, [rowIndex]: [...row] }));
      }
      return next;
    });
  };

  const handleCellEdit = (rowIndex, cellIndex, value, headers, originalRow) => {
    setEditingData(prev => {
      const updatedRow = [...(prev[rowIndex] || [])];
      updatedRow[cellIndex] = value;

      // --- LIVE CALCULATION LOGIC ---
      if (headers && originalRow) {
        const getIdx = (name) => headers.findIndex(h => h?.toString().toLowerCase().trim() === name.toLowerCase());

        const mgmtAdjIdx = getIdx('Mgmt Adjustment');
        const presentIdx = getIdx('Total Present');
        const monthSalIdx = getIdx('Monthly Salary');
        const daysMonthIdx = getIdx('Days in a Month');
        const brackageIdx = getIdx('Brackage');
        const medicalIdx = getIdx('Medical');
        const advDedIdx = getIdx('Advance Deduction');
        const totalSalIdx = getIdx('Total Salary');

        // 1. Calculate Total Present dynamically
        if (mgmtAdjIdx !== -1 && presentIdx !== -1) {
          const origTotalPresent = Number(originalRow[presentIdx]) || 0;
          const origMgmtAdj = Number(originalRow[mgmtAdjIdx]) || 0;
          const basePresent = origTotalPresent - origMgmtAdj;
          const newMgmtAdj = Number(updatedRow[mgmtAdjIdx]) || 0;

          const newTotalPresent = basePresent + newMgmtAdj;
          updatedRow[presentIdx] = newTotalPresent;
        }

        // 2. Calculate Total Salary dynamically
        if (
          totalSalIdx !== -1 && monthSalIdx !== -1 && daysMonthIdx !== -1 &&
          presentIdx !== -1 && brackageIdx !== -1 && medicalIdx !== -1 && advDedIdx !== -1
        ) {
          const monthlySalary = Number(updatedRow[monthSalIdx]) || 0;
          const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate(); 
          const totalPresent = Number(updatedRow[presentIdx]) || 0;
          const brackage = Number(updatedRow[brackageIdx]) || 0;
          const medical = Number(updatedRow[medicalIdx]) || 0;
          const advance = Number(updatedRow[advDedIdx]) || 0;

          // Always sync days in month correctly
          updatedRow[daysMonthIdx] = daysInMonth;

          const totalSalary = Math.ceil((monthlySalary / daysInMonth) * totalPresent) + brackage + medical - advance;
          updatedRow[totalSalIdx] = totalSalary;
        }
      }

      return { ...prev, [rowIndex]: updatedRow };
    });
  };

  const handleUpdate = async () => {
    if (selectedRows.size === 0) { toast.error("Please select at least one row to update."); return; }
    setIsUpdating(true);

    const SPREADSHEET_ID = '1lg8cvRaYHpnR75bWxHoh-a30-gGL94-_WAnE7Zue6r8';

    const updates = [];
    const skipped = [];
    const originalHeaders = salaryData?.headers || [];
    const displayHeaders = getReorderedHeaders(originalHeaders);
    const empIdColIdx = originalHeaders.findIndex(h => h && h.toString().trim().toLowerCase() === 'emp id');
    const monthColIdx = originalHeaders.findIndex(h => h && h.toString().trim().toLowerCase() === 'month');
    const yearColIdx = originalHeaders.findIndex(h => h && h.toString().trim().toLowerCase() === 'year');

    selectedRows.forEach(rowIndex => {
      if (editingData[rowIndex]) {
        const editedRow = editingData[rowIndex];
        const originalDataRow = salaryData.rows[rowIndex] || [];
        const originalDisplayRow = reorderRow(originalDataRow, originalHeaders);

        // Resolve real sheet row by EMP ID + Month + Year (NOT by display position)
        const empId = originalDataRow[empIdColIdx]?.toString().trim();
        const month = originalDataRow[monthColIdx]?.toString().trim();
        const year = originalDataRow[yearColIdx]?.toString().trim();
        const key = `${empId}_${month}_${year}`;
        const sheetRow = payrollRowMap[key];

        if (!sheetRow) {
          skipped.push(empId || `row ${rowIndex + 1}`);
          return;
        }

        const changedCells = [];
        for (let j = 0; j < editedRow.length; j++) {
          if (editedRow[j] !== originalDisplayRow[j]) {
            const headerName = displayHeaders[j];
            const originalColIndex = originalHeaders.indexOf(headerName);
            if (originalColIndex !== -1) {
              changedCells.push({
                colIndex: originalColIndex, // 0-based column index as in headers
                value: editedRow[j]
              });
            }
          }
        }

        if (changedCells.length > 0) {
          updates.push({ rowIndex: sheetRow, changes: changedCells });
        }
      }
    });

    if (skipped.length > 0) {
      toast.error(`No PAYROLL row exists yet for: ${skipped.join(', ')}. Use Add to create them first.`);
    }

    if (updates.length === 0) {
      toast.error("No values were changed.");
      setIsUpdating(false);
      return;
    }

    try {
      const updatePromises = [];
      for (const update of updates) {
        for (const change of update.changes) {
          const params = new URLSearchParams({
            action: 'updateCell',
            sheetName: 'PAYROLL',
            spreadsheetId: SPREADSHEET_ID,
            rowIndex: update.rowIndex.toString(),
            columnIndex: (change.colIndex + 1).toString(),
            value: change.value
          });
          updatePromises.push(
            fetch(`${PAYROLL_SCRIPT_URL}?${params.toString()}`)
          );
        }
      }

      const responses = await Promise.all(updatePromises);
      const results = await Promise.all(responses.map(r => r.json()));

      const hasError = results.some(result => !result.success);

      if (!hasError) {
        toast.success(`${updates.length} row(s) updated successfully!`);
        setSelectedRows(new Set());
        setEditingData({});
        fetchPayrollData();
      } else {
        const errorMsg = results.find(r => !r.success)?.error || 'Server rejected the update';
        toast.error(`Update failed: ${errorMsg}`);
        console.error('GAS responses:', results);
      }
    } catch (e) {
      console.error('Fetch error:', e);
      toast.error(`Network error: ${e.message}`);
    }

    setIsUpdating(false);
  };

  const handleSubmitPayments = async () => {
    if (!salaryData?.rows?.length) {
      toast.error("No payroll rows to submit.");
      return;
    }
    if (!window.confirm(`Submit ${salaryData.rows.length} row(s) to PAID Record sheet?`)) return;

    setIsSubmittingPayments(true);
    const SPREADSHEET_ID = '1lg8cvRaYHpnR75bWxHoh-a30-gGL94-_WAnE7Zue6r8';

    try {
      const insertPromises = salaryData.rows.map(row =>
        fetch(PAYROLL_SCRIPT_URL, {
          method: 'POST',
          body: new URLSearchParams({
            action: 'insert',
            sheetName: 'PAID Record',
            spreadsheetId: SPREADSHEET_ID,
            rowData: JSON.stringify(row)
          })
        }).then(r => r.json())
      );

      const results = await Promise.all(insertPromises);
      const failed = results.filter(r => !r.success);

      if (failed.length === 0) {
        toast.success(`${results.length} row(s) submitted to PAID Record.`);
        fetchHistoryData();
      } else {
        toast.error(`${failed.length} row(s) failed: ${failed[0]?.error || 'Server rejected the insert'}`);
        console.error('PAID Record insert failures:', failed);
      }
    } catch (e) {
      console.error('Submit payments error:', e);
      toast.error(`Network error: ${e.message}`);
    }

    setIsSubmittingPayments(false);
  };


  const getReorderedHeaders = (headers) => {
    if (!headers) return [];
    const preferredOrder = [
      'EMP ID', 'Name of the Employee', 'Year', 'Month', 
      'Designation', 'Location', 'DOJ', 'Monthly Salary', 
      'Days in a Month', 'Mgmt Adjustment', 'Total Present', 
      'Advance Deduction', 'Brackage', 'Medical', 'Total Salary', 'Pay Date'
    ];
    const result = [];
    preferredOrder.forEach(h => {
      const idx = headers.findIndex(orig => orig && orig.toString().trim().toLowerCase() === h.toLowerCase());
      if (idx !== -1) result.push(headers[idx]);
    });
    headers.forEach(h => {
      if (!result.includes(h)) result.push(h);
    });
    return result;
  };

  const reorderRow = (row, headers) => {
    if (!row || !headers) return row;
    const reorderedHeaders = getReorderedHeaders(headers);
    return reorderedHeaders.map(h => {
      const idx = headers.indexOf(h);
      return idx !== -1 ? row[idx] : '';
    });
  };

  const renderTable = (data, isSalary = false) => {
    if (!data || !data.headers) return null;

    const headers = isSalary ? getReorderedHeaders(data.headers) : data.headers;
    const filteredRows = data.rows.filter(row =>
      row.some(cell => cell && cell.toString().toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
      <div>
        {/* Update Toolbar */}
        {isSalary && selectedRows.size > 0 && (
          <div className="flex items-center gap-3 mb-3 p-3 bg-blue-50 border border-blue-200 rounded-xl animate-in slide-in-from-top duration-200">
            <Edit2 size={16} className="text-blue-600" />
            <span className="text-sm font-semibold text-blue-700">{selectedRows.size} row(s) selected for editing</span>
            <button
              onClick={handleUpdate}
              disabled={isUpdating}
              className="ml-auto flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow transition-all active:scale-95 disabled:opacity-50"
            >
              {isUpdating ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {isUpdating ? 'Updating...' : 'Update'}
            </button>
            <button
              onClick={() => { setSelectedRows(new Set()); setEditingData({}); }}
              className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
            >
              Cancel
            </button>
          </div>
        )}

        <div className="overflow-auto max-h-[600px] border border-gray-200 rounded-lg">
          <table className="min-w-full divide-y divide-gray-200 border-separate border-spacing-0">
            <thead className="bg-sky-200 sticky top-0 z-10">
              <tr>
                {/* Action Column Header */}
                {isSalary && (
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200 bg-sky-200 sticky top-0 z-10 w-12">
                    Action
                  </th>
                )}
                {headers.map((header, i) => (
                  <th key={i} className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200 bg-sky-200 sticky top-0 z-10">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {filteredRows.map((row, i) => {
                const displayRow = isSalary ? reorderRow(row, data.headers) : row;
                const isSelected = selectedRows.has(i);
                return (
                  <tr key={i} className={`transition-colors ${isSelected ? 'bg-blue-50 ring-1 ring-inset ring-blue-300' : 'hover:bg-gray-50'}`}>
                    {/* Checkbox Cell */}
                    {isSalary && (
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleCheckbox(i, displayRow)}
                          className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                        />
                      </td>
                    )}
                    {displayRow.map((cell, j) => {
                      const header = headers[j]?.toString().toLowerCase().trim() || "";
                      const isDateColumn = header.includes('date of joining') || header === 'doj';
                      const isSno = header === 's.n' || header === 's.no' || header === 'sn';
                      const isEmpId = header === 'emp id';
                      const isEmpName = header === 'name of the employee';
                      const isYear = header === 'year';
                      const isMonth = header === 'month';
                      const isDesig = header === 'designation';
                      const isLoc = header === 'location' || header === 'store name';
                      const isPresent = header === 'total present';
                      const isDisabled = isEmpId || isEmpName || isSno || isYear || isMonth || isDesig || isLoc || isPresent;

                      let displayCell = isDateColumn ? formatDate(cell) : cell;
                      if (isSno && (!displayCell || displayCell.toString().trim() === '')) {
                        displayCell = i + 1;
                      }

                      if (isSalary && isSelected) {
                        return (
                          <td key={j} className="px-2 py-2 whitespace-nowrap">
                            <input
                              type="text"
                              value={(isSno ? displayCell : editingData[i]?.[j]) ?? displayCell ?? ''}
                              onChange={(e) => handleCellEdit(i, j, e.target.value, headers, displayRow)}
                              disabled={isDisabled}
                              className={`w-full min-w-[80px] px-2 py-1 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${isDisabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200' : 'bg-white text-gray-800 border-blue-300'}`}
                            />
                          </td>
                        );
                      }

                      return (
                        <td key={j} className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {displayCell}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };


  return (
    <div className="p-6 space-y-6 bg-white min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Payroll Management</h1>
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search payroll records..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-medium shadow-sm active:scale-95"
          >
            <Plus size={18} />
            New Payroll
          </button>
          {activeTab === 'salary' && (
            <button
              onClick={handleSubmitPayments}
              disabled={isSubmittingPayments || !salaryData?.rows?.length}
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all font-medium shadow-sm active:scale-95 disabled:opacity-50"
            >
              {isSubmittingPayments ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              {isSubmittingPayments ? 'Submitting...' : 'Submit Payments'}
            </button>
          )}
        </div>

      </div>

      <div className="flex border-b border-gray-200 justify-between items-center pr-4">
        <div className="flex">
          <button
            className={`px-6 py-3 text-sm font-medium transition-all border-b-2 ${activeTab === 'salary' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('salary')}
          >
            Salary Sheet
          </button>
          <button
            className={`px-6 py-3 text-sm font-medium transition-all border-b-2 ${activeTab === 'history' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('history')}
          >
            History
          </button>
        </div>

        {activeTab === 'salary' && (
          <div className="flex items-center gap-3 py-2">
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-black uppercase text-gray-400">Month</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-slate-700 outline-none"
              >
                {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((m, idx) => (
                  <option key={m} value={idx + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-black uppercase text-gray-400">Year</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-slate-700 outline-none"
              >
                {[2024, 2025, 2026].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 className="animate-spin text-blue-600" size={40} />
          <p className="text-gray-500 animate-pulse">Fetching payroll records...</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 border border-red-100 rounded-lg text-red-600 text-center">
          {error}
          <button onClick={() => activeTab === 'salary' ? fetchPayrollData() : fetchHistoryData()} className="ml-4 underline font-medium">Retry</button>
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          {activeTab === 'salary' ? renderTable(salaryData, true) : renderTable(historyData, false)}
          {((activeTab === 'salary' && salaryData.rows?.length === 0) || (activeTab === 'history' && historyData.rows?.length === 0)) && !loading && (
            <div className="text-center py-20 text-gray-400">No records found.</div>
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-xl font-bold text-gray-800">Add New Payroll Entry</h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[60vh] overflow-y-auto px-1">
                {/* Employee ID & Name */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Employee ID</label>
                  <input
                    type="text"
                    name="employeeId"
                    value={formData.employeeId}
                    readOnly
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-500 focus:outline-none"
                    placeholder="Auto-filled"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Employee Name</label>
                  <select
                    name="employeeName"
                    value={formData.employeeName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    required
                  >
                    <option value="">Select Employee</option>
                    {employees.map((emp, i) => (
                      <option key={i} value={emp.name}>{emp.name}</option>
                    ))}
                  </select>
                </div>

                {/* Year & Month */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Year</label>
                  <input
                    type="text"
                    name="year"
                    value={formData.year}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Month</label>
                  <select
                    name="month"
                    value={formData.month}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  >
                    {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                {/* Basic Salary & LTA */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Basic Salary</label>
                  <input
                    type="number"
                    name="basicSalary"
                    value={formData.basicSalary}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Leave Travel Allowance</label>
                  <input
                    type="number"
                    name="lta"
                    value={formData.lta}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>

                {/* Bonus & Other Allowance */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Bonus</label>
                  <input
                    type="number"
                    name="bonus"
                    value={formData.bonus}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Other Allowance</label>
                  <input
                    type="number"
                    name="otherAllowance"
                    value={formData.otherAllowance}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>

                {/* Overtime & PF */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Overtime</label>
                  <input
                    type="number"
                    name="overtime"
                    value={formData.overtime}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">PF</label>
                  <input
                    type="number"
                    name="pf"
                    value={formData.pf}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>

                {/* Loan & Other Deduction */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Loan</label>
                  <input
                    type="number"
                    name="loan"
                    value={formData.loan}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Other Deduction</label>
                  <input
                    type="number"
                    name="otherDeduction"
                    value={formData.otherDeduction}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>

                {/* Status & Pay Date */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  >
                    <option value="Draft">Draft</option>
                    <option value="Pending">Pending</option>
                    <option value="Paid">Paid</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Pay Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type="date"
                      name="payDate"
                      value={formData.payDate}
                      onChange={handleInputChange}
                      className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8 pt-6 border-t font-medium">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2.5 text-gray-600 hover:bg-gray-50 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-10 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Payroll;
