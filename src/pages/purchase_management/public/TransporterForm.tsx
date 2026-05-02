import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Truck, CheckCircle, AlertCircle, MapPin } from 'lucide-react';

export const TransporterForm: React.FC = () => {
  const [searchParams] = useSearchParams();
  const poId = searchParams.get('poId');
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    status: 'Pickup',
    remarks: ''
  });

  // Mock fetching PO details
  const poDetails = {
    poNumber: poId || 'Unknown',
    pickupLocation: 'Wine Enterprises Warehouse, Pune',
    dropLocation: 'Pune Distribution Hub, Sector 4',
    plannedTime: new Date(Date.now() + 86400000).toLocaleString(), // Tomorrow
    items: [
      { name: 'Black Dog Centenary Black Reserve', qtyBox: 5 },
      { name: 'Old Monk Supreme XXX Rum', qtyBox: 10 }
    ]
  };

  useEffect(() => {
    // Validate token and poId
    if (!poId || !token) {
      setError("Invalid or expired secure link. Please request a new link.");
      setLoading(false);
      return;
    }
    
    // Simulate fetching details securely
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  }, [poId, token]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate API call to save response
    setTimeout(() => {
      setSubmitted(true);
    }, 800);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">Loading secure form...</div>;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-6 rounded-xl shadow-lg max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center animate-in fade-in zoom-in">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Status Updated!</h2>
          <p className="text-gray-600 mb-6">Pickup status for {poDetails.poNumber} has been recorded successfully.</p>
          <p className="text-sm text-gray-400">Timestamp: {new Date().toLocaleString()}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-slate-800 p-6 text-white text-center">
          <Truck className="w-10 h-10 mx-auto mb-2 opacity-90" />
          <h1 className="text-2xl font-bold">Transporter Pickup</h1>
          <p className="text-slate-300 mt-1 opacity-80">Secure Action Form</p>
        </div>

        <div className="p-6 md:p-8">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6 text-sm">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-3">
              <span className="text-gray-500 font-medium">PO Number</span>
              <span className="font-bold text-gray-900 text-lg">{poDetails.poNumber}</span>
            </div>
            
            <div className="space-y-4">
              <div className="flex gap-3 items-start">
                <MapPin className="w-5 h-5 text-orange-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Pickup Location</p>
                  <p className="font-medium text-gray-900">{poDetails.pickupLocation}</p>
                </div>
              </div>
              
              <div className="flex gap-3 items-start">
                <MapPin className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Drop Location</p>
                  <p className="font-medium text-gray-900">{poDetails.dropLocation}</p>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2">Order Items (Total Box)</p>
              <ul className="space-y-2">
                {poDetails.items.map((item, idx) => (
                  <li key={idx} className="flex justify-between text-gray-700">
                    <span className="truncate pr-4">{item.name}</span>
                    <span className="font-mono font-bold shrink-0">{item.qtyBox} Box</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <p className="block text-sm font-semibold text-gray-900 mb-3">Pickup Status</p>
              <div className="flex gap-4">
                <label className={`flex-1 flex items-center justify-center gap-2 cursor-pointer border px-4 py-3 rounded-xl transition-all ${formData.status === 'Pickup' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>
                  <input 
                    type="radio" 
                    name="status" 
                    value="Pickup"
                    checked={formData.status === 'Pickup'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-4 h-4 text-blue-600 hidden" 
                  />
                  <span className="font-medium">Picked Up</span>
                </label>
                <label className={`flex-1 flex items-center justify-center gap-2 cursor-pointer border px-4 py-3 rounded-xl transition-all ${formData.status === 'Not Pickup' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>
                  <input 
                    type="radio" 
                    name="status" 
                    value="Not Pickup"
                    checked={formData.status === 'Not Pickup'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-4 h-4 text-orange-600 hidden" 
                  />
                  <span className="font-medium">Not Picked Up</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Remarks (Optional)</label>
              <textarea
                rows={3}
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                placeholder="E.g., Vehicle delay, partial loading..."
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
              ></textarea>
            </div>

            <button
              type="submit"
              className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold text-lg hover:bg-slate-800 transition-colors shadow-lg"
            >
              Update Status
            </button>
            <p className="text-center text-xs text-gray-400 mt-4 flex items-center justify-center gap-1">
              Response is securely encrypted
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};
