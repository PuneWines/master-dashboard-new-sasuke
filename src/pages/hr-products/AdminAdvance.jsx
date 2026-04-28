import React, { useState, useEffect } from 'react';
import { Search, X, Clock, Wallet, Banknote, Stethoscope, Hammer, Loader2, History, ArrowRightLeft, Calendar, User, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { SCRIPT_URLS } from '../../utils/envConfig';

const AdminAdvance = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [pendingRequests, setPendingRequests] = useState([]);
  const [approvedRequests, setApprovedRequests] = useState([]);
  const [rejectedRequests, setRejectedRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Admin inputs
  const [approvedAmount, setApprovedAmount] = useState('');
  const [approvedMonthlyDeduction, setApprovedMonthlyDeduction] = useState('');
  const [remarks, setRemarks] = useState('');
  
  // Transaction Modal State
  const [showTxModal, setShowTxModal] = useState(false);
  const [txView, setTxView] = useState('search'); // 'search', 'cards', 'ledger'
  const [employees, setEmployees] = useState([]);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [txSearchTerm, setTxSearchTerm] = useState('');
  const [allAdvancesForEmp, setAllAdvancesForEmp] = useState([]);
  const [selectedAdv, setSelectedAdv] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [txLoading, setTxLoading] = useState(false);

  const SCRIPT_URL = SCRIPT_URLS.HR_PAYROLL;
  const JOINING_SCRIPT_URL = SCRIPT_URLS.HR_JOINING;
  const SPREADSHEET_ID = '1lg8cvRaYHpnR75bWxHoh-a30-gGL94-_WAnE7Zue6r8';

  const fetchData = async () => {
    setLoading(true);
    setTableLoading(true);
    try {
      const response = await fetch(`${SCRIPT_URL}?sheet=ADVANCE&action=fetch&spreadsheetId=${SPREADSHEET_ID}`);
      const result = await response.json();
      if (result.success) {
        const rawRows = result.data || [];
        const dataRows = (rawRows.length > 0 && Array.isArray(rawRows[0])) ? rawRows.slice(1) : rawRows;
        
        const allRecords = dataRows.map((row, idx) => ({
          rowIndex: idx + 2,
          timestamp: row[0],
          empId: row[1],
          empName: row[2],
          amount: row[3],
          monthlyDeduction: row[4],
          reason: row[5],
          status: row[6] || 'Pending',
          type: row[7] || 'Advance',
          apprAmount: row[8] || '',
          apprMonthlyDeduction: row[9] || '',
          adminRemarks: row[10] || ''
        })).reverse();

        setPendingRequests(allRecords.filter(r => r.status?.toLowerCase() === 'pending'));
        setApprovedRequests(allRecords.filter(r => r.status?.toLowerCase() === 'approved'));
        setRejectedRequests(allRecords.filter(r => r.status?.toLowerCase() === 'rejected'));
      }
    } catch (error) {
      console.error('Error fetching advance data:', error);
      toast.error('Failed to load records from ADVANCE sheet');
    } finally {
      setLoading(false);
      setTableLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await fetch(`${JOINING_SCRIPT_URL}?sheet=JOINING&action=fetch&spreadsheetId=1d10niZ9MX1DIVpSqplzANqPylPTYiXq7TYSYSRNaBUg`);
      const result = await response.json();
      if (result.success && result.data) {
        const emps = result.data.slice(6)
          .filter(row => row[4] && row[4].toString().trim() !== '')
          .map(row => ({
            id: row[1] || '',
            name: row[4].toString().trim(),
            designation: row[8] || ''
          }));
        setEmployees(emps);
      }
    } catch (err) {
      console.error('Error fetching employees:', err);
    }
  };

  const fetchTxData = async (emp) => {
    setTxLoading(true);
    try {
      const [advRes, paidRes] = await Promise.all([
        fetch(`${SCRIPT_URL}?sheet=ADVANCE&action=fetch&spreadsheetId=${SPREADSHEET_ID}`),
        fetch(`${SCRIPT_URL}?sheet=PAID%20Record&action=fetch&spreadsheetId=${SPREADSHEET_ID}`)
      ]);
      const advData = await advRes.json();
      const paidData = await paidRes.json();

      if (advData.success && paidData.success) {
        const advRows = advData.data.slice(1);
        const paidRows = paidData.data.slice(1);

        const empAdvances = advRows
          .filter(row => row[1]?.toString().trim() === emp.id?.toString().trim() && row[6]?.toString().trim() === 'Approved')
          .map((row, idx) => ({
            id: `adv_${idx}`,
            date: row[0],
            empId: row[1],
            empName: row[2],
            amount: parseFloat(row[8] || row[3] || 0),
            monthlyDeduction: parseFloat(row[9] || 0),
            pending: parseFloat(row[11] || 0),
            category: row[7] || 'Advance',
            status: row[6]
          }));
        
        setAllAdvancesForEmp(empAdvances);

        const empTx = paidRows
          .filter(row => row[1]?.toString().trim() === emp.id?.toString().trim())
          .map(row => ({
            empId: row[1],
            fixDed: parseFloat(row[13] || 0),
            extraDed: parseFloat(row[15] || 0),
            date: row[19] || row[0]
          }));
        
        setTransactions(empTx);
        setTxView('cards');
      }
    } catch (err) {
      console.error('Error fetching transaction data:', err);
      toast.error('Failed to load transaction details');
    } finally {
      setTxLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return dateString;
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    } catch {
      return dateString;
    }
  };

  const formatDateTimeLedger = (dateString) => {
    if (!dateString) return '-';
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return dateString;
      return d.toLocaleString('en-GB', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch {
      return dateString;
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'Medical Amount': return <Stethoscope size={16} className="text-blue-500" />;
      case 'Brackage': return <Hammer size={16} className="text-orange-500" />;
      default: return <Banknote size={16} className="text-emerald-500" />;
    }
  };

  const openReviewModal = (request) => {
    setSelectedRequest(request);
    setApprovedAmount(request.apprAmount || request.amount || '');
    setApprovedMonthlyDeduction(request.apprMonthlyDeduction || request.monthlyDeduction || '');
    setRemarks(request.adminRemarks || '');
    setShowModal(true);
  };

  const handleAction = async (actionStatus) => {
    if (!selectedRequest) return;
    
    const updates = [
      { col: 7, val: actionStatus },
      { col: 11, val: remarks }
    ];
 
    if (actionStatus === 'Approved') {
      updates.push({ col: 9, val: approvedAmount });
      updates.push({ col: 10, val: approvedMonthlyDeduction });
    }

    setSubmitting(true);
    try {
      const updatePromises = updates.map(update => {
        return fetch(SCRIPT_URL, {
          method: 'POST',
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            sheetName: 'ADVANCE',
            action: 'updateCell',
            spreadsheetId: SPREADSHEET_ID,
            rowIndex: selectedRequest.rowIndex.toString(),
            columnIndex: update.col.toString(),
            value: update.val
          }).toString()
        });
      });

      const responses = await Promise.all(updatePromises);
      const results = await Promise.all(responses.map(r => r.json()));
      const hasError = results.some(result => !result.success);

      if (!hasError) {
        if (actionStatus === 'Approved') {
          toast.loading('Syncing to PAYROLL...', { id: 'payroll_sync' });
          try {
            const PAYROLL_SCRIPT_URL = SCRIPT_URLS.HR_PAYROLL;
            const currentMonth = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date());
            const currentYear = new Date().getFullYear().toString();

            const pRes = await fetch(`${PAYROLL_SCRIPT_URL}?sheet=PAYROLL&action=fetch&spreadsheetId=${SPREADSHEET_ID}`);
            const pData = await pRes.json();

            if (pData.success && pData.data && pData.data.length > 2) {
              const headers = pData.data[2]; 
              const parseNum = (val) => {
                const num = Number(String(val).replace(/[^0-9.-]+/g, ''));
                return isNaN(num) ? 0 : num;
              };
              const getIdx = (name) => headers.findIndex(h => h?.toString().trim().toLowerCase() === name.toLowerCase());
              const empIdIdx = getIdx('EMP ID');
              const nameIdx = getIdx('Name of the Employee');
              const monthIdx = getIdx('Month');
              const yearIdx = getIdx('Year');

              let deductionAmountThisMonth = parseNum(approvedMonthlyDeduction);
              let correctedEmpId = selectedRequest.empId?.toString().trim();
              
              let targetColName = 'Fix Advance Deduction';
              if (selectedRequest.type === 'Brackage') targetColName = 'Brackage';
              if (selectedRequest.type === 'Medical Amount') targetColName = 'Medical';
              if (selectedRequest.type === 'Extra Advance') targetColName = 'Extra Advance Deduction';
              const targetColIdx = getIdx(targetColName);

              if (empIdIdx !== -1 && targetColIdx !== -1) {
                let targetRowIndex = -1;
                let existingAmount = 0;
                for (let i = 3; i < pData.data.length; i++) {
                  const row = pData.data[i];
                  if (row[empIdIdx]?.toString().trim() === correctedEmpId && row[monthIdx]?.toString().toLowerCase() === currentMonth.toLowerCase() && row[yearIdx]?.toString() === currentYear) {
                    targetRowIndex = i + 1;
                    existingAmount = parseNum(row[targetColIdx]);
                    break;
                  }
                }
                const newTotalDeduction = existingAmount + (deductionAmountThisMonth || 0);
                if (targetRowIndex !== -1) {
                  await fetch(`${PAYROLL_SCRIPT_URL}?action=updateCell&sheetName=PAYROLL&spreadsheetId=${SPREADSHEET_ID}&rowIndex=${targetRowIndex}&columnIndex=${targetColIdx + 1}&value=${newTotalDeduction}`);
                } else {
                  const newRowData = new Array(headers.length).fill('');
                  if (empIdIdx !== -1) newRowData[empIdIdx] = correctedEmpId;
                  if (nameIdx !== -1) newRowData[nameIdx] = selectedRequest.empName;
                  if (monthIdx !== -1) newRowData[monthIdx] = currentMonth;
                  if (yearIdx !== -1) newRowData[yearIdx] = currentYear;
                  newRowData[targetColIdx] = newTotalDeduction;
                  await fetch(PAYROLL_SCRIPT_URL, { method: 'POST', body: new URLSearchParams({ sheetName: 'PAYROLL', action: 'insert', spreadsheetId: SPREADSHEET_ID, rowData: JSON.stringify(newRowData) }) });
                }
              }
            }
            toast.success('Synced to PAYROLL successfully!', { id: 'payroll_sync' });
          } catch (e) {
            console.error("Payroll sync error:", e);
            toast.error('Approved, but PAYROLL sync failed.', { id: 'payroll_sync' });
          }
        }
        toast.success(`Request ${actionStatus.toLowerCase()} successfully!`);
        setShowModal(false);
        fetchData();
      } else {
        toast.error('Failed to update some fields');
      }
    } catch (error) {
      console.error('Update error:', error);
      toast.error('Something went wrong during update');
    } finally {
      setSubmitting(false);
    }
  };

  const getFilteredData = () => {
    let list = pendingRequests;
    if (activeTab === 'approved') list = approvedRequests;
    if (activeTab === 'rejected') list = rejectedRequests;
    return list.filter(item => 
      item.empName?.toString().toLowerCase().includes(searchTerm?.toLowerCase() || '') ||
      item.empId?.toString().toLowerCase().includes(searchTerm?.toLowerCase() || '') ||
      item.type?.toString().toLowerCase().includes(searchTerm?.toLowerCase() || '')
    );
  };

  const parseNumber = (val) => {
    if (val === null || val === undefined || val === '') return 0;
    if (typeof val === 'number') return val;
    const cleanStr = String(val).replace(/[^0-9.-]+/g, '');
    const num = Number(cleanStr);
    return isNaN(num) ? 0 : num;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-4 md:p-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200 text-white">
              <Wallet size={28} />
            </div>
            Admin Advance & Deductions
          </h1>
          <p className="text-gray-500 mt-2 font-medium">Review and manage employee advance requests.</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <nav className="flex space-x-4">
            <button
              onClick={() => setActiveTab('pending')}
              className={`py-2 px-4 text-center rounded-lg font-medium text-sm transition-colors ${
                activeTab === 'pending' 
                  ? 'bg-indigo-100 text-indigo-700' 
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              Pending ({pendingRequests.length})
            </button>
            <button
              onClick={() => setActiveTab('approved')}
              className={`py-2 px-4 text-center rounded-lg font-medium text-sm transition-colors ${
                activeTab === 'approved' 
                  ? 'bg-emerald-100 text-emerald-700' 
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              Approved ({approvedRequests.length})
            </button>
            <button
              onClick={() => setActiveTab('rejected')}
              className={`py-2 px-4 text-center rounded-lg font-medium text-sm transition-colors ${
                activeTab === 'rejected' 
                  ? 'bg-rose-100 text-rose-700' 
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              Rejected ({rejectedRequests.length})
            </button>
          </nav>

          <div className="relative max-w-sm w-full md:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by name, ID or type..."
              className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 w-full font-medium text-sm transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={() => {
              setTxView('search');
              setShowTxModal(true);
            }}
            className="flex items-center justify-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-lg shadow-indigo-200 transition-all active:scale-95 whitespace-nowrap"
          >
            <History size={18} />
            Transactions
          </button>
        </div>

        <div className="overflow-x-auto">
          {tableLoading ? (
            <div className="px-6 py-20 text-center">
              <div className="flex justify-center flex-col items-center">
                <Loader2 className="animate-spin text-indigo-500 mb-2" size={32} />
                <span className="text-gray-500 text-sm font-medium">Loading requests...</span>
              </div>
            </div>
          ) : getFilteredData().length === 0 ? (
            <div className="px-6 py-20 text-center text-gray-500 font-medium">
              No requests found.
            </div>
          ) : (
            <table className="min-w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Date & Time</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Employee</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">{activeTab === 'approved' ? 'Approv. Amount' : 'Req. Amount'}</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">{activeTab === 'approved' ? 'Approv. Deduction' : 'Req. Deduction'}</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Reason</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {getFilteredData().map((record, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(record.timestamp)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-bold text-gray-900">{record.empName}</div>
                      <div className="text-xs text-gray-500">{record.empId}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 font-bold text-gray-700 text-sm">
                        {getTypeIcon(record.type)}
                        {record.type}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className="font-bold text-indigo-600">₹{parseNumber(record.status === 'Approved' && record.apprAmount ? record.apprAmount : record.amount).toLocaleString()}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className="font-bold text-rose-500">₹{parseNumber(record.status === 'Approved' && record.apprMonthlyDeduction ? record.apprMonthlyDeduction : record.monthlyDeduction).toLocaleString()}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-[200px] truncate">
                      {record.reason}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button 
                        onClick={() => openReviewModal(record)}
                        className="px-4 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-bold rounded-lg transition-colors text-sm"
                      >
                        {activeTab === 'pending' ? 'Review' : 'Details'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-indigo-600 text-white shrink-0">
              <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
                <Wallet size={20} />
                {activeTab === 'pending' ? 'Review Request' : 'Request Details'}
              </h2>
              <button 
                onClick={() => setShowModal(false)}
                className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto">
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm font-bold text-gray-500">Employee</span>
                  <span className="text-sm font-black text-gray-900">{selectedRequest.empName} ({selectedRequest.empId})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-bold text-gray-500">Category</span>
                  <div className="flex items-center gap-1.5 text-sm font-black text-gray-900">
                    {getTypeIcon(selectedRequest.type)}
                    {selectedRequest.type}
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-bold text-gray-500">Requested Amount</span>
                  <span className="text-sm font-black text-indigo-600">₹{parseNumber(selectedRequest.amount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-bold text-gray-500">Req. Deduction/mo</span>
                  <span className="text-sm font-black text-rose-600">₹{parseNumber(selectedRequest.monthlyDeduction).toLocaleString()}</span>
                </div>
                <div>
                  <span className="block text-sm font-bold text-gray-500 mb-1">Reason</span>
                  <p className="text-sm text-gray-800 bg-white p-3 rounded-lg border border-gray-200">
                    {selectedRequest.reason}
                  </p>
                </div>
              </div>

              {activeTab === 'pending' || (activeTab !== 'pending' && selectedRequest.status === 'Approved') ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">Approved Amount (₹)</label>
                    <input 
                      type="number"
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold text-gray-900"
                      value={approvedAmount}
                      onChange={(e) => setApprovedAmount(e.target.value)}
                      disabled={activeTab !== 'pending' || submitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">Appr. Deduction (₹)</label>
                    <input 
                      type="number"
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold text-gray-900"
                      value={approvedMonthlyDeduction}
                      onChange={(e) => setApprovedMonthlyDeduction(e.target.value)}
                      disabled={activeTab !== 'pending' || submitting}
                    />
                  </div>
                </div>
              ) : null}

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">Admin Remarks</label>
                <textarea 
                  rows={2}
                  placeholder="Optional remarks..."
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium text-gray-800"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  disabled={activeTab !== 'pending' || submitting}
                />
              </div>
            </div>

            {activeTab === 'pending' && (
              <div className="p-6 border-t border-gray-100 bg-gray-50 shrink-0 grid grid-cols-2 gap-4">
                <button 
                  onClick={() => handleAction('Rejected')}
                  disabled={submitting}
                  className="py-3 px-4 bg-white border-2 border-rose-100 text-rose-600 hover:bg-rose-50 font-bold rounded-xl transition-colors disabled:opacity-50"
                >
                  Reject
                </button>
                <button 
                  onClick={() => handleAction('Approved')}
                  disabled={submitting}
                  className="py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-100 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <><Loader2 size={18} className="animate-spin" /> Processing...</>
                  ) : 'Approve'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Transaction History Modal */}
      {showTxModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-6xl max-h-[85vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-indigo-600 text-white">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-2xl">
                  {txView === 'search' ? <Search size={24} /> : <div className="cursor-pointer hover:scale-110 transition-transform" onClick={() => setTxView(txView === 'ledger' ? 'cards' : 'search')}><ArrowRightLeft size={24} className="rotate-180"/></div>}
                </div>
                <div>
                  <h2 className="text-xl font-black tracking-tight">
                    {txView === 'search' ? 'Employee Selector' : txView === 'cards' ? `Advances for ${selectedEmp?.name}` : 'Transaction Ledger'}
                  </h2>
                  <p className="text-xs text-indigo-100 font-medium uppercase tracking-widest">
                    {txView === 'search' ? 'Search employee to view history' : txView === 'cards' ? `ID: ${selectedEmp?.id}` : `${selectedAdv?.category} - ₹${selectedAdv?.amount.toLocaleString()}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowTxModal(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Sticky Search Box for Employee Selector */}
            {txView === 'search' && !txLoading && (
              <div className="px-8 py-4 bg-white border-b border-gray-50 flex justify-center z-10 shrink-0">
                <div className="relative w-full max-w-xl">
                  <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder="Search Employee Name or ID..."
                    className="w-full pl-16 pr-8 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all font-bold text-gray-800 text-sm shadow-sm"
                    value={txSearchTerm}
                    onChange={(e) => setTxSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="flex-1 overflow-auto p-4 md:p-8">
              {txLoading ? (
                <div className="flex flex-col items-center justify-center py-24 gap-4">
                  <Loader2 className="animate-spin text-indigo-600" size={48} />
                  <p className="text-gray-400 font-black uppercase tracking-widest text-sm animate-pulse">Fetching Ledger...</p>
                </div>
              ) : txView === 'search' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {employees.filter(emp => 
                    emp.name.toLowerCase().includes(txSearchTerm.toLowerCase()) || 
                    emp.id.toLowerCase().includes(txSearchTerm.toLowerCase())
                  ).map(emp => (
                      <button
                        key={emp.id}
                        onClick={() => {
                          setSelectedEmp(emp);
                          fetchTxData(emp);
                        }}
                        className="flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-2xl hover:border-indigo-600 hover:shadow-xl hover:shadow-indigo-50/50 transition-all group text-left"
                      >
                        <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                          <User size={24} />
                        </div>
                        <div>
                          <p className="font-black text-gray-900 leading-none">{emp.name}</p>
                          <p className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-widest">({emp.id})</p>
                        </div>
                      </button>
                    ))}
                  </div>
              ) : txView === 'cards' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {allAdvancesForEmp.length === 0 ? (
                    <div className="col-span-full text-center py-24">
                      <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-sm">
                        <AlertCircle size={32} className="text-gray-300" />
                      </div>
                      <p className="text-gray-400 font-black uppercase tracking-widest text-xs">No approved advances found for this employee</p>
                    </div>
                  ) : (
                    allAdvancesForEmp.map((adv) => (
                      <div
                        key={adv.id}
                        onClick={() => {
                          setSelectedAdv(adv);
                          setTxView('ledger');
                        }}
                        className="group relative bg-white p-6 rounded-[2rem] border-2 border-gray-100 hover:border-indigo-600 hover:shadow-2xl hover:shadow-indigo-100 transition-all cursor-pointer overflow-hidden"
                      >
                        <div className={`absolute top-0 right-0 w-20 h-20 ${adv.category === 'Extra Advance' ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'} rounded-bl-[2.5rem] flex items-center justify-center opacity-10 group-hover:opacity-100 transition-all duration-500`}>
                          {getTypeIcon(adv.category)}
                        </div>
                        <div className="space-y-4">
                          <div className="flex items-center gap-2">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${adv.category === 'Extra Advance' ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'}`}>
                              {adv.category}
                            </span>
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${adv.pending <= 0 ? 'bg-gray-100 text-gray-400 border border-gray-200' : 'bg-rose-100 text-rose-600 border border-rose-200 animate-pulse'}`}>
                              {adv.pending <= 0 ? 'Closed' : 'Running'}
                            </span>
                          </div>
                          <h4 className="text-2xl font-black text-gray-900">₹{adv.amount.toLocaleString()}</h4>
                          <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                            <div>
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pending</p>
                              <p className="text-sm font-black text-rose-500">₹{adv.pending.toLocaleString()}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Approved On</p>
                              <p className="text-sm font-bold text-gray-600">{formatDate(adv.date)}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="animate-in slide-in-from-right-4 duration-500">
                   {(() => {
                    const isExtra = selectedAdv.category === 'Extra Advance';
                    const filteredTx = transactions
                      .map(tx => ({
                        ...tx,
                        deduction: isExtra ? tx.extraDed : tx.fixDed
                      }))
                      .filter(tx => tx.deduction > 0);

                    const totalDeductions = filteredTx.reduce((sum, tx) => sum + tx.deduction, 0);
                    const currentCalculatedBalance = Math.max(0, selectedAdv.amount - totalDeductions);

                    return (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                          <div className="bg-emerald-50 p-8 rounded-[2.5rem] border-2 border-emerald-100/50 shadow-sm shadow-emerald-100/20">
                            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em] mb-2">Total Approved Amount</p>
                            <h3 className="text-4xl font-black text-emerald-700">₹{selectedAdv.amount.toLocaleString()}</h3>
                          </div>
                          <div className="bg-rose-50 p-8 rounded-[2.5rem] border-2 border-rose-100/50 shadow-sm shadow-rose-100/20">
                            <p className="text-[10px] font-black text-rose-600 uppercase tracking-[0.3em] mb-2">Current Pending Balance</p>
                            <h3 className="text-4xl font-black text-rose-700">₹{currentCalculatedBalance.toLocaleString()}</h3>
                          </div>
                        </div>

                        <div className="overflow-x-auto rounded-[2.5rem] border border-gray-100 shadow-sm">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-gray-50/80">
                                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100"><div className="flex items-center gap-2"><Calendar size={14}/> Transaction Date</div></th>
                                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100 text-right">Deduction Amount</th>
                                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100 text-right">Remaining Pending</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {(() => {
                                const sortedTx = [...filteredTx].sort((a, b) => new Date(a.date) - new Date(b.date));
                                let runningBalance = selectedAdv.amount;
                                
                                const historyRows = sortedTx.map((tx) => {
                                  runningBalance -= tx.deduction;
                                  return { ...tx, calculatedPending: runningBalance };
                                });

                                const displayList = [...historyRows].reverse();

                                if (displayList.length === 0) {
                                  return (
                                    <tr>
                                      <td colSpan="3" className="px-8 py-16 text-center text-gray-400 font-bold uppercase tracking-widest text-xs italic">
                                        No deductions recorded for this advance yet.
                                      </td>
                                    </tr>
                                  );
                                }

                                return displayList.map((tx, idx) => (
                                  <tr key={idx} className="group hover:bg-gray-50/20 transition-all">
                                    <td className="px-8 py-6 whitespace-nowrap">
                                      <span className="text-sm font-bold text-gray-600 tabular-nums">{formatDateTimeLedger(tx.date)}</span>
                                    </td>
                                    <td className="px-8 py-6 whitespace-nowrap text-right">
                                      <span className="font-black text-xl text-rose-600">
                                        ₹{tx.deduction.toLocaleString()}
                                      </span>
                                    </td>
                                    <td className="px-8 py-6 whitespace-nowrap text-right">
                                      <span className="px-5 py-2 bg-gray-100 rounded-2xl font-black text-gray-700 text-sm">
                                        ₹{Math.max(0, tx.calculatedPending).toLocaleString()}
                                      </span>
                                    </td>
                                  </tr>
                                ));
                              })()}
                            </tbody>
                          </table>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>

            <div className="px-8 py-6 border-t border-gray-50 flex items-center justify-between bg-gray-50/50">
              {txView !== 'search' && (
                <button
                  onClick={() => setTxView(txView === 'ledger' ? 'cards' : 'search')}
                  className="px-6 py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-black rounded-2xl shadow-sm transition-all active:scale-95 text-sm flex items-center gap-2"
                >
                  <ArrowRightLeft size={18} className="rotate-180" />
                  Back
                </button>
              )}
              <button
                onClick={() => setShowTxModal(false)}
                className="ml-auto px-8 py-3 bg-white border border-gray-200 hover:border-gray-400 text-gray-700 font-black rounded-2xl shadow-sm transition-all active:scale-95 text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAdvance;
