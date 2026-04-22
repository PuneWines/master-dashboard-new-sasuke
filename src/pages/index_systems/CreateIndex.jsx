import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIndex } from '../../context/IndexContext';
import { Save, X, PlusCircle } from 'lucide-react';

const CreateIndex = () => {
  const navigate = useNavigate();
  const { addIndex, saving } = useIndex();

  const [formData, setFormData] = useState({
    shopName: '',
    fmsName: '',
    fmsLink: '',
    appLink: '',
    stages: '',
    doers: '',
    doersEmail: '',
    whatsappMessages: 'NO',
    pcName: '',
    misCompleted: '',
    problemSolver: '',
    status: 'Running',
    trainingVideo: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = await addIndex(formData);
    if (success) {
      navigate('/index_systems');
    } else {
      alert("Failed to save to Google Sheet. Please check your Script URL.");
    }
  };

  return (
    <div className="animate-fade-in max-w-4xl mx-auto pb-8">
      <header className="mb-8">
        <h1 className="text-[28px] font-bold text-[#111827] tracking-tight">Create New Index System</h1>
        <p className="text-gray-500 text-[15px] mt-1">Fill in the details below to add a new system to the directory.</p>
      </header>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-gray-700">Shop Name</label>
              <input type="text" name="shopName" value={formData.shopName} onChange={handleChange} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" placeholder="e.g. ALL / Pune Wines" required />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-gray-700">FMS Name</label>
              <input type="text" name="fmsName" value={formData.fmsName} onChange={handleChange} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" placeholder="e.g. Scheme System" required />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-gray-700">FMS Link</label>
              <input type="url" name="fmsLink" value={formData.fmsLink} onChange={handleChange} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" placeholder="https://..." />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-gray-700">App Link</label>
              <input type="url" name="appLink" value={formData.appLink} onChange={handleChange} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" placeholder="https://..." />
            </div>

            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-[13px] font-bold text-gray-700">Stages (One per line)</label>
              <textarea name="stages" value={formData.stages} onChange={handleChange} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all min-h-[100px]" rows="4" placeholder="Scheme Record Form&#10;Scheme Record Manual..."></textarea>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-gray-700">Doers</label>
              <input type="text" name="doers" value={formData.doers} onChange={handleChange} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" placeholder="Ramkaran, Sarvan..." />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-gray-700">Doers Email</label>
              <input type="email" name="doersEmail" value={formData.doersEmail} onChange={handleChange} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" placeholder="example@gmail.com" />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-gray-700">Whatsapp Messages</label>
              <select name="whatsappMessages" value={formData.whatsappMessages} onChange={handleChange} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all">
                <option value="YES">YES</option>
                <option value="NO">NO</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-gray-700">PC Name</label>
              <input type="text" name="pcName" value={formData.pcName} onChange={handleChange} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-gray-700">Running/Not Running</label>
              <select name="status" value={formData.status} onChange={handleChange} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all">
                <option value="Running">Running</option>
                <option value="NOT RUNNING">NOT RUNNING</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-gray-700">Training Video Link</label>
              <input type="url" name="trainingVideo" value={formData.trainingVideo} onChange={handleChange} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" placeholder="https://youtube.com/..." />
            </div>

          </div>

          <div className="mt-8 pt-6 border-t border-gray-100 flex gap-4">
            <button type="submit" className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm" disabled={saving}>
              <PlusCircle size={18} />
              {saving ? 'Saving to Sheet...' : 'Save System'}
            </button>
            <button type="button" onClick={() => navigate('/index_systems')} className="flex items-center gap-2 px-6 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-semibold transition-colors shadow-sm">
              <X size={18} />
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateIndex;
