import React, { useState, useEffect } from 'react';
import { Truck, MapPin, Clock, Search, CheckCircle, Navigation, AlertTriangle } from 'lucide-react';
import { indentService } from '../../services/purchase_management/indentService';

export const TransporterVerification: React.FC = () => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [submitting, setSubmitting] = useState<string | null>(null);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoading(true);
        const data = await indentService.getIndents();
        // Mock filter for items ready for pickup
        const pickupReady = data.filter(i => i.approved === "Yes" || i.status === "approved").slice(0, 5);
        setTasks(pickupReady);
      } catch (err) {
        console.error("Failed to fetch transporter tasks", err);
      } finally {
        setLoading(false);
      }
    };
    fetchTasks();
  }, []);

  const handlePickup = async (id: string) => {
    setSubmitting(id);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      alert(`Pickup confirmed for order ${id}.`);
      setTasks(prev => prev.filter(t => t.id !== id));
    } finally {
      setSubmitting(null);
    }
  };

  const filteredTasks = tasks.filter(t => 
    t.shopName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.indentNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 bg-slate-50 min-h-screen w-full lg:w-[calc(100vw-280px)]">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Transporter Verification</h1>
        <p className="text-slate-500 mt-1">Manage and verify vehicle pickup status for orders.</p>
      </div>

      {/* Search Bar */}
      <div className="mb-8 relative max-w-xl">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search by Shop, Order ID or Transporter..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all text-slate-700"
        />
      </div>

      {loading ? (
        <div className="flex justify-center p-20">
          <div className="animate-spin h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full"></div>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 text-center border border-slate-100 shadow-sm">
          <div className="bg-indigo-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Truck className="text-indigo-400 w-10 h-10" />
          </div>
          <h3 className="text-2xl font-bold text-slate-900">No Pickups Assigned</h3>
          <p className="text-slate-500 mt-2 max-w-md mx-auto">There are currently no orders assigned for pickup in your region.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredTasks.map(task => (
            <div key={task.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-xl transition-all duration-300 group">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-indigo-600 p-3 rounded-2xl text-white group-hover:scale-110 transition-transform">
                    <Truck className="w-6 h-6" />
                  </div>
                  <span className="bg-amber-100 text-amber-700 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-amber-200">
                    Assigned for Pickup
                  </span>
                </div>

                <h3 className="text-xl font-bold text-slate-900 mb-1">{task.shopName}</h3>
                <div className="space-y-2 mb-6">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <span>Pune, MH - Distribution Center</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span>Pickup Window: Today, 2:00 PM - 5:00 PM</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600 font-mono">
                    <Navigation className="w-4 h-4 text-slate-400" />
                    <span>{task.indentNumber}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => handlePickup(task.id)}
                    disabled={!!submitting}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-2xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <CheckCircle className="w-5 h-5" />
                    {submitting === task.id ? 'Updating...' : 'Confirm Pickup'}
                  </button>
                </div>
              </div>
              
              <div className="bg-slate-50 px-6 py-4 flex items-center gap-3 border-t border-slate-100">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-bold text-slate-500">Contact trader if delayed more than 30 mins.</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
