import React, { useState, useEffect } from 'react';
import { Calendar, Trash2, Search, Plus, MapPin, Clock, ChevronRight } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { SCRIPT_URLS } from '../../utils/envConfig';

const HolidayList = () => {
    const [holidays, setHolidays] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        date: ''
    });

    const fetchHolidays = () => {
        setLoading(true);
        try {
            const savedHolidays = localStorage.getItem('local_holiday_list');
            if (savedHolidays) {
                setHolidays(JSON.parse(savedHolidays));
            } else {
                // Default holidays for demo
                const defaults = [
                    { id: 1, name: 'Independence Day', date: '2026-08-15' },
                    { id: 2, name: 'Ganesh Chaturthi', date: '2026-09-14' },
                    { id: 3, name: 'Ganesh Visarjan', date: '2026-09-23' },
                    { id: 4, name: 'Gandhi Jayanti', date: '2026-10-02' },
                    { id: 5, name: 'Republic Day', date: '2027-01-26' }
                ];
                setHolidays(defaults);
                localStorage.setItem('local_holiday_list', JSON.stringify(defaults));
            }
        } catch (error) {
            console.error('Error fetching holidays:', error);
            toast.error('Failed to load holiday list');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHolidays();
    }, []);

    const handleSave = (e) => {
        e.preventDefault();
        if (!formData.name || !formData.date) {
            toast.error('Please fill all fields');
            return;
        }

        setSaving(true);
        try {
            const newHoliday = {
                id: Date.now(),
                name: formData.name,
                date: formData.date
            };
            const updatedHolidays = [...holidays, newHoliday];
            setHolidays(updatedHolidays);
            localStorage.setItem('local_holiday_list', JSON.stringify(updatedHolidays));
            
            toast.success('Holiday added successfully');
            setFormData({ name: '', date: '' });
        } catch (error) {
            console.error('Error saving holiday:', error);
            toast.error('Failed to save holiday');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = (id) => {
        if (!window.confirm('Are you sure you want to delete this holiday?')) return;

        try {
            const updatedHolidays = holidays.filter(h => h.id !== id);
            setHolidays(updatedHolidays);
            localStorage.setItem('local_holiday_list', JSON.stringify(updatedHolidays));
            toast.success('Holiday deleted');
        } catch (error) {
            console.error('Error deleting holiday:', error);
            toast.error('Failed to delete holiday');
        }
    };

    const filteredHolidays = holidays.filter(h => 
        h.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        h.date.includes(searchTerm)
    ).sort((a, b) => new Date(a.date) - new Date(b.date));

    const formatDate = (dateStr) => {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        const day = d.getDate();
        const month = d.toLocaleString('en-US', { month: 'short' });
        const year = d.getFullYear();
        const weekday = d.toLocaleString('en-US', { weekday: 'long' }).toUpperCase();
        return {
            main: `${day} ${month} ${year}`,
            sub: weekday
        };
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="bg-white rounded-3xl p-8 shadow-xl border border-indigo-50/50 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16 opacity-50 group-hover:scale-110 transition-transform duration-500"></div>
                <div className="flex items-center gap-6 relative z-10">
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-blue-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200 ring-4 ring-indigo-50">
                        <Calendar size={32} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Holiday List</h1>
                        <p className="text-gray-500 font-medium mt-1">Manage and view annual holidays for the organization</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                {/* Form Section */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden sticky top-8">
                        <div className="p-6 border-b border-gray-50 flex items-center gap-3">
                            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                                <Plus size={18} />
                            </div>
                            <h3 className="text-lg font-bold text-gray-800">Add New Entry</h3>
                        </div>
                        <form onSubmit={handleSave} className="p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="text-[11px] font-black uppercase tracking-widest text-gray-400">Holiday Name</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-gray-800 placeholder:text-gray-300"
                                    placeholder="e.g. Independence Day"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[11px] font-black uppercase tracking-widest text-gray-400">Select Date</label>
                                <input
                                    type="date"
                                    value={formData.date}
                                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-gray-800"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full py-4 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-200 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100"
                            >
                                {saving ? 'SAVING...' : 'SAVE RECORD'}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Table Section */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
                        <div className="p-8 border-b border-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-gray-50/30">
                            <div className="flex items-center gap-3">
                                <h3 className="text-xl font-bold text-gray-800 tracking-tight">Existing Holidays</h3>
                                <span className="bg-indigo-100 text-indigo-700 text-xs font-black px-3 py-1 rounded-full border border-indigo-200">
                                    {holidays.length}
                                </span>
                            </div>
                            <div className="relative">
                                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Search holiday..."
                                    className="pl-12 pr-6 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-bold focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all w-full sm:w-64"
                                />
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50/50">
                                    <tr className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50">
                                        <th className="px-8 py-5">Date</th>
                                        <th className="px-8 py-5">Name</th>
                                        <th className="px-8 py-5 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {loading ? (
                                        <tr>
                                            <td colSpan="3" className="px-8 py-20 text-center">
                                                <div className="flex flex-col items-center gap-4">
                                                    <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                                    <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest animate-pulse">Loading holidays...</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : filteredHolidays.length > 0 ? (
                                        filteredHolidays.map((holiday) => {
                                            const { main, sub } = formatDate(holiday.date);
                                            return (
                                                <tr key={holiday.id} className="hover:bg-indigo-50/30 transition-all group">
                                                    <td className="px-8 py-6">
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-black text-gray-800">{main}</span>
                                                            <span className="text-[10px] font-bold text-gray-400">{sub}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <span className="text-sm font-bold text-gray-700 group-hover:text-indigo-600 transition-colors">{holiday.name}</span>
                                                    </td>
                                                    <td className="px-8 py-6 text-right">
                                                        <button
                                                            onClick={() => handleDelete(holiday.id)}
                                                            className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan="3" className="px-8 py-20 text-center">
                                                <p className="text-gray-400 font-medium">No holidays found</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HolidayList;
