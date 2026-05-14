import React, { useState, useEffect, useMemo } from 'react';
import { Search, Clock, FileText, Truck, CheckCircle, Clock4, History } from 'lucide-react';
import { format } from 'date-fns';
import { indentService } from '../../services/purchase_management/indentService';

export const TransporterVerification: React.FC = () => {
  const [indents, setIndents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');

  useEffect(() => {
    const fetchIndents = async () => {
      try {
        setLoading(true);
        const data = await indentService.getIndents();
        setIndents(data);
      } catch (err) {
        console.error("Failed to fetch indents for transporter verification", err);
      } finally {
        setLoading(false);
      }
    };
    fetchIndents();
  }, []);

  const hasValue = (s?: string) => 
    typeof s === "string" && s.trim() !== "" && s.toLowerCase() !== "null" && s.toLowerCase() !== "undefined";

  const filteredIndents = useMemo(() => {
    return indents.filter(item => {
      // Visibility Condition: Planned 4 and Actual 4 must be NOT NULL (Same as Trader)
      const isVisible = hasValue(item.planned4) && hasValue(item.actual4);
      if (!isVisible) return false;

      // History Condition: Shift to history if Transporter Status is "Pickup"
      const isHistory = String(item.transporterStatus || "").trim().toLowerCase() === "pickup";
      
      if (activeTab === 'pending' && isHistory) return false;
      if (activeTab === 'history' && !isHistory) return false;

      const searchLower = searchTerm.toLowerCase();
      return (
        item.indentNumber?.toLowerCase().includes(searchLower) ||
        item.itemName?.toLowerCase().includes(searchLower) ||
        item.brandName?.toLowerCase().includes(searchLower) ||
        item.traderName?.toLowerCase().includes(searchLower) ||
        item.partyName?.toLowerCase().includes(searchLower) ||
        item.shopName?.toLowerCase().includes(searchLower)
      );
    });
  }, [indents, searchTerm, activeTab]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr || dateStr.trim() === "" || dateStr.toLowerCase() === "null") return "-";
    try {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return format(date, 'dd/MM/yyyy');
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  const formatNum = (val: any) => {
    if (val === undefined || val === null || val === "" || String(val).toLowerCase() === "null") return "-";
    const num = Number(val);
    return isNaN(num) ? val : num.toFixed(2);
  };

  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-screen w-full lg:w-[calc(100vw-280px)]">
      {/* Header Section */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Transporter Verification</h1>
          <p className="text-slate-500 mt-1 flex items-center gap-2">
            <Clock4 className="w-4 h-4" />
            Monitoring vehicle pickup and logistics status.
          </p>
        </div>
        
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            <input
              type="text"
              placeholder="Search all columns..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full md:w-80 pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none shadow-sm transition-all text-slate-600"
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setActiveTab('pending')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all ${
            activeTab === 'pending'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-100'
          }`}
        >
          <Clock className="w-5 h-5" />
          Pending Records
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all ${
            activeTab === 'history'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-100'
          }`}
        >
          <History className="w-5 h-5" />
          History (Picked Up)
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
          <div className="animate-spin h-12 w-12 border-4 border-indigo-600 border-t-transparent rounded-full mb-4"></div>
          <p className="text-slate-500 font-medium animate-pulse">Fetching latest data...</p>
        </div>
      ) : filteredIndents.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 text-center border border-slate-100 shadow-sm">
          <div className="bg-indigo-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            {activeTab === 'pending' ? <Truck className="text-indigo-300 w-10 h-10" /> : <CheckCircle className="text-emerald-300 w-10 h-10" />}
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">
            {activeTab === 'pending' ? 'No Pending Records' : 'No History Found'}
          </h3>
          <p className="text-slate-500 max-w-sm mx-auto">
            {activeTab === 'pending' 
              ? 'Currently no orders match the required verification criteria.' 
              : 'Records will appear here once Transporter Status is marked as "Pickup".'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100">
                  <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Indent #</th>
                  <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Appr. Date</th>
                  <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">SKU</th>
                  <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Item</th>
                  <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Brand</th>
                  <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">MOQ</th>
                  <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Max</th>
                  <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Stock</th>
                  <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Qty (Pcs)</th>
                  <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Trader</th>
                  <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Size</th>
                  <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Box</th>
                  <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Shop</th>
                  <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Trader Status</th>
                  <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Dispatch Date</th>
                  <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredIndents.map((item, idx) => (
                  <tr key={`${item.id}-${idx}`} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-4 py-4 font-bold text-indigo-600 whitespace-nowrap">{item.indentNumber}</td>
                    <td className="px-4 py-4 text-slate-600 whitespace-nowrap">{formatDate(item.approvalDate)}</td>
                    <td className="px-4 py-4 text-slate-500 font-mono text-xs">{item.skuCode}</td>
                    <td className="px-4 py-4">
                      <div className="font-semibold text-slate-900">{item.itemName}</div>
                    </td>
                    <td className="px-4 py-4 text-slate-600">{item.brandName}</td>
                    <td className="px-4 py-4 text-center font-medium text-slate-700">{formatNum(item.moq)}</td>
                    <td className="px-4 py-4 text-center font-medium text-slate-700">{formatNum(item.maxLevel)}</td>
                    <td className="px-4 py-4 text-center">
                      <span className={`px-2 py-1 rounded-lg text-xs font-bold ${Number(item.closingStock) < Number(item.moq) ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-700'}`}>
                        {formatNum(item.closingStock)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center font-bold text-slate-900 bg-slate-50/30">{formatNum(item.reorderQuantityPcs)}</td>
                    <td className="px-4 py-4 font-medium text-slate-700">{item.traderName || item.partyName}</td>
                    <td className="px-4 py-4 text-slate-500">{item.sizeML} ml</td>
                    <td className="px-4 py-4 text-center font-medium text-indigo-700">{formatNum(item.reorderQuantityBox)}</td>
                    <td className="px-4 py-4 font-medium text-slate-900 whitespace-nowrap">{item.shopName}</td>
                    <td className="px-4 py-4">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                        item.transporterStatus === 'Pickup' ? 'bg-emerald-100 text-emerald-700' : 
                        item.transporterStatus === 'Accepted' ? 'bg-blue-100 text-blue-700' : 
                        item.transporterStatus === 'Rejected' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {item.transporterStatus || 'Pending'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                        item.traderStatus === 'Accepted' ? 'bg-blue-100 text-blue-700' : 
                        item.traderStatus === 'Rejected' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {item.traderStatus || 'Waiting'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-slate-600 whitespace-nowrap">
                      {formatDate(item.dispatchDate)}
                    </td>
                    <td className="px-4 py-4 text-slate-500 max-w-xs truncate" title={item.transporterRemarks}>
                      {item.transporterRemarks || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
