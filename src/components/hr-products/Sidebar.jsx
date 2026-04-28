import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  Search,
  Phone,
  UserCheck,
  UserX,
  UserMinus,
  AlarmClockCheck,
  Users,
  Calendar,
  DollarSign,
  FileText as LeaveIcon,
  User as ProfileIcon,
  Clock,
  LogOut as LogOutIcon,
  X,
  User,
  Menu,
  ChevronDown,
  ChevronUp,
  Book,
  BadgeDollarSign,
  BookPlus,
  Wallet
} from 'lucide-react';

const COMMON_MENU_ITEMS = [
  { path: 'my-profile', icon: ProfileIcon, label: 'My Profile' },
  { path: 'my-attendance', icon: Clock, label: 'My Attendance' },
  { path: 'leave-request', icon: LeaveIcon, label: 'Leave Request' },
  { path: 'my-salary', icon: DollarSign, label: 'My Salary' },
  { path: 'advance', icon: Wallet, label: 'Advance' },
  { path: 'company-calendar', icon: Calendar, label: 'Company Calendar' },
];

const SidebarContent = ({ onClose, isCollapsed = false, user, menuItems, attendanceOpen, onToggleAttendance, holidayOpen, onToggleHoliday }) => (
  <div className={`flex flex-col h-full ${isCollapsed ? 'w-16' : 'w-64'} bg-indigo-900 text-white shadow-2xl`}>
    <div className="flex items-center justify-between p-5 border-b border-indigo-800/50">
      {!isCollapsed && (
        <h1 className="text-xl font-black flex items-center gap-3 text-white tracking-tight">
          <div className="p-2 bg-white/10 rounded-xl">
             <Users size={20} className="text-white" />
          </div>
          <span>HR FMS</span>
        </h1>
      )}
      {onClose && (
        <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 transition-colors lg:hidden">
          <X className="h-6 w-6" />
        </button>
      )}
    </div>
    
    <nav className="flex-1 py-6 px-3 space-y-1.5 overflow-y-auto scrollbar-hide">
      {menuItems.map((item, index) => {
        if (item.type === 'divider') {
          return (
            <div key={`divider-${index}`} className="px-4 py-4 pt-6">
              <div className="border-t border-indigo-700/50 flex items-center">
                <span className="bg-indigo-900 pr-3 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">
                  {item.label}
                </span>
              </div>
            </div>
          );
        }
        if (item.type === 'dropdown') {
          const isOpen = item.label === 'Attendance' ? attendanceOpen : holidayOpen;
          const onToggle = item.label === 'Attendance' ? onToggleAttendance : onToggleHoliday;
          
          return (
            <div key={item.label}>
              <button
                onClick={onToggle}
                className={`flex items-center justify-between w-full py-3 px-4 rounded-xl transition-all duration-200 ${
                  isOpen ? 'bg-indigo-800 text-white shadow-lg' : 'text-indigo-100 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="flex items-center">
                  <item.icon className={isCollapsed ? 'mx-auto' : 'mr-3'} size={18} />
                  {!isCollapsed && <span className="font-bold text-sm">{item.label}</span>}
                </div>
                {!isCollapsed && (isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
              </button>
              {isOpen && !isCollapsed && (
                <div className="ml-7 mt-2 space-y-1 border-l-2 border-indigo-700/50 pl-2">
                  {item.items.map((subItem) => (
                    <NavLink 
                      key={subItem.path}
                      to={subItem.path} 
                      className={({ isActive }) => `flex items-center py-2 px-4 rounded-lg transition-all text-sm ${isActive ? 'bg-indigo-700 text-white font-bold' : 'text-indigo-200 hover:bg-white/5 hover:text-white'}`}
                      onClick={onClose}
                    >
                      <span>{subItem.label}</span>
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          );
        }
        return (
          <NavLink 
            key={item.path}
            to={item.path} 
            className={({ isActive }) => `flex items-center py-3 px-4 rounded-xl transition-all duration-200 ${isActive ? 'bg-indigo-800 text-white shadow-lg ring-1 ring-white/10' : 'text-indigo-100 hover:bg-white/10 hover:text-white'}`}
            onClick={onClose}
          >
            <item.icon className={isCollapsed ? 'mx-auto' : 'mr-3'} size={18} />
            {!isCollapsed && <span className="font-bold text-sm">{item.label}</span>}
          </NavLink>
        );
      })}
    </nav>

    <div className="p-4 border-t border-white/10">
      {/* Redundant auth controls removed - handled in global header */}
    </div>
  </div>
);

const Sidebar = ({ onClose }) => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [attendanceOpen, setAttendanceOpen] = useState(false);
  const [holidayOpen, setHolidayOpen] = useState(false);

  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : null;

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('employeeId');
    navigate('/login', { replace: true });
  };

  const adminMenuItems = [
    { path: '', icon: LayoutDashboard, label: 'Dashboard' },
    { path: 'indent', icon: FileText, label: 'Indent' },
    { path: 'find-enquiry', icon: Search, label: 'Find Enquiry' },
    { path: 'call-tracker', icon: Phone, label: 'Call Tracker' },
    { path: 'after-joining-work', icon: UserCheck, label: 'After Joining Work' },
    { path: 'leaving', icon: UserX, label: 'Leaving' },
    { path: 'after-leaving-work', icon: UserMinus, label: 'After Leaving Work' },
    { path: 'employee', icon: Users, label: 'Employee' },
    { path: 'leave-management', icon: BookPlus, label: 'Leave Management' },
    {
      type: 'dropdown',
      icon: Book,
      label: 'Attendance',
      items: [
        { path: 'attendance', label: 'Attendance Monthly' },
        { path: 'attendancedaily', label: 'Attendance Daily' }
      ]
    },
    { path: 'payroll', icon: BadgeDollarSign, label: 'Payroll' },
    {
      type: 'dropdown',
      icon: Calendar,
      label: 'Holiday',
      items: [
        { path: 'holiday-list', label: 'Holiday List' },
        { path: 'working-day-calendar', label: 'Working Day Calendar' }
      ]
    },
    { path: 'misreport', icon: AlarmClockCheck, label: 'MIS Report' },
    { path: 'admin-advance', icon: Wallet, label: 'Admin Advance' },
  ];

  let menuItems = [];
  if (user?.Admin === 'Yes') {
    menuItems = adminMenuItems;
  } else {
    try {
        const tabAccessRaw = localStorage.getItem('tab_system_access');
        const tabAccess = tabAccessRaw ? JSON.parse(tabAccessRaw) : {};
        const hrTabs = (tabAccess['HR Product'] || []).map(t => t.toLowerCase().trim());
        
        // Check both lists in case they were given employee or admin tabs explicitly
        const combined = [...COMMON_MENU_ITEMS, ...adminMenuItems];
        
        menuItems = combined.map(item => {
            if (item.type === 'dropdown') {
                const subItems = item.items.filter(sub => hrTabs.includes(sub.label.toLowerCase().trim()));
                return subItems.length > 0 ? { ...item, items: subItems } : null;
            }
            if (hrTabs.includes(item.label.toLowerCase().trim())) return item;
            return null;
        }).filter(Boolean);

        // Fallback for safety if empty
        if (menuItems.length === 0) {
            menuItems = COMMON_MENU_ITEMS;
        }
    } catch (e) {
        menuItems = COMMON_MENU_ITEMS;
    }
  }

  return (
    <>
      <button className="md:hidden fixed top-4 left-4 z-50 p-2 bg-indigo-900 text-white rounded-xl shadow-lg border border-white/10" onClick={() => setIsOpen(true)}>
        <Menu size={24} />
      </button>

      <div className="hidden lg:block h-full flex-shrink-0">
        <SidebarContent 
          user={user} 
          menuItems={menuItems} 
          attendanceOpen={attendanceOpen} 
          onToggleAttendance={() => {
            setAttendanceOpen(!attendanceOpen);
            setHolidayOpen(false);
          }}
          holidayOpen={holidayOpen}
          onToggleHoliday={() => {
            setHolidayOpen(!holidayOpen);
            setAttendanceOpen(false);
          }}
        />
      </div>

      <div className={`fixed inset-0 z-[60] lg:hidden transition-all duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="fixed inset-0 bg-indigo-950/60 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
        <div className={`fixed left-0 top-0 h-full z-[70] transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out`}>
          <SidebarContent 
            onClose={() => setIsOpen(false)} 
            user={user} 
            menuItems={menuItems} 
            attendanceOpen={attendanceOpen} 
            onToggleAttendance={() => {
              setAttendanceOpen(!attendanceOpen);
              setHolidayOpen(false);
            }}
            holidayOpen={holidayOpen}
            onToggleHoliday={() => {
              setHolidayOpen(!holidayOpen);
              setAttendanceOpen(false);
            }}
          />
        </div>
      </div>
    </>
  );
};

export default Sidebar;