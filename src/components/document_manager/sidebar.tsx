import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  FileText,
  Home,
  Menu,
  Plus,
  Share2,
  X,
  RefreshCw,
  Key,
} from "lucide-react";
import { useAuth } from "./auth-provider";

export function DocSidebar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close mobile menu when path changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Close mobile menu when screen size increases
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const sidebar = document.getElementById("doc-sidebar");
      const menuButton = document.getElementById("doc-menu-button");
      if (
        isMobileMenuOpen &&
        sidebar &&
        menuButton &&
        !sidebar.contains(event.target as Node) &&
        !menuButton.contains(event.target as Node)
      ) {
        setIsMobileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMobileMenuOpen]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  const isActive = (path: string) => {
    if (path === "/document_manager") return pathname === "/document_manager";
    if (path === "/document_manager/documents")
      return pathname === "/document_manager/documents";
    return pathname === path || pathname.startsWith(path + "/");
  };

  // Menu items 
  const menuItemsList = [
    { name: "Dashboard",     path: "/document_manager",                    icon: Home },
    { name: "Add Document",  path: "/document_manager/documents/add",      icon: Plus },
    { name: "All Documents", path: "/document_manager/documents",          icon: FileText },
    { name: "Renewal",       path: "/document_manager/documents/renewal",  icon: RefreshCw },
    { name: "Shared",        path: "/document_manager/shared",             icon: Share2 },
    { name: "License",       path: "/document_manager/documents/license",  icon: Key },
  ];

  const getFilteredMenuItems = () => {
    const role = localStorage.getItem("role")?.toLowerCase() || "";
    if (role.includes("admin")) return menuItemsList;

    try {
      const tabAccessRaw = localStorage.getItem("tab_system_access");
      const tabAccess = tabAccessRaw ? JSON.parse(tabAccessRaw) : {};
      const docTabs = (tabAccess["Document Manager"] || []).map((t: string) => t.toLowerCase().trim());
      
      const filtered = menuItemsList.filter(item => docTabs.includes(item.name.toLowerCase().trim()));
      return filtered.length > 0 ? filtered : menuItemsList;
    } catch (e) {
      return menuItemsList;
    }
  };

  const menuItems = getFilteredMenuItems();

  if (!mounted || !isLoggedIn) {
    return null;
  }

  return (
    <>
      {/* Mobile menu button */}
      <div className="md:hidden fixed top-16 left-4 z-40" id="doc-menu-button">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="bg-white text-[#407FF6] hover:bg-[#407FF6] hover:text-white p-2 h-10 w-10 rounded-lg shadow-sm border border-gray-200 flex items-center justify-center"
          aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
        >
          {isMobileMenuOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        id="doc-sidebar"
        className={`fixed md:sticky top-0 left-0 z-30 w-[85%] xs:w-[280px] md:w-64 bg-white text-gray-800 h-full flex flex-col transform transition-transform duration-300 ease-in-out ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        } shadow-lg border-r border-gray-200 flex-shrink-0`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-[#407FF6] to-[#A555F7]">
          <h1 className="text-xl font-semibold flex items-center text-white">
            <FileText className="mr-2 flex-shrink-0" />
            <span className="truncate">Document Manager</span>
          </h1>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="md:hidden text-white hover:bg-white/20 p-1 h-8 w-8 rounded flex items-center justify-center"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto">
          <nav className="space-y-1 p-4">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center p-3 rounded-md transition-colors ${
                  isActive(item.path)
                    ? "bg-gradient-to-r from-[#407FF6] to-[#A555F7] text-white font-medium"
                    : "text-gray-700 hover:bg-[#407FF6]/10 hover:text-[#407FF6]"
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <item.icon
                  className={`mr-3 h-5 w-5 flex-shrink-0 ${
                    isActive(item.path) ? "text-white" : "text-[#407FF6]"
                  }`}
                />
                <span className="truncate">{item.name}</span>
              </Link>
            ))}
          </nav>
        </div>

        {/* Footer — NO logout button; master AdminLayout handles logout */}
        <div className="p-4 border-t border-gray-200">
          <p className="text-xs text-gray-400 text-center">
            Powered by{" "}
            <a
              href="https://www.botivate.in"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#407FF6] hover:underline"
            >
              Botivate
            </a>
          </p>
        </div>
      </aside>
    </>
  );
}
