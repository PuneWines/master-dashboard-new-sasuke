"use client";

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { LoginCredentialsApi, SYSTEMS } from "../redux/api/loginApi";

const LoginPage = () => {
  const navigate = useNavigate();

  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });

  const [toast, setToast] = useState({ show: false, message: "", type: "" });
  const [typedText, setTypedText] = useState("");
  const [isTyping, setIsTyping] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const welcomeText = "Welcome To Jagwani Office";
  const typingSpeed = 100;

  useEffect(() => {
    // Auto-login if already authenticated
    const existingUser = localStorage.getItem("user") || localStorage.getItem("user-name");
    if (existingUser) {
      navigate("/home/users", { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    if (isTyping) {
      if (typedText.length < welcomeText.length) {
        const timeout = setTimeout(() => {
          setTypedText(welcomeText.substring(0, typedText.length + 1));
        }, typingSpeed);
        return () => clearTimeout(timeout);
      } else {
        setIsTyping(false);
      }
    }
  }, [typedText, isTyping]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoginLoading(true);

    try {
      const result = await LoginCredentialsApi(formData);

      if (result.data) {
        const data = result.data;
        // Clear old data first
        localStorage.clear();

        // Save user data to localStorage
        localStorage.setItem("employee_id", data.employee_id || "");
        localStorage.setItem("employeeId", data.employee_id || "");
        localStorage.setItem("user-name", data.user_name || "");
        localStorage.setItem("role", data.role || "");
        localStorage.setItem("email_id", data.email_id || "");
        localStorage.setItem("number", data.number || "");
        localStorage.setItem("shops_name", data.shops_name || "");
        
        // Save Master Page Access (Array) & Tab System Access (Object)
        const masterAccess = data.master_page_access || [];
        const tabAccess = data.tab_system_access || {};
        localStorage.setItem("master_page_access", JSON.stringify(masterAccess));
        localStorage.setItem("tab_system_access", JSON.stringify(tabAccess));

        // Compatibility 'user' object for other components
        const compatibilityUser = {
          Name: data.user_name || "",
          Role: data.role || "",
          Email: data.email_id || "",
          Admin: (data.role?.toLowerCase() === "admin") ? "Yes" : "No"
        };
        localStorage.setItem("user", JSON.stringify(compatibilityUser));

        // Save system_access mapping based on Master Page Access
        const allowedSystems = SYSTEMS.filter(sys => 
            compatibilityUser.Admin === "Yes" || 
            masterAccess.includes('All') ||
            masterAccess.includes('ALL') ||
            masterAccess.includes(sys.name)
        ).map(s => s.url);
        localStorage.setItem("system_access", JSON.stringify(allowedSystems));

        showToast("Login Successful!", "success");

        setTimeout(() => {
          navigate("/home/users", { replace: true });
        }, 1000);
      } else {
        showToast(result.error || "Invalid credentials", "error");
      }
    } catch (err) {
      console.error("Login Error:", err);
      showToast("Login failed. Please try again.", "error");
    } finally {
      setIsLoginLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const showToast = (message, type) => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: "", type: "" });
    }, 5000);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4">
      <div className="w-full max-w-md shadow-2xl border border-indigo-100 rounded-2xl bg-white overflow-hidden">
        <div className="flex justify-center pt-2">
          <div className="relative">
            <img
              src="/logo.png"
              alt="Jagwani Logo"
              className="relative h-42 w-full object-contain"
            />
          </div>
        </div>

        <div className="px-8 pt-0 pb-2 text-center">
          <div className="flex justify-center items-center">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-sky-400 to-blue-600 bg-clip-text text-transparent">
              {typedText}
              {isTyping && (
                <span className="ml-1 inline-block w-[2px] h-7 bg-gradient-to-b from-sky-500 to-blue-500 animate-pulse"></span>
              )}
            </h1>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-8 pt-2 pb-4 space-y-4">
          <div className="relative group">
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2 ml-1">
              <i className="fas fa-user mr-2 text-sky-500"></i> Enter your username
            </label>
            <div className="relative">
              <input
                id="username"
                name="username"
                type="text"
                required
                value={formData.username}
                onChange={handleChange}
                className="w-full px-4 py-3 pl-11 bg-gray-50 border border-gray-200 rounded-xl 
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                         transition-all duration-300 group-hover:border-blue-300 
                         placeholder:text-gray-400 shadow-sm"
              />
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                <i className="fas fa-user text-gray-400"></i>
              </div>
            </div>
          </div>

          <div className="relative group">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2 ml-1">
              <i className="fas fa-key mr-2 text-sky-500"></i> Enter your password
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-3 pl-11 bg-gray-50 border border-gray-200 rounded-xl 
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                         transition-all duration-300 group-hover:border-blue-300 
                         placeholder:text-gray-400 shadow-sm"
              />
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                <i className="fas fa-lock text-gray-400"></i>
              </div>
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {formData.password && (
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="text-gray-500 hover:text-blue-500 focus:outline-none"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={isLoginLoading}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-sky-400 to-blue-600 
                       text-white font-medium rounded-xl shadow-lg hover:shadow-xl 
                       transform hover:-translate-y-0.5 transition-all duration-300 
                       disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {isLoginLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center justify-center text-black font-bold">
                  <i className="fas fa-sign-in-alt mr-2"></i>
                  Sign In to Dashboard
                </span>
              )}
            </button>
          </div>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
          </div>
        </form>

        <div className="px-8 py-4 bg-gradient-to-r from-blue-50 to-purple-50 border-t border-gray-100">
          <div className="text-center">
            <a
              href="https://www.botivate.in/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-sm text-gray-600 hover:text-blue-600 transition-colors group"
            >
              <span className="mr-1">Powered by</span>
              <span className="font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent group-hover:from-blue-700 group-hover:to-purple-700">
                Botivate
              </span>
              <i className="fas fa-external-link-alt ml-2 text-xs text-gray-400 group-hover:text-blue-500"></i>
            </a>
          </div>
        </div>
      </div>

      {toast.show && (
        <div
          className={`fixed bottom-6 right-6 px-6 py-4 rounded-xl shadow-2xl transition-all duration-300 transform ${toast.type === "success"
            ? "bg-gradient-to-r from-green-50 to-emerald-50 text-green-800 border border-green-200"
            : "bg-gradient-to-r from-red-50 to-pink-50 text-red-800 border border-red-200"
            }`}
          style={{
            animation: "slideInRight 0.3s ease-out",
          }}
        >
          <div className="flex items-center">
            <div className={`mr-3 ${toast.type === "success" ? "text-green-500" : "text-red-500"}`}>
              {toast.type === "success" ? (
                <i className="fas fa-check-circle text-xl"></i>
              ) : (
                <i className="fas fa-exclamation-circle text-xl"></i>
              )}
            </div>
            <div>
              <div className="font-medium">
                {toast.type === "success" ? "Success" : "Error"}
              </div>
              <div className="text-sm">{toast.message}</div>
            </div>
            <button
              onClick={() => setToast({ show: false, message: "", type: "" })}
              className="ml-4 text-gray-400 hover:text-gray-600"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default LoginPage;