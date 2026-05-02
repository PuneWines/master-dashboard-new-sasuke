import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Package, CheckCircle, AlertCircle } from 'lucide-react';

export const TraderForm: React.FC = () => {
  const [searchParams] = useSearchParams();
  const poId = searchParams.get('poId');
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    accepted: 'Yes',
    remarks: ''
  });

  // Mock fetching PO details
  const poDetails = {
    poNumber: poId || 'Unknown',
    shopName: 'Pune Distribution Hub',
    partyName: 'Wine Enterprises',
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
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h2>
          <p className="text-gray-600 mb-6">Your response for {poDetails.poNumber} has been recorded successfully.</p>
          <p className="text-sm text-gray-400">Timestamp: {new Date().toLocaleString()}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-blue-600 p-6 text-white text-center">
          <Package className="w-10 h-10 mx-auto mb-2 opacity-90" />
          <h1 className="text-2xl font-bold">Trader Confirmation</h1>
          <p className="text-blue-100 mt-1 opacity-80">Secure Action Form</p>
        </div>

        <div className="p-6 md:p-8">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6 text-sm">
            <div className="grid grid-cols-2 gap-y-3">
              <div className="text-gray-500">PO Number</div>
              <div className="font-semibold text-gray-900 text-right">{poDetails.poNumber}</div>
              
              <div className="text-gray-500">Shop Name</div>
              <div className="font-medium text-gray-900 text-right">{poDetails.shopName}</div>
              
              <div className="text-gray-500">Party Name</div>
              <div className="font-medium text-gray-900 text-right">{poDetails.partyName}</div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2">Order Items</p>
              <ul className="space-y-2">
                {poDetails.items.map((item, idx) => (
                  <li key={idx} className="flex justify-between text-gray-700">
                    <span>{item.name}</span>
                    <span className="font-mono font-medium">{item.qtyBox} Box</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <p className="block text-sm font-semibold text-gray-900 mb-3">Did you accept the order?</p>
              <div className="flex gap-4">
                <label className={`flex-1 flex items-center justify-center gap-2 cursor-pointer border px-4 py-3 rounded-xl transition-all ${formData.accepted === 'Yes' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>
                  <input 
                    type="radio" 
                    name="accepted" 
                    value="Yes"
                    checked={formData.accepted === 'Yes'}
                    onChange={(e) => setFormData({ ...formData, accepted: e.target.value })}
                    className="w-4 h-4 text-green-600 hidden" 
                  />
                  <span className="font-medium">Yes, Accepted</span>
                </label>
                <label className={`flex-1 flex items-center justify-center gap-2 cursor-pointer border px-4 py-3 rounded-xl transition-all ${formData.accepted === 'No' ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>
                  <input 
                    type="radio" 
                    name="accepted" 
                    value="No"
                    checked={formData.accepted === 'No'}
                    onChange={(e) => setFormData({ ...formData, accepted: e.target.value })}
                    className="w-4 h-4 text-red-600 hidden" 
                  />
                  <span className="font-medium">No, Rejected</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Remarks (Optional)</label>
              <textarea
                rows={3}
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                placeholder="Any comments regarding the order..."
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
              ></textarea>
            </div>

            <button
              type="submit"
              className="w-full bg-gray-900 text-white py-4 rounded-xl font-bold text-lg hover:bg-gray-800 transition-colors shadow-lg"
            >
              Submit Response
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
