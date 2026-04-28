import React, { useState, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, List, Info, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { SCRIPT_URLS } from '../../utils/envConfig';

const WorkingDayCalendar = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [workingDays, setWorkingDays] = useState([]);
    const [loading, setLoading] = useState(true);
    const [holidays, setHolidays] = useState([]);

    const fetchHolidaysAndWorkingDays = () => {
        setLoading(true);
        try {
            // Fetch holidays from localStorage
            const savedHolidays = localStorage.getItem('local_holiday_list');
            const holidayList = savedHolidays ? JSON.parse(savedHolidays).map(h => h.date) : [];
            setHolidays(holidayList);

            // Compute the calendar based on the current month and local holidays
            generateCalendar(currentDate, holidayList);
        } catch (error) {
            console.error('Error fetching data:', error);
            toast.error('Failed to load calendar data');
        } finally {
            setLoading(false);
        }
    };

    const generateCalendar = (date, holidayList) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        const days = [];
        for (let i = 1; i <= daysInMonth; i++) {
            const d = new Date(year, month, i);
            const dateStr = d.toISOString().split('T')[0];
            const isHoliday = holidayList.some(h => {
                const hd = new Date(h);
                return hd.getFullYear() === year && hd.getMonth() === month && hd.getDate() === i;
            });
            const isSunday = d.getDay() === 0;
            
            // Hindi week days mapping
            const hindiDays = ['रविवार', 'सोमवार', 'मंगलवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार'];
            const engDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            
            // Week number calculation
            const firstDayOfYear = new Date(year, 0, 1);
            const pastDaysOfYear = (d - firstDayOfYear) / 86400000;
            const weekNo = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);

            days.push({
                date: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
                dayOfWeek: `${hindiDays[d.getDay()]} (${engDays[d.getDay()]})`,
                weekNo: weekNo,
                tasks: Math.floor(Math.random() * 50),
                status: isHoliday ? 'HOLIDAY' : 'WORKING'
            });
        }
        setWorkingDays(days);
    };

    useEffect(() => {
        fetchHolidaysAndWorkingDays();
    }, [currentDate]);

    const navigateMonth = (direction) => {
        const newDate = new Date(currentDate);
        newDate.setMonth(currentDate.getMonth() + direction);
        setCurrentDate(newDate);
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'WORKING': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'HOLIDAY': return 'bg-rose-100 text-rose-700 border-rose-200';
            case 'OFF DAY': return 'bg-gray-100 text-gray-500 border-gray-200';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="bg-white rounded-3xl p-8 shadow-xl border border-indigo-50/50 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 opacity-50 group-hover:scale-110 transition-transform duration-500"></div>
                <div className="flex items-center gap-6 relative z-10">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200 ring-4 ring-blue-50">
                        <List size={32} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Working Days Management</h1>
                        <p className="text-gray-500 font-medium mt-1">Configure operational availability and scheduled work days</p>
                    </div>
                </div>

                <div className="flex items-center gap-4 relative z-10 bg-gray-50 p-2 rounded-2xl border border-gray-100">
                    <button onClick={() => navigateMonth(-1)} className="p-3 hover:bg-white hover:shadow-md rounded-xl transition-all text-gray-600">
                        <ChevronLeft size={20} />
                    </button>
                    <div className="px-6 py-2 bg-white rounded-xl shadow-sm border border-gray-100 min-w-[160px] text-center font-black text-gray-800 uppercase tracking-widest text-sm">
                        {currentDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
                    </div>
                    <button onClick={() => navigateMonth(1)} className="p-3 hover:bg-white hover:shadow-md rounded-xl transition-all text-gray-600">
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            {/* Legend & Stats */}
            <div className="flex flex-wrap items-center justify-between gap-6 bg-white p-6 rounded-3xl shadow-lg border border-gray-50">
                <div className="flex items-center gap-8">
                    <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-200"></div>
                        <span className="text-[11px] font-black uppercase tracking-widest text-gray-500">Working</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-rose-500 shadow-sm shadow-rose-200"></div>
                        <span className="text-[11px] font-black uppercase tracking-widest text-gray-500">Holiday</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-gray-400 shadow-sm shadow-gray-200"></div>
                        <span className="text-[11px] font-black uppercase tracking-widest text-gray-500">Off Day</span>
                    </div>
                </div>
                <div className="bg-blue-50 px-6 py-2 rounded-full border border-blue-100 flex items-center gap-3">
                    <span className="text-blue-700 font-black text-sm tracking-widest">
                        {workingDays.filter(d => d.status === 'WORKING').length} WORKING DAYS
                    </span>
                </div>
            </div>

            {/* Table Section */}
            <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
                <div className="p-8 border-b border-gray-50 bg-gray-50/30">
                    <h3 className="text-xl font-bold text-gray-800 tracking-tight">
                        Schedule for {currentDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
                    </h3>
                </div>
                <div className="overflow-x-auto max-h-[600px] custom-scrollbar">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50/50 sticky top-0 z-10 backdrop-blur-md">
                            <tr className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50">
                                <th className="px-8 py-5">Date</th>
                                <th className="px-8 py-5">Day of Week</th>
                                <th className="px-8 py-5 text-center">Week No.</th>
                                <th className="px-8 py-5 text-center">Tasks</th>
                                <th className="px-8 py-5 text-right">Operational Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="px-8 py-20 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest animate-pulse">Calculating schedule...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : workingDays.map((day, idx) => (
                                <tr key={idx} className="hover:bg-blue-50/20 transition-all group">
                                    <td className="px-8 py-5">
                                        <span className="text-sm font-bold text-gray-700">{day.date}</span>
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className="text-sm font-medium text-gray-500">{day.dayOfWeek}</span>
                                    </td>
                                    <td className="px-8 py-5 text-center">
                                        <span className="text-sm font-bold text-gray-400">— {day.weekNo} —</span>
                                    </td>
                                    <td className="px-8 py-5 text-center">
                                        <div className="flex justify-center">
                                            <span className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-black shadow-md shadow-blue-100">
                                                {day.tasks}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black tracking-widest border transition-all ${getStatusStyle(day.status)}`}>
                                            {day.status === 'WORKING' && <CheckCircle2 size={14} />}
                                            {day.status === 'HOLIDAY' && <Info size={14} />}
                                            {day.status === 'OFF DAY' && <XCircle size={14} />}
                                            {day.status}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default WorkingDayCalendar;
