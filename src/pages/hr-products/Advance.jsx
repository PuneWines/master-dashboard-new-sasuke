import { toast } from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import { 
  Wallet, 
  Plus, 
  Search, 
  Filter, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Loader2,
  Banknote,
  Stethoscope,
  Hammer
} from 'lucide-react';
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
        // Skip header if it exists
        const dataRows = (rawRows.length > 0 && Array.isArray(rawRows[0])) ? rawRows.slice(1) : rawRows;
        
        // Filter for current employee ONLY if not admin. Match by ID or Name to catch old records.
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
          .reverse(); // Latest first

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
      const response = await fetch('https://docs.google.com/spreadsheets/d/1lg8cvRaYHpnR75bWxHoh-a30-gGL94-_WAnE7Zue6r8/export?format=csv&gid=1348558181');
      const csvText = await response.text();
      const rows = csvText.split('\n');
      const empData = [];
      for (let i = 1; i < rows.length; i++) {
        const columns = rows[i].split(',');
        if (columns.length >= 2 && columns[0].trim()) {
          empData.push({
            id: columns[0].trim(),
            name: columns[1].trim()
          });
        }
      }
      setEmployees(empData);

      // Auto-correct employee ID for non-admins based on Master Sheet name matching
      const userName = user?.Name || user?.name || user?.candidateName || '';
      if (user?.Admin !== 'Yes' && userName) {
        const matchingEmp = empData.find(e => e.name.toLowerCase() === userName.toLowerCase().trim());
        if (matchingEmp) {
          setFormData(prev => ({
            ...prev,
            selectedEmployeeId: matchingEmp.id,
            selectedEmployeeName: matchingEmp.name
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  useEffect(() => {
    fetchData();
    fetchEmployees(); // Fetch for everyone to ensure valid master sheet IDs are used
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
      const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      
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

  const filteredData = data.filter(record => 
    record.type?.toString().toLowerCase().includes(searchTerm?.toLowerCase() || '') ||
    record.reason?.toString().toLowerCase().includes(searchTerm?.toLowerCase() || '')
  );

  const getStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'rejected': return 'bg-rose-100 text-rose-700 border-rose-200';
      default: return 'bg-amber-100 text-amber-700 border-amber-200';
    }
  };

  const parseNumber = (val) => {
    if (val === null || val === undefined || val === '') return 0;
    if (typeof val === 'number') return val;
    const cleanStr = String(val).replace(/[^0-9.-]+/g, '');
    const num = Number(cleanStr);
    return isNaN(num) ? 0 : num;
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'Medical Amount': return <Stethoscope size={16} className="text-blue-500" />;
      case 'Brackage': return <Hammer size={16} className="text-orange-500" />;
      default: return <Banknote size={16} className="text-emerald-500" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-4 md:p-8 animate-in fade-in duration-500">
      {/* Header Section */}
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
        
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center justify-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-xl shadow-indigo-100 transition-all active:scale-95 group"
        >
          <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
          New Request
        </button>
      </div>

      {/* Stats Quick View */}
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

      {/* Main Content Card */}
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
                  <td colSpan="5" className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="animate-spin text-indigo-600" size={32} />
                      <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Fetching records...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-8 py-20 text-center">
                    <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No records found</p>
                  </td>
                </tr>
              ) : filteredData.map((record, idx) => (
                <tr key={idx} className="group hover:bg-gray-50/50 transition-colors">
                  <td className="px-8 py-5 whitespace-nowrap text-xs font-bold text-gray-500">{record.timestamp}</td>
                  <td className="px-8 py-5 whitespace-nowrap">
                    <div className="flex items-center gap-2 font-black text-gray-900 text-sm">
                      {getTypeIcon(record.type)}
                      {record.type}
                    </div>
                  </td>
                  <td className="px-8 py-5 whitespace-nowrap">
                    <span className="font-black text-indigo-600 text-lg">₹{parseNumber(record.amount).toLocaleString()}</span>
                  </td>
                  <td className="px-8 py-5 whitespace-nowrap">
                    <span className="font-black text-rose-500 text-sm">₹{parseNumber(record.deductionThisMonth || record.apprMonthlyDeduction || record.monthlyDeduction).toLocaleString()} / month</span>
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

      {/* Request Modal */}
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

              {/* Type Selection - Radio Cards */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Select Category</label>
                <div className="grid grid-cols-1 gap-3">
                  {[
                    { id: 'Advance', icon: Banknote, color: 'text-emerald-500' },
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

               {/* Amount & Deduction Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Amount Input */}
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

                {/* Monthly Deduction Input */}
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

              {/* Reason Input */}
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
                  <>
                    <Loader2 className="animate-spin" size={24} />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={24} />
                    Confirm Request
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Advance;
