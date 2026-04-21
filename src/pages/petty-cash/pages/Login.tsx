import { useState } from "react";
import { FaLock, FaUser, FaWallet } from "react-icons/fa";
import { useAuth } from "../contexts/AuthContext";

export default function Login() {
  const [username, setUsername] = useState(""); // User ID matching Column B
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    if (!username.trim() || !password.trim()) {
      setError("Please enter both User ID and password");
      setIsLoading(false);
      return;
    }

    try {
      const result = await login(username, password);
      
      if (!result.success) {
        setError(result.error || "Invalid User ID or password.");
      }
      // If success, AuthContext sets the user state and App.tsx handles redirection
    } catch (err) {
      console.error("[Login] Submit Error:", err);
      setError("Connection error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1e3c72] to-[#2a5298] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-10 transform transition-all hover:scale-[1.01]">
          <div className="flex justify-center mb-6">
            <div className="bg-[#1e3c72] p-4 rounded-full shadow-lg">
              <FaWallet className="text-white text-4xl" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">Petty Cash</h1>
          <p className="text-center text-gray-500 mb-8 font-medium">Authentication Portal</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">User ID</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center group-focus-within:text-[#1e3c72]">
                  <FaUser className="text-gray-400 transition-colors" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#1e3c72] focus:border-transparent outline-none transition-all placeholder:text-gray-300"
                  placeholder="Enter your system ID"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center group-focus-within:text-[#1e3c72]">
                  <FaLock className="text-gray-400 transition-colors" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#1e3c72] focus:border-transparent outline-none transition-all placeholder:text-gray-300"
                  placeholder="••••••••"
                  disabled={isLoading}
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm animate-shake">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-[#1e3c72] to-[#2a5298] text-white py-3.5 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 active:scale-95"
            >
              {isLoading ? "Validating..." : "Sign In"}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-100 italic text-center text-xs text-gray-400">
            Secure multi-shop petty cash management system
          </div>
        </div>
      </div>
    </div>
  );
}