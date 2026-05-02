import React from 'react';
import {
  LayoutDashboard,
  FileText,
  CheckCircle,
  Send,
  Truck,
  Package,
  User
} from 'lucide-react';
import { storageUtils } from '../../utils/purchase_management/storage';
import { User as UserType } from '../../types/purchase_management';

import { NavLink } from 'react-router-dom';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  currentUser?: UserType | null;
}

// Helper function to check page access using global role based mapping
const hasPageAccess = (page: string, label: string): boolean => {
  const role = localStorage.getItem("role")?.toLowerCase() || "";
  if (role.includes("admin")) return true;

  try {
    const tabAccessRaw = localStorage.getItem("tab_system_access");
    const tabAccess = tabAccessRaw ? JSON.parse(tabAccessRaw) : {};
    const purchaseTabs = (tabAccess["Purchase App"] || []).map((t: string) => t.toLowerCase().trim());
    
    // Check against label name from SettingsPage
    return purchaseTabs.includes(label.toLowerCase().trim());
  } catch (e) {
    return false;
  }
};

const PAGE_ROUTES: Record<string, string> = {
  'dashboard': '/purchase_management',
  'ims-dashboard': '/purchase_management/ims-dashboard',
  'index-sheet': '/purchase_management/index-sheet',
  'daily-entry': '/purchase_management/daily-entry',
  'indent': '/purchase_management/indent',
  'approval': '/purchase_management/approval',
  'purchase-order': '/purchase_management/purchase-order',
  'get-lifting': '/purchase_management/get-lifting',
  'cross-check': '/purchase_management/cross-check',
};

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen = false,
  onClose,
  currentUser
}) => {
  const user = storageUtils.getCurrentUser();

  const allMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'ims-dashboard', label: 'IMS Dashboard', icon: LayoutDashboard },
    { id: 'index-sheet', label: 'Index Sheet', icon: FileText },
    { id: 'daily-entry', label: 'Daily Entry', icon: Package },
    { id: 'indent', label: 'Indent', icon: FileText },
    { id: 'approval', label: 'Approval', icon: CheckCircle },
    { id: 'purchase-order', label: 'Generate & Send PO', icon: Send },
    { id: 'get-lifting', label: 'Get Lifting', icon: Truck },
    { id: 'cross-check', label: 'Cross Check & Receive', icon: Package },
  ];

  // Filter menu items based on user permissions
  const menuItems = allMenuItems.filter(item => hasPageAccess(item.id, item.label));

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-30 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div
        className={`fixed lg:sticky top-0 left-0 z-40 w-64 bg-white text-slate-800 border-r border-slate-200 h-full flex-shrink-0 flex flex-col transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Package className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Purchase App</h1>
              <p className="text-sm text-slate-500">Management System</p>
            </div>
          </div>
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
          {/* Navigation */}
          <nav className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const route = PAGE_ROUTES[item.id] || `/purchase_management/${item.id}`;
              return (
                <NavLink
                  key={item.id}
                  to={route}
                  end={item.id === 'dashboard'}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `w-full flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-slate-700 hover:bg-blue-50 hover:text-blue-700'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-slate-600'}`} />
                      <span className="font-medium">{item.label}</span>
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>


      </div>
    </>
  );
};
