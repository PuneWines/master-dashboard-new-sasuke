import { useState, useEffect } from "react"
import { LogOut, Search, Menu, X, Construction, GraduationCap, Award, Target, Briefcase } from 'lucide-react'
import { useNavigate } from "react-router-dom";
import HomePage from "../pages/AllUsers";
import { fetchSystemsApi } from "../redux/api/systemsApi";

// Under Construction Component
function UnderConstruction() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="text-center max-w-2xl">
        <div className="mb-8 relative">
          <Construction className="w-32 h-32 mx-auto text-sky-500 animate-bounce" />
        </div>
        <h1 className="text-4xl font-bold text-gray-800 mb-4">Under Construction</h1>
        <p className="text-xl text-gray-600 mb-8">This module is currently being developed and will be available soon.</p>
      </div>
    </div>
  )
}

export default function UserLayout({ children, darkMode, toggleDarkMode }) {
  const [activeRoute, setActiveRoute] = useState("HOME")
  const [currentUrl, setCurrentUrl] = useState("")
  const [isIframeVisible, setIsIframeVisible] = useState(false)
  const [showUnderConstruction, setShowUnderConstruction] = useState(false)
  const navigate = useNavigate();
  const [systems, setSystems] = useState([]);
  const [username] = useState(() => localStorage.getItem("user-name"));

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

    const updateTabs = () => {
      try {
        const storedAccess = localStorage.getItem("system_access");
        const accessArray = storedAccess ? JSON.parse(storedAccess) : [];
        const mappedAccess = accessArray.map(tab => {
          const trimmed = tab.trim();
          return tabNameMap[trimmed] || trimmed;
        });
        setAllowedTabs(mappedAccess);
      } catch (err) {
        setAllowedTabs([]);
      }
    };

    updateTabs();
    window.addEventListener('storage', updateTabs);
    return () => window.removeEventListener('storage', updateTabs);
  }, []);

  useEffect(() => {
    const savedRoute = localStorage.getItem("activeRoute");
    const savedUrl = localStorage.getItem("currentUrl");
    if (savedRoute) setActiveRoute(savedRoute);
    if (savedUrl) {
      setCurrentUrl(savedUrl);
      setIsIframeVisible(!!savedUrl);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("activeRoute", activeRoute);
    localStorage.setItem("currentUrl", currentUrl);
  }, [activeRoute, currentUrl]);

  const topNavRoutes = [
    { id: "HOME", label: "HOME", url: "" },
    ...systems.map((s) => ({
      id: s.systems,
      label: s.systems,
      url: s.link || "",
    })),
  ];

  const isAdmin = localStorage.getItem("role")?.toLowerCase().includes("admin");

  const filteredRoutes = topNavRoutes.filter(route => {
    const name = route.label;
    if (name === "HOME") return true;
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
    if (id === "HOME") {
      setIsIframeVisible(false);
      setShowUnderConstruction(false);
      setCurrentUrl("");
      return;
    }
    if (!url || url.trim() === "") {
      setShowUnderConstruction(true);
      setIsIframeVisible(false);
      setCurrentUrl("");
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

  return (
    <div className={`flex flex-col h-screen overflow-hidden ${darkMode ? 'dark bg-gray-900' : 'bg-white'}`}>
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="flex items-center justify-between px-4 py-0">
          <div className="flex items-center justify-start relative w-80 h-28">
            <img src="/logo.png" alt="Logo" className="h-full w-full object-contain object-left" />
          </div>
          <div className="flex items-center gap-4">
            <div className="text-gray-700 font-medium text-sm">Welcome, {username || "User"}</div>
            <div onClick={handleLogout} className="w-10 h-10 bg-sky-600 hover:bg-sky-800 rounded-full flex items-center justify-center cursor-pointer transition">
              <LogOut className="text-white w-5 h-5" />
            </div>
          </div>
        </div>
      </header>

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

      <main className="flex-1 overflow-y-auto bg-white">
        {!isIframeVisible && !showUnderConstruction && <HomePage />}
        {showUnderConstruction && <UnderConstruction />}
        {isIframeVisible && currentUrl && (
          <div className="h-full relative">
            <iframe src={currentUrl} className="w-full h-full border-0" title="System" allow="*" allowFullScreen />
          </div>
        )}
      </main>
    </div>
  )
}
