import React, { useState, useEffect } from 'react';
import { Package, Truck, CheckCircle, AlertTriangle, FileText, Send, Check } from 'lucide-react';
import { indentService } from '../../services/purchase_management/indentService';

export const IMSDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Pipeline Steps
  const pipelineSteps = [
    { id: 'generated', label: 'Generated', subLabel: 'Python script', count: 12, icon: FileText },
    { id: 'approved', label: 'Approved', subLabel: 'Purchase team', count: 9, icon: CheckCircle },
    { id: 'dispatched', label: 'Dispatched', subLabel: 'Trader', count: 7, icon: Send },
    { id: 'picked_up', label: 'Picked up', subLabel: 'Transporter', count: 5, icon: Truck },
    { id: 'delivered', label: 'Delivered', subLabel: 'Store manager', count: 3, icon: Package },
    { id: 'accepted', label: 'Accepted', subLabel: 'Store confirmed', count: 3, icon: Check },
  ];

  // Dummy Live Orders
  const liveOrders = [
    { po: 'PO-20260418-0001', party: 'Walvekar Sons', items: 6, qty: '2,499.84 ml', status: 'Accepted', event: '09:41 · Store Mgr', statusColor: 'bg-green-100 text-green-800' },
    { po: 'PO-20260418-0002', party: 'Royal Agency', items: 6, qty: '1,171.32 ml', status: 'Mismatch', event: '10:22 · Transporter', statusColor: 'bg-red-100 text-red-800' },
    { po: 'PO-20260418-0003', party: 'Millinnium Spirits', items: 15, qty: '821.64 ml', status: 'In Transit', event: '11:05 · Transporter', statusColor: 'bg-purple-100 text-purple-800' },
    { po: 'PO-20260418-0004', party: 'Wine Enterprises', items: 5, qty: '293.46 ml', status: 'Dispatched', event: '11:48 · Trader', statusColor: 'bg-green-100 text-green-800' },
  ];

  const tabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'trader-module', label: 'Trader Module' },
    { id: 'transporter-module', label: 'Transporter Module' },
    { id: 'store-module', label: 'Store Module' },
  ];

  const handleActionSubmit = (role: string, data: any) => {
    alert(`${role} Action Submitted!\n\nData: ${JSON.stringify(data, null, 2)}\nTimestamp: ${new Date().toLocaleString()}`);
  };

  return (
    <div className="p-6 bg-white min-h-screen w-full lg:w-[calc(100vw-280px)]">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">IMS Portal</h1>
          <p className="text-gray-500 text-sm mt-1">18 Apr 2026 · Pune Distribution Hub</p>
        </div>
        <div className="flex items-center px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm font-medium border border-green-200">
          <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
          Live
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6 overflow-x-auto">
        <nav className="flex space-x-8 min-w-max">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'dashboard' && (
        <>
          {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Today's orders</h3>
          <div className="text-3xl font-light text-gray-900 mb-2">12</div>
          <p className="text-xs text-gray-500">PO-20260418-0001 to 0012</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Pending approval</h3>
          <div className="text-3xl font-light text-blue-600 mb-2">3</div>
          <p className="text-xs text-gray-500">Awaiting purchasing team</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500 mb-2">In transit</h3>
          <div className="text-3xl font-light text-purple-600 mb-2">5</div>
          <p className="text-xs text-gray-500">Transporter on route</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Mismatches today</h3>
          <div className="text-3xl font-light text-red-600 mb-2">2</div>
          <p className="text-xs text-gray-500">Qty variance logged</p>
        </div>
      </div>

      {/* Order Pipeline */}
      <div className="mb-8">
        <h2 className="text-xs font-bold text-gray-500 tracking-wider mb-4 uppercase">Order Pipeline · Today</h2>
        <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex flex-col md:flex-row">
            {pipelineSteps.map((step, index) => (
              <div key={step.id} className={`flex-1 p-4 relative ${index !== pipelineSteps.length - 1 ? 'border-b md:border-b-0 md:border-r border-gray-200' : ''}`}>
                <div className="text-xs text-gray-500 mb-1">{step.label}</div>
                <div className="text-2xl font-light text-gray-900 mb-1">{step.count}</div>
                <div className="text-xs text-gray-400">{step.subLabel}</div>
                
                {/* Arrow pointing right (hidden on mobile) */}
                {index !== pipelineSteps.length - 1 && (
                  <div className="hidden md:block absolute -right-3 top-1/2 transform -translate-y-1/2 z-10 text-gray-300">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Live Orders Table */}
      <div>
        <h2 className="text-xs font-bold text-gray-500 tracking-wider mb-4 uppercase">Live Orders</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500">
                <th className="pb-3 font-medium px-2">PO Number</th>
                <th className="pb-3 font-medium px-2">Party</th>
                <th className="pb-3 font-medium px-2">Items</th>
                <th className="pb-3 font-medium px-2">Total Qty</th>
                <th className="pb-3 font-medium px-2">Status</th>
                <th className="pb-3 font-medium px-2">Last event</th>
              </tr>
            </thead>
            <tbody className="text-gray-700">
              {liveOrders.map((order, idx) => (
                <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="py-4 px-2 font-mono text-gray-900">{order.po}</td>
                  <td className="py-4 px-2 font-medium">{order.party}</td>
                  <td className="py-4 px-2">{order.items}</td>
                  <td className="py-4 px-2 font-mono text-gray-600">{order.qty}</td>
                  <td className="py-4 px-2">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${order.statusColor}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="py-4 px-2 text-gray-500 text-xs">{order.event}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
        </>
      )}

      {/* TRADER MODULE */}
      {activeTab === 'trader-module' && (
        <div className="max-w-2xl bg-gray-50 border border-gray-200 rounded-xl p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Trader Confirmation</h2>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Order to Confirm</label>
            <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
              <option>PO-20260418-0004 - Wine Enterprises</option>
              <option>PO-20260418-0005 - XYZ Trader</option>
            </select>
          </div>
          <div className="mb-6">
            <p className="text-sm font-medium text-gray-700 mb-3">Did you accept the order?</p>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer bg-white border border-gray-300 px-4 py-2 rounded-lg hover:bg-green-50">
                <input type="radio" name="trader_accept" value="Yes" className="w-4 h-4 text-green-600" />
                <span className="text-gray-900 font-medium">Yes, Accepted</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer bg-white border border-gray-300 px-4 py-2 rounded-lg hover:bg-red-50">
                <input type="radio" name="trader_accept" value="No" className="w-4 h-4 text-red-600" />
                <span className="text-gray-900 font-medium">No, Rejected</span>
              </label>
            </div>
          </div>
          <button 
            onClick={() => handleActionSubmit('Trader', { status: 'Accepted' })}
            className="w-full bg-gray-900 text-white py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors"
          >
            Submit Response
          </button>
        </div>
      )}

      {/* TRANSPORTER MODULE */}
      {activeTab === 'transporter-module' && (
        <div className="max-w-2xl bg-gray-50 border border-gray-200 rounded-xl p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Transporter Pickup Status</h2>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Assigned Order</label>
            <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
              <option>PO-20260418-0003 - Millinnium Spirits</option>
            </select>
          </div>
          <div className="mb-6">
            <p className="text-sm font-medium text-gray-700 mb-3">Order Pickup Status</p>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer bg-white border border-gray-300 px-4 py-2 rounded-lg hover:bg-blue-50">
                <input type="radio" name="transporter_pickup" value="Pickup" className="w-4 h-4 text-blue-600" />
                <span className="text-gray-900 font-medium">Picked Up</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer bg-white border border-gray-300 px-4 py-2 rounded-lg hover:bg-orange-50">
                <input type="radio" name="transporter_pickup" value="Not Pickup" className="w-4 h-4 text-orange-600" />
                <span className="text-gray-900 font-medium">Not Picked Up</span>
              </label>
            </div>
          </div>
          <button 
            onClick={() => handleActionSubmit('Transporter', { status: 'Picked Up' })}
            className="w-full bg-gray-900 text-white py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors"
          >
            Update Status
          </button>
        </div>
      )}

      {/* STORE MODULE */}
      {activeTab === 'store-module' && (
        <div className="max-w-4xl bg-gray-50 border border-gray-200 rounded-xl p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Store Receiving Module</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Order Received?</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer bg-white border border-gray-300 px-4 py-2 rounded-lg hover:bg-green-50">
                  <input type="radio" name="store_receive" value="Yes" defaultChecked className="w-4 h-4 text-green-600" />
                  <span className="text-gray-900 font-medium">Yes</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer bg-white border border-gray-300 px-4 py-2 rounded-lg hover:bg-red-50">
                  <input type="radio" name="store_receive" value="No" className="w-4 h-4 text-red-600" />
                  <span className="text-gray-900 font-medium">No</span>
                </label>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Receiver Name</label>
              <input type="text" placeholder="Enter full name" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>

          <div className="mb-6 bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-100 text-gray-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Item Name</th>
                  <th className="px-4 py-3 font-medium text-center">Order Qty</th>
                  <th className="px-4 py-3 font-medium text-center">Closing Stock</th>
                  <th className="px-4 py-3 font-medium w-32">Received Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="px-4 py-3 font-medium text-gray-900">Black Dog Centenary Black Reserve</td>
                  <td className="px-4 py-3 text-center text-gray-600">50</td>
                  <td className="px-4 py-3 text-center text-blue-600 font-medium">12</td>
                  <td className="px-4 py-3">
                    <input type="number" defaultValue={50} className="w-full px-3 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none" />
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-gray-900">Old Monk Supreme XXX Rum</td>
                  <td className="px-4 py-3 text-center text-gray-600">120</td>
                  <td className="px-4 py-3 text-center text-blue-600 font-medium">45</td>
                  <td className="px-4 py-3">
                    <input type="number" defaultValue={120} className="w-full px-3 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <button 
            onClick={() => handleActionSubmit('Store', { received: true, items: 2 })}
            className="w-full bg-gray-900 text-white py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors"
          >
            Save Receiving Data
          </button>
        </div>
      )}

    </div>
  );
};
