// ============================================================
// Sidebar.tsx - RBAC-aware navigation
// Changes:
//   - REMOVED the useEffect that re-fetched the Login sheet
//   - REMOVED local allowedPages state
//   - Uses hasPageAccess() from AuthContext directly per menu item
//   - Cash Tally dropdown: only renders counters user has access to
//   - Cash Tally parent item hidden entirely if no counters accessible
// ============================================================
import { useState } from "react";
import {
  FaHome,
  FaFileInvoice,
  FaMoneyBillWave,
  FaChartBar,
  FaSignOutAlt,
  FaChevronDown,
  FaChevronRight,
  FaBars,
  FaTimes,
} from "react-icons/fa";
import { useAuth } from "../contexts/AuthContext";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isHovered: boolean;
  setIsHovered: (hovered: boolean) => void;
}

// Exact page name strings as stored in the Login sheet (Column E)
const PAGE = {
  DASHBOARD: "Dashboard",
  PETTY_CASH: "Petty Cash Form",
  COUNTER_1: "Cash Tally - Counter 1",
  COUNTER_2: "Cash Tally - Counter 2",
  COUNTER_3: "Cash Tally - Counter 3",
  REPORTS: "Reports",
};

export default function Sidebar({ activeTab, onTabChange, isHovered, setIsHovered }: SidebarProps) {
  const { logout, user, hasPageAccess } = useAuth();
  const [isCashTallyExpanded, setIsCashTallyExpanded] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  // Remove local isHovered

  const handleTabChange = (tab: string) => {
    onTabChange(tab);
    setIsMobileMenuOpen(false);
  };

  // Determine which counters are visible
  const visibleCounters = [
    { id: "cash-tally-1", label: "Counter 1", pageKey: PAGE.COUNTER_1 },
    { id: "cash-tally-2", label: "Counter 2", pageKey: PAGE.COUNTER_2 },
    { id: "cash-tally-3", label: "Counter 3", pageKey: PAGE.COUNTER_3 },
  ].filter((c) => hasPageAccess(c.pageKey));

  // Cash Tally parent shows only if at least one counter is accessible
  const showCashTally = visibleCounters.length > 0;

  // Is any cash tally sub-tab currently active?
  const isCashTallyActive =
    activeTab === "cash-tally" ||
    activeTab === "cash-tally-1" ||
    activeTab === "cash-tally-2" ||
    activeTab === "cash-tally-3";

  const SidebarContent = ({ expanded = true }: { expanded?: boolean }) => (
    <div className={`flex flex-col h-full transition-all duration-300 ${expanded ? 'w-64' : 'w-20'}`}>
      {/* Brand Header */}
      <div className={`p-4 border-b border-gray-200 overflow-hidden`}>
        <div className={`flex items-center gap-3 ${expanded ? 'mb-4' : 'mb-0 justify-center'}`}>
          <div className="bg-[#2a5298] p-3 rounded-lg shrink-0">
            <FaMoneyBillWave className="text-white text-2xl" />
          </div>
          {expanded && (
            <div className="whitespace-nowrap opacity-100 transition-opacity duration-300">
              <h1 className="text-xl font-bold text-gray-800">Petty Cash</h1>
              <p className="text-xs text-gray-500">Management System</p>
            </div>
          )}
        </div>

      </div>

      {/* Navigation */}
      <nav className="p-3 flex-1 overflow-y-auto overflow-x-hidden">
        <ul className="space-y-1">

          {/* Dashboard */}
          {hasPageAccess(PAGE.DASHBOARD) && (
            <li>
              <button
                onClick={() => handleTabChange("dashboard")}
                title={!expanded ? "Dashboard" : ""}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  activeTab === "dashboard"
                    ? "bg-[#2a5298] text-white shadow-md"
                    : "text-gray-700 hover:bg-gray-100"
                } ${!expanded ? 'justify-center px-0' : ''}`}
              >
                <FaHome className="text-xl shrink-0" />
                {expanded && <span className="font-medium whitespace-nowrap">Dashboard</span>}
              </button>
            </li>
          )}

          {/* Petty Cash Form */}
          {hasPageAccess(PAGE.PETTY_CASH) && (
            <li>
              <button
                onClick={() => handleTabChange("petty-cash")}
                title={!expanded ? "Petty Cash Form" : ""}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  activeTab === "petty-cash"
                    ? "bg-[#2a5298] text-white shadow-md"
                    : "text-gray-700 hover:bg-gray-100"
                } ${!expanded ? 'justify-center px-0' : ''}`}
              >
                <FaFileInvoice className="text-xl shrink-0" />
                {expanded && <span className="font-medium whitespace-nowrap">Petty Cash Form</span>}
              </button>
            </li>
          )}

          {/* Cash Tally (dropdown) */}
          {showCashTally && (
            <li>
              <button
                onClick={() => expanded && setIsCashTallyExpanded((prev) => !prev)}
                title={!expanded ? "Cash Tally" : ""}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  isCashTallyActive
                    ? "bg-[#2a5298] text-white shadow-md"
                    : "text-gray-700 hover:bg-gray-100"
                } ${!expanded ? 'justify-center px-0' : ''}`}
              >
                <FaMoneyBillWave className="text-xl shrink-0" />
                {expanded && (
                  <>
                    <span className="font-medium flex-1 text-left whitespace-nowrap">Cash Tally</span>
                    {isCashTallyExpanded ? (
                      <FaChevronDown className="text-sm" />
                    ) : (
                      <FaChevronRight className="text-sm" />
                    )}
                  </>
                )}
              </button>

              {expanded && isCashTallyExpanded && (
                <ul className="ml-8 mt-1 space-y-1 animation-slideDown">
                  {visibleCounters.map((counter) => (
                    <li key={counter.id}>
                      <button
                        onClick={() => handleTabChange(counter.id)}
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

          {/* Reports */}
          {hasPageAccess(PAGE.REPORTS) && (
            <li>
              <button
                onClick={() => handleTabChange("reports")}
                title={!expanded ? "Reports" : ""}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  activeTab === "reports"
                    ? "bg-[#2a5298] text-white shadow-md"
                    : "text-gray-700 hover:bg-gray-100"
                } ${!expanded ? 'justify-center px-0' : ''}`}
              >
                <FaChartBar className="text-xl shrink-0" />
                {expanded && <span className="font-medium whitespace-nowrap">Reports</span>}
              </button>
            </li>
          )}

        </ul>

      </nav>


    </div>
  );

  return (
    <>
      {/* ── Mobile Header with Hamburger ── */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-white shadow-md z-50 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-[#2a5298] p-2 rounded-lg">
            <FaMoneyBillWave className="text-white text-lg" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-800">Petty Cash</h1>
            <p className="text-xs text-gray-500">Management System</p>
          </div>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="text-gray-700 text-2xl p-2"
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? <FaTimes /> : <FaBars />}
        </button>
      </div>

      {/* ── Mobile Backdrop ── */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* ── Mobile Sidebar ── */}
      <aside
        className={`lg:hidden fixed left-0 top-0 h-full w-64 bg-white shadow-lg z-50 transform transition-transform duration-300 ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarContent expanded={true} />
      </aside>

      {/* ── Desktop Sidebar (Auto-Expanding) ── */}
      <aside 
        className={`hidden lg:block sticky top-0 h-[100vh] bg-white shadow-lg z-40 transition-all duration-300 ease-in-out border-r border-gray-100 ${
          isHovered ? "w-64" : "w-20"
        }`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
            setIsHovered(false);
            setIsCashTallyExpanded(false); // Optionally collapse submenus when leaving
        }}
      >
        <SidebarContent expanded={isHovered} />
      </aside>
    </>
  );
}