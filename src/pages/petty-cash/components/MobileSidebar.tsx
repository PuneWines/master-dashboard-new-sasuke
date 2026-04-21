// ============================================================
// MobileSidebar.tsx - RBAC-aware (mirrors Sidebar.tsx logic)
// Changes: Uses hasPageAccess() from context, no sheet re-fetch
// ============================================================
import {
  FaHome,
  FaFileInvoice,
  FaMoneyBillWave,
  FaChartBar,
  FaTimes,
  FaSignOutAlt,
  FaChevronDown,
  FaChevronRight,
} from "react-icons/fa";
import { useAuth } from "../contexts/AuthContext";
import { useState } from 'react';

interface MobileSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

// Exact page names from Login sheet Column E
const PAGE = {
  DASHBOARD: "Dashboard",
  PETTY_CASH: "Petty Cash Form",
  COUNTER_1: "Cash Tally - Counter 1",
  COUNTER_2: "Cash Tally - Counter 2",
  COUNTER_3: "Cash Tally - Counter 3",
  REPORTS: "Reports",
};

export default function MobileSidebar({
  activeTab,
  onTabChange,
  isOpen,
  onClose,
}: MobileSidebarProps) {
  const { logout, user, hasPageAccess } = useAuth();
  const [isCashTallyExpanded, setIsCashTallyExpanded] = useState(false);

  const handleTabClick = (tab: string) => {
    onTabChange(tab);
    onClose();
  };

  // Only visible counters for this user
  const visibleCounters = [
    { id: "cash-tally-1", label: "Counter 1", pageKey: PAGE.COUNTER_1 },
    { id: "cash-tally-2", label: "Counter 2", pageKey: PAGE.COUNTER_2 },
    { id: "cash-tally-3", label: "Counter 3", pageKey: PAGE.COUNTER_3 },
  ].filter((c) => hasPageAccess(c.pageKey));

  const showCashTally = visibleCounters.length > 0;

  const isCashTallyActive =
    activeTab === "cash-tally" ||
    activeTab === "cash-tally-1" ||
    activeTab === "cash-tally-2" ||
    activeTab === "cash-tally-3";

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
        onClick={onClose}
      />
      <aside className="fixed left-0 top-0 h-full w-64 bg-white shadow-lg z-50 lg:hidden flex flex-col transform transition-transform duration-300">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-[#2a5298] p-3 rounded-lg">
                <FaMoneyBillWave className="text-white text-2xl" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">Petty Cash</h1>
                <p className="text-xs text-gray-500">Management System</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg"
              aria-label="Close menu"
            >
              <FaTimes className="text-gray-600" />
            </button>
          </div>

        </div>

        {/* Nav */}
        <nav className="p-4 flex-1 overflow-y-auto">
          <ul className="space-y-1">

            {hasPageAccess(PAGE.DASHBOARD) && (
              <li>
                <button
                  onClick={() => handleTabClick("dashboard")}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    activeTab === "dashboard"
                      ? "bg-[#2a5298] text-white shadow-md"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <FaHome className="text-lg shrink-0" />
                  <span className="font-medium">Dashboard</span>
                </button>
              </li>
            )}

            {hasPageAccess(PAGE.PETTY_CASH) && (
              <li>
                <button
                  onClick={() => handleTabClick("petty-cash")}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    activeTab === "petty-cash"
                      ? "bg-[#2a5298] text-white shadow-md"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <FaFileInvoice className="text-lg shrink-0" />
                  <span className="font-medium">Petty Cash Form</span>
                </button>
              </li>
            )}

            {showCashTally && (
              <li>
                <button
                  onClick={() => setIsCashTallyExpanded((p) => !p)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    isCashTallyActive
                      ? "bg-[#2a5298] text-white shadow-md"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <FaMoneyBillWave className="text-lg shrink-0" />
                  <span className="font-medium flex-1 text-left">Cash Tally</span>
                  {isCashTallyExpanded ? (
                    <FaChevronDown className="text-sm" />
                  ) : (
                    <FaChevronRight className="text-sm" />
                  )}
                </button>
                {isCashTallyExpanded && (
                  <ul className="ml-8 mt-1 space-y-1">
                    {visibleCounters.map((counter) => (
                      <li key={counter.id}>
                        <button
                          onClick={() => handleTabClick(counter.id)}
                          className={`w-full flex items-center px-4 py-2 rounded-lg transition-all duration-200 text-sm ${
                            activeTab === counter.id
                              ? "bg-[#2a5298] text-white shadow-md"
                              : "text-gray-600 hover:bg-gray-100"
                          }`}
                        >
                          {counter.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            )}

            {hasPageAccess(PAGE.REPORTS) && (
              <li>
                <button
                  onClick={() => handleTabClick("reports")}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    activeTab === "reports"
                      ? "bg-[#2a5298] text-white shadow-md"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <FaChartBar className="text-lg shrink-0" />
                  <span className="font-medium">Reports</span>
                </button>
              </li>
            )}
          </ul>

        </nav>

      </aside>
    </>
  );
}
