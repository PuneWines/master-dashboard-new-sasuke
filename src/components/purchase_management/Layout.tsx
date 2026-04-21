import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { storageUtils } from '../../utils/purchase_management/storage';
import { User } from '../../types/purchase_management';

/**
 * PurchaseManagement Layout
 *
 * This is the inner layout for the Purchase Management subproject.
 * It wraps the Sidebar + <Outlet /> for all child pages.
 *
 * AUTO-LOGIN:
 * On mount, it reads the master dashboard's localStorage ("user", "user-name", "role")
 * and maps it to the purchase_app_user format, so the subproject pages find a
 * logged-in user without needing their own Login page.
 */
const PurchaseManagementLayout: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    // Check if purchase_app_user is already set
    const existingUser = storageUtils.getCurrentUser();
    if (existingUser) {
      setCurrentUser(existingUser);
      return;
    }

    // AUTO-LOGIN: Map master dashboard localStorage to purchase_app_user format
    const masterUserRaw = localStorage.getItem('user');
    const masterUserName = localStorage.getItem('user-name');
    const masterRole = localStorage.getItem('role');

    if (masterUserRaw || masterUserName) {
      let masterUser: any = null;
      try {
        masterUser = masterUserRaw ? JSON.parse(masterUserRaw) : null;
      } catch {
        masterUser = null;
      }

      const isAdmin = masterUser?.Admin === 'Yes' || masterRole?.toLowerCase() === 'admin';

      const purchaseUser: User = {
        id: masterUser?.email_id || masterUser?.Email || masterUserName || 'master-user',
        username: masterUser?.Name || masterUserName || 'User',
        role: isAdmin ? 'admin' : 'user',
        pageAccess: 'all', // Master dashboard users have full access
        shopName: masterUser?.ShopName || 'all',
      };

      storageUtils.setCurrentUser(purchaseUser);
      setCurrentUser(purchaseUser);
    }
  }, []);

  return (
    <div className="flex h-full bg-gray-50">
      {/* Hamburger Menu Button — Only visible on mobile */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-20 left-4 z-50 p-2 bg-slate-900 text-white rounded-lg shadow-lg hover:bg-slate-800 transition-colors"
        aria-label="Toggle menu"
      >
        {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        currentUser={currentUser}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default PurchaseManagementLayout;
