import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { DocumentProvider } from "./document-context";

type AuthContextType = {
  isLoggedIn: boolean;
  userRole: string | null;
  userName: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  user: { email?: string; [key: string]: any } | null;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * DocAuthProvider — Auto-Login Adapter
 *
 * This provider does NOT show a login page. It reads the master dashboard's
 * localStorage keys set by the master LoginPage.jsx and auto-injects them
 * as the Document Manager's auth state. The user is always considered
 * logged in when they arrive here via the master dashboard.
 */
export function DocAuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      // Read from master dashboard localStorage keys
      const masterUserName = localStorage.getItem("user-name");
      const masterUserJson = localStorage.getItem("user");

      let masterUser: any = null;
      try {
        masterUser = masterUserJson ? JSON.parse(masterUserJson) : null;
      } catch {
        masterUser = null;
      }

      if (masterUserName || masterUser) {
        const resolvedName = masterUserName || masterUser?.Name || "User";
        const resolvedRole =
          masterUser?.Admin === "Yes"
            ? "admin"
            : masterUser?.Role?.toLowerCase() || "user";

        setIsLoggedIn(true);
        setUserName(resolvedName);
        setUserRole(resolvedRole);

        // Also set Document Manager's own keys so existing page logic works
        localStorage.setItem("isLoggedIn", "true");
        localStorage.setItem("userName", resolvedName);
        localStorage.setItem("userRole", resolvedRole);
      } else {
        // Fallback: check Document Manager's own keys
        const dmLoggedIn = localStorage.getItem("isLoggedIn") === "true";
        if (dmLoggedIn) {
          setIsLoggedIn(true);
          setUserName(localStorage.getItem("userName"));
          setUserRole(localStorage.getItem("userRole"));
        }
      }
    } catch (error) {
      console.error("DocAuthProvider: Error reading localStorage:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // No-op login — master handles login
  const login = async (_username: string, _password: string): Promise<boolean> => {
    return false;
  };

  // No-op logout — master AdminLayout handles logout
  const logout = () => {
    // intentionally empty — master logout button handles this
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        userRole,
        userName,
        user: null,
        login,
        logout,
      }}
    >
      <DocumentProvider>{children}</DocumentProvider>
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within a DocAuthProvider");
  }
  return context;
}
