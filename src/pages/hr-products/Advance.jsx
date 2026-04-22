import React, { useState, useEffect } from 'react';
import { Search, X, Check, Clock, Wallet, Banknote, Stethoscope, Hammer, Loader2, History, ArrowRightLeft, Calendar, User, AlertCircle, Plus, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { SCRIPT_URLS } from '../../utils/envConfig';

const Advance = () => {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [data, setData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : null;
  const currentEmployeeId = localStorage.getItem('employeeId') || user?.joiningNo || user?.EmployeeID || user?.employeeId || '';

  // Transaction Modal State
  const [showTxModal, setShowTxModal] = useState(false);
  const [txView, setTxView] = useState('cards'); // 'cards', 'ledger'
  const [allAdvancesForEmp, setAllAdvancesForEmp] = useState([]);
  const [selectedAdv, setSelectedAdv] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [txLoading, setTxLoading] = useState(false);

  const [employees, setEmployees] = useState([]);
  const [formData, setFormData] = useState({
    type: 'Advance',
    amount: '',
    monthlyDeduction: '',
    reason: '',
    selectedEmployeeId: currentEmployeeId || '',
    selectedEmployeeName: user?.Name || user?.name || user?.candidateName || ''
  });

  const SCRIPT_URL = SCRIPT_URLS.HR_PAYROLL;
  const SPREADSHEET_ID = '1lg8cvRaYHpnR75bWxHoh-a30-gGL94-_WAnE7Zue6r8';

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${SCRIPT_URL}?sheet=ADVANCE&action=fetch&spreadsheetId=${SPREADSHEET_ID}`);
      const result = await response.json();
      if (result.success) {
        const rawRows = result.data || [];
        const dataRows = (rawRows.length > 0 && Array.isArray(rawRows[0])) ? rawRows.slice(1) : rawRows;
        
        const userName = user?.Name || user?.name || user?.candidateName || '';
        const employeeRecords = dataRows
          .filter(row => 
            user?.Admin === 'Yes' || 
            row[1]?.toString().trim().toLowerCase() === currentEmployeeId?.toString().trim().toLowerCase() ||
            row[2]?.toString().trim().toLowerCase() === userName.toString().trim().toLowerCase()
          )
          .map((row, idx) => ({
            id: idx,
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
            adminRemarks: row[10] || '',
            deductionThisMonth: row[12] || ''
          }))
          .reverse();

        setData(employeeRecords);
      }
    } catch (error) {
      console.error('Error fetching advance data:', error);
      toast.error('Failed to load records from ADVANCE sheet');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await fetch(`${SCRIPT_URLS.HR_JOINING}?sheet=JOINING&action=fetch&spreadsheetId=1d10niZ9MX1DIVpSqplzANqPylPTYiXq7TYSYSRNaBUg`);
      const result = await response.json();
      if (result.success && result.data) {
        const emps = result.data.slice(6)
          .filter(row => row[4] && row[4].toString().trim() !== '')
          .map(row => ({
            id: row[1] || '',
            name: row[4].toString().trim()
          }));
        setEmployees(emps);

        const userName = user?.Name || user?.name || user?.candidateName || '';
        if (user?.Admin !== 'Yes' && userName) {
          const matchingEmp = emps.find(e => e.name.toLowerCase() === userName.toLowerCase().trim());
          if (matchingEmp) {
            setFormData(prev => ({
              ...prev,
              selectedEmployeeId: matchingEmp.id,
              selectedEmployeeName: matchingEmp.name
            }));
          }
        }
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const fetchTxData = async () => {
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
          .filter(row => row[1]?.toString().trim() === currentEmployeeId?.toString().trim() && row[6]?.toString().trim() === 'Approved')
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
          .filter(row => row[1]?.toString().trim() === currentEmployeeId?.toString().trim())
          .map(row => ({
            empId: row[1],
            fixDed: parseFloat(row[13] || 0),
            extraDed: parseFloat(row[15] || 0),
            date: row[19] || row[0]
          }));
        
        setTransactions(empTx);
      }
    } catch (err) {
      console.error('Error fetching transaction data:', err);
      toast.error('Failed to load transaction details');
    } finally {
      setTxLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchEmployees();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.amount || !formData.reason || !formData.selectedEmployeeId) {
      toast.error('Please fill in all fields');
      return;
    }

    setSubmitting(true);
    try {
      const now = new Date();
      const timestamp = now.toISOString();
      
      const rowData = [
        timestamp,
        formData.selectedEmployeeId,
        formData.selectedEmployeeName,
        formData.amount,
        formData.monthlyDeduction,
        formData.reason,
        'Pending',
        formData.type
      ];

      const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        body: new URLSearchParams({
          sheetName: 'ADVANCE',
          action: 'insert',
          spreadsheetId: SPREADSHEET_ID,
          rowData: JSON.stringify(rowData)
        })
      });

      const result = await response.json();
      if (result.success) {
        toast.success('Request submitted successfully!');
        setShowModal(false);
        setFormData({ 
          type: 'Advance', 
          amount: '', 
          monthlyDeduction: '', 
          reason: '',
          selectedEmployeeId: currentEmployeeId || '',
          selectedEmployeeName: user?.Name || user?.name || user?.candidateName || ''
        });
        fetchData();
      } else {
        toast.error(result.error || 'Failed to submit request');
      }
    } catch (error) {
      console.error('Submission error:', error);
      toast.error('Something went wrong!');
    } finally {
      setSubmitting(false);
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

  const getStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'rejected': return 'bg-rose-100 text-rose-700 border-rose-200';
      default: return 'bg-amber-100 text-amber-700 border-amber-200';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'Medical Amount': return <Stethoscope size={16} className="text-blue-500" />;
      case 'Brackage': return <Hammer size={16} className="text-orange-500" />;
      default: return <Banknote size={16} className="text-emerald-500" />;
    }
  };

  const parseNumber = (val) => {
    if (val === null || val === undefined || val === '') return 0;
    if (typeof val === 'number') return val;
    const cleanStr = String(val).replace(/[^0-9.-]+/g, '');
    const num = Number(cleanStr);
    return isNaN(num) ? 0 : num;
  };

  const filteredData = data.filter(record => 
    record.type?.toString().toLowerCase().includes(searchTerm?.toLowerCase() || '') ||
    record.reason?.toString().toLowerCase().includes(searchTerm?.toLowerCase() || '')
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-4 md:p-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200 text-white">
              <Wallet size={28} />
            </div>
            Advance & Deductions
          </h1>
          <p className="text-gray-500 mt-2 font-medium">Manage and track your advance, brackage, and medical requests.</p>
        </div>
        
        <div className="flex gap-4">
          <button
            onClick={() => {
              setTxView('cards');
              setShowTxModal(true);
              fetchTxData();
            }}
            className="flex items-center justify-center gap-2 px-6 py-3.5 bg-white border-2 border-gray-100 hover:border-indigo-600 hover:text-indigo-600 text-gray-600 font-bold rounded-2xl shadow-sm transition-all active:scale-95 group"
          >
            <History size={20} className="group-hover:rotate-[-30deg] transition-transform duration-300" />
            Transaction Ledger
          </button>
          <button 
            onClick={() => setShowModal(true)}
            className="flex items-center justify-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-xl shadow-indigo-100 transition-all active:scale-95 group"
          >
            <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
            New Request
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Advance Requests', value: data.filter(r => r.type === 'Advance').length, color: 'bg-emerald-500' },
          { label: 'Brackage Reports', value: data.filter(r => r.type === 'Brackage').length, color: 'bg-orange-500' },
          { label: 'Medical Requests', value: data.filter(r => r.type === 'Medical Amount').length, color: 'bg-blue-500' }
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className={`w-2 h-10 rounded-full ${stat.color}`}></div>
            <div>
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest">{stat.label}</p>
              <h3 className="text-2xl font-black text-gray-900">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
        <div className="p-8 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-xl font-black text-gray-800">Request History</h2>
          <div className="relative max-w-sm">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search category or reason..."
              className="pl-12 pr-6 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 w-full font-medium text-sm transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Date & Time</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Category</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Amount</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Monthly Deduction</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Reason</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="animate-spin text-indigo-600" size={32} />
                      <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Fetching records...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-8 py-20 text-center">
                    <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No records found</p>
                  </td>
                </tr>
              ) : filteredData.map((record, idx) => (
                <tr key={idx} className="group hover:bg-gray-50/50 transition-colors">
                  <td className="px-8 py-5 whitespace-nowrap text-xs font-bold text-gray-500">{formatDate(record.timestamp)}</td>
                  <td className="px-8 py-5 whitespace-nowrap">
                    <div className="flex items-center gap-2 font-black text-gray-900 text-sm">
                      {getTypeIcon(record.type)}
                      {record.type}
                    </div>
                  </td>
                  <td className="px-8 py-5 whitespace-nowrap">
                    <span className="font-black text-indigo-600 text-lg">₹{parseNumber(record.status === 'Approved' && record.apprAmount ? record.apprAmount : record.amount).toLocaleString()}</span>
                  </td>
                  <td className="px-8 py-5 whitespace-nowrap">
                    <span className="font-black text-rose-500 text-sm">₹{parseNumber(record.status === 'Approved' && record.apprMonthlyDeduction ? record.apprMonthlyDeduction : record.monthlyDeduction).toLocaleString()} / month</span>
                  </td>
                  <td className="px-8 py-5 text-sm text-gray-600 font-medium max-w-md truncate">
                    {record.reason}
                  </td>
                  <td className="px-8 py-5 whitespace-nowrap text-center">
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusStyle(record.status)}`}>
                      {record.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-8 py-8 border-b border-gray-100 flex items-center justify-between bg-indigo-600 text-white">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-2xl">
                  <Plus size={24} />
                </div>
                <h2 className="text-xl font-black tracking-tight">New Request</h2>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              {user?.Admin === 'Yes' && (
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Select Employee</label>
                  <select
                    className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-medium text-gray-700 appearance-none"
                    value={formData.selectedEmployeeId}
                    onChange={(e) => {
                      const emp = employees.find(emp => emp.id === e.target.value);
                      setFormData({
                        ...formData,
                        selectedEmployeeId: emp ? emp.id : '',
                        selectedEmployeeName: emp ? emp.name : ''
                      });
                    }}
                    required
                  >
                    <option value="" disabled>Select Employee...</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name} ({emp.id})</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Select Category</label>
                <div className="grid grid-cols-1 gap-3">
                  {[
                    { id: 'Advance', icon: Banknote, color: 'text-emerald-500' },
                    { id: 'Extra Advance', icon: Plus, color: 'text-indigo-500' },
                    { id: 'Brackage', icon: Hammer, color: 'text-orange-500' },
                    { id: 'Medical Amount', icon: Stethoscope, color: 'text-blue-500' }
                  ].map((item) => (
                    <label 
                      key={item.id}
                      className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                        formData.type === item.id 
                          ? 'border-indigo-600 bg-indigo-50/50' 
                          : 'border-gray-100 hover:border-gray-200 bg-gray-50/30'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-xl bg-white shadow-sm ${item.color}`}>
                          <item.icon size={20} />
                        </div>
                        <span className="font-black text-gray-900">{item.id}</span>
                      </div>
                      <input 
                        type="radio" 
                        name="type" 
                        value={item.id}
                        checked={formData.type === item.id}
                        onChange={(e) => setFormData({...formData, type: e.target.value})}
                        className="hidden"
                      />
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${formData.type === item.id ? 'border-indigo-600' : 'border-gray-300'}`}>
                        {formData.type === item.id && <div className="w-2.5 h-2.5 rounded-full bg-indigo-600"></div>}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Request Amount (₹)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      placeholder="0.00"
                      className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-black text-gray-900 text-xl"
                      value={formData.amount}
                      onChange={(e) => setFormData({...formData, amount: e.target.value})}
                      required
                    />
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-300 font-black text-xl">₹</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Monthly Deduction (₹)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      placeholder="0.00"
                      className="w-full px-6 py-4 bg-rose-50/30 border-none rounded-2xl focus:ring-2 focus:ring-rose-500 font-black text-rose-700 text-xl"
                      value={formData.monthlyDeduction}
                      onChange={(e) => setFormData({...formData, monthlyDeduction: e.target.value})}
                      required
                    />
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 text-rose-200 font-black text-xl">₹</div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Reason / Explanation</label>
                <textarea 
                  rows={3}
                  placeholder="Tell us why you need this..."
                  className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-medium text-gray-700"
                  value={formData.reason}
                  onChange={(e) => setFormData({...formData, reason: e.target.value})}
                  required
                />
              </div>

              <button 
                type="submit"
                disabled={submitting}
                className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-[2rem] shadow-xl shadow-indigo-100 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {submitting ? (
                  <><Loader2 className="animate-spin" size={24} /> Processing...</>
                ) : (
                  <><CheckCircle2 size={24} /> Confirm Request</>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {showTxModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-5xl max-h-[85vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-indigo-600 text-white">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-2xl">
                  {txView === 'cards' ? <History size={24} /> : <div className="cursor-pointer hover:scale-110 transition-transform" onClick={() => setTxView('cards')}><ArrowRightLeft size={24} className="rotate-180"/></div>}
                </div>
                <div>
                  <h2 className="text-xl font-black tracking-tight">
                    {txView === 'cards' ? 'Your Active Advances' : 'Transaction Ledger'}
                  </h2>
                  <p className="text-xs text-indigo-100 font-medium uppercase tracking-widest">
                    {txView === 'cards' ? 'Track your pending balances' : `${selectedAdv?.category} - ₹${selectedAdv?.amount.toLocaleString()}`}
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

            <div className="flex-1 overflow-auto p-4 md:p-8">
              {txLoading ? (
                <div className="flex flex-col items-center justify-center py-24 gap-4">
                  <Loader2 className="animate-spin text-indigo-600" size={48} />
                  <p className="text-gray-400 font-black uppercase tracking-widest text-sm animate-pulse">Fetching Ledger...</p>
                </div>
              ) : txView === 'cards' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {allAdvancesForEmp.length === 0 ? (
                    <div className="col-span-full text-center py-24">
                      <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-sm">
                        <AlertCircle size={32} className="text-gray-300" />
                      </div>
                      <p className="text-gray-400 font-black uppercase tracking-widest text-xs">No approved advances found</p>
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
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${adv.category === 'Extra Advance' ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'}`}>
                            {adv.category}
                          </span>
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
              {txView === 'ledger' && (
                <button
                  onClick={() => setTxView('cards')}
                  className="px-6 py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-black rounded-2xl shadow-sm transition-all active:scale-95 text-sm flex items-center gap-2"
                >
                  <ArrowRightLeft size={18} className="rotate-180" />
                  Back to List
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

export default Advance;
