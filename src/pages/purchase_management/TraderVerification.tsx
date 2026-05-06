import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Search, Clock, FileText, AlertCircle } from 'lucide-react';
import { indentService } from '../../services/purchase_management/indentService';

export const TraderVerification: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [submitting, setSubmitting] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const data = await indentService.getIndents();
        // Filter for orders that are approved but not yet confirmed by trader
        // For demonstration, we'll show all approved orders
        const approvedOrders = data.filter(i => i.approved === "Yes" || i.status === "approved");
        setOrders(approvedOrders);
      } catch (err) {
        console.error("Failed to fetch orders for trader verification", err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const handleAction = async (orderId: string, status: 'Accepted' | 'Rejected') => {
    setSubmitting(orderId);
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      alert(`Order ${orderId} has been ${status} by Trader.`);
      setOrders(prev => prev.filter(o => o.id !== orderId));
    } finally {
      setSubmitting(null);
    }
  };

  const filteredOrders = orders.filter(o => 
    o.indentNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.itemName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 bg-gray-50 min-h-screen w-full lg:w-[calc(100vw-280px)]">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Trader Verification</h1>
        <p className="text-gray-500 mt-1">Confirm and verify order acceptance from traders.</p>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search by PO number or Item..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none shadow-sm transition-all"
        />
      </div>

      {loading ? (
        <div className="flex justify-center p-20">
          <div className="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full"></div>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-200 shadow-sm">
          <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="text-gray-400 w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">No Pending Verifications</h3>
          <p className="text-gray-500 mt-1">All orders have been processed or no approved orders found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {filteredOrders.map(order => (
            <div key={order.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex flex-col md:flex-row justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded uppercase tracking-wider">
                        Pending Confirmation
                      </span>
                      <span className="text-gray-400 text-xs font-medium flex items-center gap-1">
                        <Clock className="w-3 h-3" /> 2 hours ago
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-1">{order.itemName}</h3>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                      <p><span className="font-medium">PO:</span> {order.indentNumber}</p>
                      <p><span className="font-medium">Shop:</span> {order.shopName}</p>
                      <p><span className="font-medium">Qty:</span> {order.reorderQuantityPcs} Bottles</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleAction(order.id, 'Rejected')}
                      disabled={!!submitting}
                      className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-xl font-bold transition-colors disabled:opacity-50"
                    >
                      <XCircle className="w-5 h-5" />
                      Reject
                    </button>
                    <button
                      onClick={() => handleAction(order.id, 'Accepted')}
                      disabled={!!submitting}
                      className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white hover:bg-green-700 rounded-xl font-bold shadow-sm transition-all disabled:opacity-50"
                    >
                      <CheckCircle className="w-5 h-5" />
                      {submitting === order.id ? 'Processing...' : 'Accept Order'}
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 px-6 py-3 border-t border-gray-100 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-blue-500" />
                <p className="text-xs text-gray-500 font-medium">Please verify stock availability before accepting.</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
