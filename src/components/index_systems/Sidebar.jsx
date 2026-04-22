import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, PlusSquare } from 'lucide-react';

const Sidebar = () => {
  return (
    <aside className="w-64 bg-white border-r border-gray-100 h-full flex flex-col shadow-sm">
      {/* Header */}
      <div className="p-6 text-center mt-4 mb-4">
        <h1 className="text-2xl font-bold text-[#4F46E5] tracking-tight">Pune Wines</h1>
        <p className="text-[10px] text-gray-500 font-semibold tracking-widest mt-1 uppercase">MANAGEMENT SYSTEM</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col mt-2">
        <NavLink 
          to="/index_systems" 
          end
          className={({ isActive }) => 
            `flex items-center gap-3 px-6 py-3 transition-all ${
              isActive 
                ? 'bg-[#EEF2FF] text-[#4F46E5] font-semibold border-l-4 border-[#4F46E5]' 
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-l-4 border-transparent'
            }`
          }
        >
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </NavLink>

        <NavLink 
          to="/index_systems/create" 
          className={({ isActive }) => 
            `flex items-center gap-3 px-6 py-3 transition-all ${
              isActive 
                ? 'bg-[#EEF2FF] text-[#4F46E5] font-semibold border-l-4 border-[#4F46E5]' 
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-l-4 border-transparent'
            }`
          }
        >
          <PlusSquare size={20} />
          <span>Create Index</span>
        </NavLink>
      </nav>
    </aside>
  );
};

export default Sidebar;
