import { useState, useEffect } from "react"
import { LogOut, Search, Menu, X, ChevronDown, Bookmark, Code, GraduationCap, Award, Construction, Users, Target, Briefcase, TrendingUp, CheckCircle } from 'lucide-react'
import { useNavigate, Link, useLocation } from "react-router-dom";
import HomePage from "../pages/AllUsers";
import {
  fetchSystemsApi,
  createSystemApi,
  updateSystemApi,
  deleteSystemApi,
} from "../redux/api/systemsApi";

// Under Construction Component
function UnderConstruction() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="text-center max-w-2xl">
        <div className="mb-8 relative">
          <Construction className="w-32 h-32 mx-auto text-sky-500 animate-bounce" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-40 h-40 bg-sky-100 rounded-full animate-ping opacity-20"></div>
          </div>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
          Under Construction
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          This module is currently being developed and will be available soon.
        </p>
      </div>
    </div>
  )
}

export default function AdminLayout({ children, darkMode, toggleDarkMode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [activeRoute, setActiveRoute] = useState("HOME")
  const [currentUrl, setCurrentUrl] = useState("")
  const [isIframeVisible, setIsIframeVisible] = useState(false)
  const [showUnderConstruction, setShowUnderConstruction] = useState(false)
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const [systems, setSystems] = useState([]);
  const [showSystemModal, setShowSystemModal] = useState(false);
  const [editSystem, setEditSystem] = useState(null);
  const [username, setUsername] = useState(() => localStorage.getItem("user-name"));
  const isAdmin = localStorage.getItem("role")?.toLowerCase().includes("admin");
  const [isSavingSystem, setIsSavingSystem] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  // Tab filtering state
  const [allowedTabs, setAllowedTabs] = useState([]);

  const tabNameMap = {
    "Petty Cash": "Petty Cash Tally",
    "Whatsapp send message": "Whatsapp Send Message",
    "Home": "HOME"
  };

  const loadSystems = async () => {
    const data = await fetchSystemsApi();
    setSystems(data);
  };

  useEffect(() => {
    loadSystems();

    // Load allowed tabs from localStorage
    const updateTabs = () => {
      try {
        const storedAccess = localStorage.getItem("master_page_access");
        const accessArray = storedAccess ? JSON.parse(storedAccess) : [];

        // Map common names and trim
        const mappedAccess = accessArray.map(tab => {
          const trimmed = String(tab).trim();
          return tabNameMap[trimmed] || trimmed;
        });

        setAllowedTabs(mappedAccess);
      } catch (err) {
        console.error("Error parsing master_page_access", err);
        setAllowedTabs([]);
      }
    };

    updateTabs();

    // Listen for storage changes (helpful if login happens in same tab session)
    window.addEventListener('storage', updateTabs);
    return () => window.removeEventListener('storage', updateTabs);
  }, []);

  useEffect(() => {
    const savedRoute = localStorage.getItem("activeRoute");
    const savedUrl = localStorage.getItem("currentUrl");
    if (savedRoute) setActiveRoute(savedRoute);
    if (savedUrl) {
      if (savedUrl.startsWith("/")) {
        setCurrentUrl("");
        setIsIframeVisible(false);
      } else {
        setCurrentUrl(savedUrl);
        setIsIframeVisible(!!savedUrl);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("activeRoute", activeRoute);
    localStorage.setItem("currentUrl", currentUrl);
  }, [activeRoute, currentUrl]);

  // Sync active tab with URL path for integrated experience
  useEffect(() => {
    if (systems.length === 0) return;

    // Check if on HOME subpages
    // Check for master dashboard pages
    if (location.pathname === "/home/master" || location.pathname === "/home/users") {
      setActiveRoute("HOME");
      setIsIframeVisible(false);
      return;
    }

    // Match based on subsystem prefix
    const matchingSystem = systems.find(s => 
      s.link && s.link.startsWith("/") && location.pathname.startsWith(s.link)
    );

    if (matchingSystem) {
      setActiveRoute(matchingSystem.id.toString());
      setIsIframeVisible(false);
    }
  }, [location.pathname, systems]);


  const topNavRoutes = [
    { id: "HOME", label: "HOME", url: "/home/users" }, 
    ...systems.map((s) => ({
      id: s.id.toString(),
      label: s.systems,
      url: s.link || "",
    })),
    // Add Settings tab for admins
    ...(isAdmin ? [{ id: "SETTINGS", label: "Settings", url: "/settings" }] : []),
  ];

  const filteredRoutes = topNavRoutes.filter(route => {
    const name = route.label;
    if (name === "HOME") return true; // Default link visible for all
    // Admin always sees everything
    if (isAdmin) return true;
    // If access list contains "all" (any case) or "All", show everything
    if (allowedTabs.some(tab => tab.toLowerCase() === "all")) return true;
    // If no access list set, show everything
    if (allowedTabs.length === 0) return true;
    return allowedTabs.some(allowed => allowed.toLowerCase() === name.toLowerCase());
  });

  const handleRouteClick = (url, id) => {
    setActiveRoute(id);
    if (!url || url.trim() === "") {
      setShowUnderConstruction(true);
      setIsIframeVisible(false);
      setCurrentUrl("");
    } else if (url.startsWith("/")) {
      setIsIframeVisible(false);
      setShowUnderConstruction(false);
      setCurrentUrl("");
      navigate(url);
    } else {
      setCurrentUrl(url);
      setIsIframeVisible(true);
      setShowUnderConstruction(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    navigate("/login");
  };

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type }), 3000);
  };

  return (
    <div className={`flex flex-col h-screen overflow-hidden ${darkMode ? 'dark bg-gray-900' : 'bg-white'}`}>
      <header className={`bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm transition-transform duration-300 ${isHeaderVisible ? "translate-y-0" : "-translate-y-full"}`}>
        <div className="flex items-center justify-between px-4 py-0">
          <div className="flex items-center justify-start relative w-80 h-28">
            <img src="/logo.png" alt="Logo" className="h-full w-full object-contain object-left" />
          </div>
          <div className="flex items-center gap-4">
            <div className="text-gray-700 font-medium text-sm">
              Welcome, {username || "User"}
            </div>
            <div onClick={handleLogout} className="w-10 h-10 bg-sky-600 hover:bg-sky-800 rounded-full flex items-center justify-center cursor-pointer transition">
              <LogOut className="text-white w-5 h-5" />
            </div>
          </div>
        </div>
      </header>

      {/* //todo: i  */}

      {/* Blue Navbar */}
     <nav className="bg-gradient-to-r from-sky-900 via-blue-600 to-sky-500 text-white sticky top-[64px] z-40 shadow-lg">
        <div className="flex items-center overflow-x-auto scrollbar-hide">
          {filteredRoutes.map((route) => (
            <button
              key={route.id}
              onClick={() => handleRouteClick(route.url, route.id)}
              className={`px-6 py-4 text-sm font-bold whitespace-nowrap transition-all border-r border-white/10 hover:bg-white/10 ${activeRoute === route.id ? "bg-white/20 shadow-inner" : ""
                }`}
            >
              {route.label}
            </button>
          ))}
        </div>
      </nav> 

      <main className={`flex-1 ${location.pathname.startsWith('/hr_product') ? 'overflow-hidden' : 'overflow-y-auto'} bg-white`}>

        {!isIframeVisible && !showUnderConstruction && (children || <HomePage />)}
        {showUnderConstruction && <UnderConstruction />}
        {isIframeVisible && currentUrl && (
          <div className="h-full relative">
            <iframe src={currentUrl} className="w-full h-full border-0" title="System" allow="*" allowFullScreen />
          </div>
        )}
      </main>

      {showSystemModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl p-6 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">{editSystem ? "Edit System" : "Manage Systems"}</h2>
              <button onClick={() => setShowSystemModal(false)} className="text-gray-500 hover:text-gray-700"><X /></button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              setIsSavingSystem(true);
              try {
                const name = e.target.systems.value.trim();
                const link = e.target.link.value.trim();
                if (editSystem) await updateSystemApi(editSystem.id, { systems: name, link });
                else await createSystemApi({ systems: name, link });
                showToast(editSystem ? "System updated" : "System added");
                e.target.reset();
                setEditSystem(null);
                loadSystems();
              } catch (err) { showToast("Action failed", "error"); }
              finally { setIsSavingSystem(false); }
            }} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <input name="systems" defaultValue={editSystem?.systems || ""} placeholder="System Name" className="border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none" required />
              <input name="link" defaultValue={editSystem?.link || ""} placeholder="System Link" className="border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none" />
              <div className="md:col-span-2 flex justify-end gap-3">
                {editSystem && <button type="button" onClick={() => setEditSystem(null)} className="px-6 py-2 border border-gray-300 rounded-lg">Cancel</button>}
                <button type="submit" disabled={isSavingSystem} className="bg-sky-600 text-white px-8 py-2 rounded-lg font-bold hover:bg-sky-700 transition disabled:bg-gray-400">
                  {isSavingSystem ? "Saving..." : (editSystem ? "Update System" : "Add System")}
                </button>
              </div>
            </form>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 uppercase text-xs font-bold text-gray-500">
                  <tr>
                    <th className="p-4">System</th>
                    <th className="p-4">Link</th>
                    <th className="p-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 italic">
                  {systems.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50 transition">
                      <td className="p-4 font-medium text-gray-800">{s.systems}</td>
                      <td className="p-4 text-sky-600 truncate max-w-[200px]"><a href={s.link} target="_blank" rel="noreferrer">{s.link}</a></td>
                      <td className="p-4 text-center space-x-4">
                        <button onClick={() => setEditSystem(s)} className="text-blue-600 hover:text-blue-800 font-bold">Edit</button>
                        <button onClick={async () => { if (confirm("Delete this system?")) { await deleteSystemApi(s.id); loadSystems(); } }} className="text-red-600 hover:text-red-800 font-bold">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {toast.show && (
        <div className={`fixed top-5 right-5 z-[9999] px-6 py-3 rounded-lg shadow-xl text-white font-bold animate-slide-in ${toast.type === "success" ? "bg-green-600" : "bg-red-600"}`}>
          {toast.message}
        </div>
      )}
    </div>
  )
}