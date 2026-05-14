import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { indentService } from '../../services/purchase_management/indentService';
import { Store, Truck, UserCircle, Save, Loader2, Plus, Edit2, X, RefreshCw } from 'lucide-react';

const SHEET_ID = "18UDK5XUV9WyIJS5BXGC3WAU_m-a7U20HxGY1TM9ryaU";

export const MasterPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'vendor' | 'transport' | 'receiver'>('vendor');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Data State
  const [vendorList, setVendorList] = useState<any[]>([]);
  const [transportList, setTransportList] = useState<any[]>([]);
  const [receiverList, setReceiverList] = useState<any[]>([]);

  // Edit State (Inline)
  const [editingRow, setEditingRow] = useState<any | null>(null);
  const [editFormData, setEditFormData] = useState<any>({});

  // Form States
  const [vendorData, setVendorData] = useState({ shopName: '', partyName: '', brandName: '', location: '', emailId: '', contactPerson: '', whatsappNumber: '' });
  const [transportData, setTransportData] = useState({ transporterName: '', contactPersonName: '', whatsappNumber: '' });
  const [receiverData, setReceiverData] = useState({ shopName: '', receiverName: '', whatsappNumber: '' });

  // Fetch Data on Tab Change
  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setIsLoadingData(true);
    try {
      if (activeTab === 'vendor') {
        const data = await indentService.fetchMasterSheetData(SHEET_ID, "Vendor Master");
        setVendorList(data);
      } else if (activeTab === 'transport') {
        const data = await indentService.fetchMasterSheetData(SHEET_ID, "Transpoters");
        setTransportList(data);
      } else if (activeTab === 'receiver') {
        const data = await indentService.fetchMasterSheetData(SHEET_ID, "Receiver Data");
        setReceiverList(data);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to fetch data.");
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleVendorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const data = {
        "Shop Name": vendorData.shopName,
        "Party  Name": vendorData.partyName,
        "Brand Name": vendorData.brandName,
        "Location": vendorData.location,
        "Email ID": vendorData.emailId,
        "Contact Person": vendorData.contactPerson,
        "Contact Whatsapp Number": vendorData.whatsappNumber
      };
      await indentService.postMasterData(SHEET_ID, "Vendor Master", data);
      toast.success("Vendor added successfully!");
      setVendorData({ shopName: '', partyName: '', brandName: '', location: '', emailId: '', contactPerson: '', whatsappNumber: '' });
      setShowAddForm(false);
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error("Failed to add vendor.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTransportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const data = {
        "Transpoter Name": transportData.transporterName,
        "Contact Person Name": transportData.contactPersonName,
        "Contact Person Whatsapp Number": transportData.whatsappNumber
      };
      await indentService.postMasterData(SHEET_ID, "Transpoters", data);
      toast.success("Transporter added successfully!");
      setTransportData({ transporterName: '', contactPersonName: '', whatsappNumber: '' });
      setShowAddForm(false);
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error("Failed to add transporter.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReceiverSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const data = {
        "Shop Name": receiverData.shopName,
        "Receiver Name": receiverData.receiverName,
        "Contact Person Whatsapp Number": receiverData.whatsappNumber
      };
      await indentService.postMasterData(SHEET_ID, "Receiver Data", data);
      toast.success("Receiver added successfully!");
      setReceiverData({ shopName: '', receiverName: '', whatsappNumber: '' });
      setShowAddForm(false);
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error("Failed to add receiver.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (row: any) => {
    setEditingRow(row);
    if (activeTab === 'vendor') {
      setEditFormData({
        shopName: row["Shop Name"] || row[0] || '',
        partyName: row["Party  Name"] || row["Party Name"] || row[1] || '',
        brandName: row["Brand Name"] || row[2] || '',
        location: row["Location"] || row[3] || '',
        emailId: row["Email ID"] || row[4] || '',
        contactPerson: row["Contact Person"] || row[5] || '',
        whatsappNumber: row["Contact Whatsapp Number"] || row[6] || ''
      });
    } else if (activeTab === 'transport') {
      setEditFormData({
        transporterName: row["Transpoter Name"] || row[0] || '',
        contactPersonName: row["Contact Person Name"] || row[1] || '',
        whatsappNumber: row["Contact Person Whatsapp Number"] || row[2] || ''
      });
    } else if (activeTab === 'receiver') {
      setEditFormData({
        shopName: row["Shop Name"] || row[0] || '',
        receiverName: row["Receiver Name"] || row[1] || '',
        whatsappNumber: row["Contact Person Whatsapp Number"] || row[2] || ''
      });
    }
  };

  const handleEditSubmitInline = async () => {
    if (!editingRow) return;
    setIsSubmitting(true);
    try {
      let sheetName = "";
      let matchCriteria: any = {};
      let updates: any = {};

      if (activeTab === 'vendor') {
        sheetName = "Vendor Master";
        matchCriteria = { "Shop Name": editingRow["Shop Name"] || editingRow[0], "Party  Name": editingRow["Party  Name"] || editingRow["Party Name"] || editingRow[1] };
        updates = {
          "Shop Name": editFormData.shopName,
          "Party  Name": editFormData.partyName,
          "Brand Name": editFormData.brandName,
          "Location": editFormData.location,
          "Email ID": editFormData.emailId,
          "Contact Person": editFormData.contactPerson,
          "Contact Whatsapp Number": editFormData.whatsappNumber
        };
      } else if (activeTab === 'transport') {
        sheetName = "Transpoters";
        matchCriteria = { "Transpoter Name": editingRow["Transpoter Name"] || editingRow[0] };
        updates = {
          "Transpoter Name": editFormData.transporterName,
          "Contact Person Name": editFormData.contactPersonName,
          "Contact Person Whatsapp Number": editFormData.whatsappNumber
        };
      } else if (activeTab === 'receiver') {
        sheetName = "Receiver Data";
        matchCriteria = { "Shop Name": editingRow["Shop Name"] || editingRow[0], "Receiver Name": editingRow["Receiver Name"] || editingRow[1] };
        updates = {
          "Shop Name": editFormData.shopName,
          "Receiver Name": editFormData.receiverName,
          "Contact Person Whatsapp Number": editFormData.whatsappNumber
        };
      }

      await indentService.updateMasterSheetData(SHEET_ID, sheetName, matchCriteria, updates);
      toast.success("Updated successfully!");
      setEditingRow(null);
      fetchData();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to update data.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = "w-full min-w-[120px] p-2 bg-white border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm shadow-inner";

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            Master Data Management
            {isLoadingData && <Loader2 className="w-4 h-4 animate-spin text-purple-600" />}
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage Vendors, Transporters, and Receivers.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchData} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium flex items-center gap-2 transition-all">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button onClick={() => { setShowAddForm(!showAddForm); setEditingRow(null); }} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium flex items-center gap-2 transition-all shadow-md">
            {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showAddForm ? 'Close Form' : 'Add New'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200 mb-6 max-w-3xl">
        <button onClick={() => { setActiveTab('vendor'); setShowAddForm(false); setEditingRow(null); }} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-semibold transition-all ${activeTab === 'vendor' ? 'bg-purple-100 text-purple-700 shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}>
          <Store className="w-4 h-4" /> Vendors
        </button>
        <button onClick={() => { setActiveTab('transport'); setShowAddForm(false); setEditingRow(null); }} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-semibold transition-all ${activeTab === 'transport' ? 'bg-purple-100 text-purple-700 shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}>
          <Truck className="w-4 h-4" /> Transporters
        </button>
        <button onClick={() => { setActiveTab('receiver'); setShowAddForm(false); setEditingRow(null); }} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-semibold transition-all ${activeTab === 'receiver' ? 'bg-purple-100 text-purple-700 shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}>
          <UserCircle className="w-4 h-4" /> Receivers
        </button>
      </div>

      {/* Add Form Section */}
      {showAddForm && (
        <div className="bg-white rounded-xl shadow-lg border border-purple-100 p-6 mb-6 animate-fade-in relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-indigo-500"></div>
          
          {/* VENDOR FORM */}
          {activeTab === 'vendor' && (
            <form onSubmit={handleVendorSubmit} className="space-y-4">
              <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5 text-purple-600" /> Add New Vendor
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input required type="text" value={vendorData.shopName} onChange={e => setVendorData({...vendorData, shopName: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm" placeholder="Shop Name" />
                <input required type="text" value={vendorData.partyName} onChange={e => setVendorData({...vendorData, partyName: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm" placeholder="Party Name" />
                <input required type="text" value={vendorData.brandName} onChange={e => setVendorData({...vendorData, brandName: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm" placeholder="Brand Name" />
                <input required type="text" value={vendorData.location} onChange={e => setVendorData({...vendorData, location: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm" placeholder="Location" />
                <input required type="email" value={vendorData.emailId} onChange={e => setVendorData({...vendorData, emailId: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm" placeholder="Email ID" />
                <input required type="text" value={vendorData.contactPerson} onChange={e => setVendorData({...vendorData, contactPerson: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm" placeholder="Contact Person" />
                <input required type="tel" value={vendorData.whatsappNumber} onChange={e => setVendorData({...vendorData, whatsappNumber: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm" placeholder="Whatsapp Number" />
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button type="button" onClick={() => setShowAddForm(false)} className="px-5 py-2.5 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition-all">Cancel</button>
                <button disabled={isSubmitting} type="submit" className="px-6 py-2.5 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-all flex items-center gap-2">
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {isSubmitting ? 'Saving...' : 'Submit Vendor'}
                </button>
              </div>
            </form>
          )}

          {/* TRANSPORT FORM */}
          {activeTab === 'transport' && (
            <form onSubmit={handleTransportSubmit} className="space-y-4">
              <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5 text-purple-600" /> Add New Transporter
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input required type="text" value={transportData.transporterName} onChange={e => setTransportData({...transportData, transporterName: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm" placeholder="Transporter Name" />
                <input required type="text" value={transportData.contactPersonName} onChange={e => setTransportData({...transportData, contactPersonName: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm" placeholder="Contact Person Name" />
                <input required type="tel" value={transportData.whatsappNumber} onChange={e => setTransportData({...transportData, whatsappNumber: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm" placeholder="Whatsapp Number" />
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button type="button" onClick={() => setShowAddForm(false)} className="px-5 py-2.5 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition-all">Cancel</button>
                <button disabled={isSubmitting} type="submit" className="px-6 py-2.5 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-all flex items-center gap-2">
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {isSubmitting ? 'Saving...' : 'Submit Transporter'}
                </button>
              </div>
            </form>
          )}

          {/* RECEIVER FORM */}
          {activeTab === 'receiver' && (
            <form onSubmit={handleReceiverSubmit} className="space-y-4">
              <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5 text-purple-600" /> Add New Receiver
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input required type="text" value={receiverData.shopName} onChange={e => setReceiverData({...receiverData, shopName: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm" placeholder="Shop Name" />
                <input required type="text" value={receiverData.receiverName} onChange={e => setReceiverData({...receiverData, receiverName: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm" placeholder="Receiver Name" />
                <input required type="tel" value={receiverData.whatsappNumber} onChange={e => setReceiverData({...receiverData, whatsappNumber: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm" placeholder="Whatsapp Number" />
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button type="button" onClick={() => setShowAddForm(false)} className="px-5 py-2.5 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition-all">Cancel</button>
                <button disabled={isSubmitting} type="submit" className="px-6 py-2.5 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-all flex items-center gap-2">
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {isSubmitting ? 'Saving...' : 'Submit Receiver'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Tables Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {isLoadingData && !vendorList.length && !transportList.length && !receiverList.length ? (
          <div className="p-12 text-center text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-purple-600" />
            <p>Loading records...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {activeTab === 'vendor' && (
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="p-4 font-semibold">Shop Name</th>
                    <th className="p-4 font-semibold">Party Name</th>
                    <th className="p-4 font-semibold">Brand</th>
                    <th className="p-4 font-semibold">Location</th>
                    <th className="p-4 font-semibold">Contact Person</th>
                    <th className="p-4 font-semibold">Whatsapp</th>
                    <th className="p-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vendorList.slice(1).map((row, idx) => {
                    const shopName = row["Shop Name"] || row[0] || '';
                    if (!shopName) return null;
                    const isEditing = editingRow === row;
                    return (
                      <tr key={idx} className={`${isEditing ? 'bg-purple-50' : 'hover:bg-slate-50'} transition-colors`}>
                        <td className="p-3">
                          {isEditing ? <input value={editFormData.shopName} onChange={e => setEditFormData({...editFormData, shopName: e.target.value})} className={inputClass}/> : <span className="font-medium text-slate-800">{shopName}</span>}
                        </td>
                        <td className="p-3">
                          {isEditing ? <input value={editFormData.partyName} onChange={e => setEditFormData({...editFormData, partyName: e.target.value})} className={inputClass}/> : <span className="text-slate-600">{row["Party  Name"] || row["Party Name"] || row[1] || ''}</span>}
                        </td>
                        <td className="p-3">
                          {isEditing ? <input value={editFormData.brandName} onChange={e => setEditFormData({...editFormData, brandName: e.target.value})} className={inputClass}/> : <span className="text-slate-600">{row["Brand Name"] || row[2] || ''}</span>}
                        </td>
                        <td className="p-3">
                          {isEditing ? <input value={editFormData.location} onChange={e => setEditFormData({...editFormData, location: e.target.value})} className={inputClass}/> : <span className="text-slate-600">{row["Location"] || row[3] || ''}</span>}
                        </td>
                        <td className="p-3">
                          {isEditing ? <input value={editFormData.contactPerson} onChange={e => setEditFormData({...editFormData, contactPerson: e.target.value})} className={inputClass}/> : <span className="text-slate-600">{row["Contact Person"] || row[5] || ''}</span>}
                        </td>
                        <td className="p-3">
                          {isEditing ? <input type="tel" value={editFormData.whatsappNumber} onChange={e => setEditFormData({...editFormData, whatsappNumber: e.target.value})} className={inputClass}/> : <span className="text-slate-600">{row["Contact Whatsapp Number"] || row[6] || ''}</span>}
                        </td>
                        <td className="p-3 text-right">
                          {isEditing ? (
                            <div className="flex justify-end gap-1">
                              <button onClick={handleEditSubmitInline} disabled={isSubmitting} className="text-green-600 bg-green-100 hover:bg-green-200 p-2 rounded-lg transition-colors" title="Save">
                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                              </button>
                              <button onClick={() => setEditingRow(null)} disabled={isSubmitting} className="text-red-600 bg-red-100 hover:bg-red-200 p-2 rounded-lg transition-colors" title="Cancel">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <button onClick={() => { handleEditClick(row); setShowAddForm(false); }} className="text-purple-600 hover:text-purple-800 p-2 rounded-lg hover:bg-purple-100 transition-colors inline-flex" title="Edit">
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {vendorList.length <= 1 && (
                    <tr><td colSpan={7} className="p-8 text-center text-slate-500">No vendor records found.</td></tr>
                  )}
                </tbody>
              </table>
            )}

            {activeTab === 'transport' && (
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="p-4 font-semibold">Transporter Name</th>
                    <th className="p-4 font-semibold">Contact Person Name</th>
                    <th className="p-4 font-semibold">Whatsapp Number</th>
                    <th className="p-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transportList.slice(1).map((row, idx) => {
                    const tName = row["Transpoter Name"] || row[0] || '';
                    if (!tName) return null;
                    const isEditing = editingRow === row;
                    return (
                      <tr key={idx} className={`${isEditing ? 'bg-purple-50' : 'hover:bg-slate-50'} transition-colors`}>
                        <td className="p-3">
                          {isEditing ? <input value={editFormData.transporterName} onChange={e => setEditFormData({...editFormData, transporterName: e.target.value})} className={inputClass}/> : <span className="font-medium text-slate-800">{tName}</span>}
                        </td>
                        <td className="p-3">
                          {isEditing ? <input value={editFormData.contactPersonName} onChange={e => setEditFormData({...editFormData, contactPersonName: e.target.value})} className={inputClass}/> : <span className="text-slate-600">{row["Contact Person Name"] || row[1] || ''}</span>}
                        </td>
                        <td className="p-3">
                          {isEditing ? <input type="tel" value={editFormData.whatsappNumber} onChange={e => setEditFormData({...editFormData, whatsappNumber: e.target.value})} className={inputClass}/> : <span className="text-slate-600">{row["Contact Person Whatsapp Number"] || row[2] || ''}</span>}
                        </td>
                        <td className="p-3 text-right">
                          {isEditing ? (
                            <div className="flex justify-end gap-1">
                              <button onClick={handleEditSubmitInline} disabled={isSubmitting} className="text-green-600 bg-green-100 hover:bg-green-200 p-2 rounded-lg transition-colors" title="Save">
                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                              </button>
                              <button onClick={() => setEditingRow(null)} disabled={isSubmitting} className="text-red-600 bg-red-100 hover:bg-red-200 p-2 rounded-lg transition-colors" title="Cancel">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <button onClick={() => { handleEditClick(row); setShowAddForm(false); }} className="text-purple-600 hover:text-purple-800 p-2 rounded-lg hover:bg-purple-100 transition-colors inline-flex" title="Edit">
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {transportList.length <= 1 && (
                    <tr><td colSpan={4} className="p-8 text-center text-slate-500">No transporter records found.</td></tr>
                  )}
                </tbody>
              </table>
            )}

            {activeTab === 'receiver' && (
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="p-4 font-semibold">Shop Name</th>
                    <th className="p-4 font-semibold">Receiver Name</th>
                    <th className="p-4 font-semibold">Whatsapp Number</th>
                    <th className="p-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {receiverList.slice(1).map((row, idx) => {
                    const shopName = row["Shop Name"] || row[0] || '';
                    if (!shopName) return null;
                    const isEditing = editingRow === row;
                    return (
                      <tr key={idx} className={`${isEditing ? 'bg-purple-50' : 'hover:bg-slate-50'} transition-colors`}>
                        <td className="p-3">
                          {isEditing ? <input value={editFormData.shopName} onChange={e => setEditFormData({...editFormData, shopName: e.target.value})} className={inputClass}/> : <span className="font-medium text-slate-800">{shopName}</span>}
                        </td>
                        <td className="p-3">
                          {isEditing ? <input value={editFormData.receiverName} onChange={e => setEditFormData({...editFormData, receiverName: e.target.value})} className={inputClass}/> : <span className="text-slate-600">{row["Receiver Name"] || row[1] || ''}</span>}
                        </td>
                        <td className="p-3">
                          {isEditing ? <input type="tel" value={editFormData.whatsappNumber} onChange={e => setEditFormData({...editFormData, whatsappNumber: e.target.value})} className={inputClass}/> : <span className="text-slate-600">{row["Contact Person Whatsapp Number"] || row[2] || ''}</span>}
                        </td>
                        <td className="p-3 text-right">
                          {isEditing ? (
                            <div className="flex justify-end gap-1">
                              <button onClick={handleEditSubmitInline} disabled={isSubmitting} className="text-green-600 bg-green-100 hover:bg-green-200 p-2 rounded-lg transition-colors" title="Save">
                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                              </button>
                              <button onClick={() => setEditingRow(null)} disabled={isSubmitting} className="text-red-600 bg-red-100 hover:bg-red-200 p-2 rounded-lg transition-colors" title="Cancel">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <button onClick={() => { handleEditClick(row); setShowAddForm(false); }} className="text-purple-600 hover:text-purple-800 p-2 rounded-lg hover:bg-purple-100 transition-colors inline-flex" title="Edit">
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {receiverList.length <= 1 && (
                    <tr><td colSpan={4} className="p-8 text-center text-slate-500">No receiver records found.</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
