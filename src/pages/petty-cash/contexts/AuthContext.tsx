// src/contexts/AuthContext.tsx
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// ----- Types -----

export interface User {
  username: string;   // From sheet Column B
  name: string;       // User's full name from Column A
  role: string;       // "Admin" | "Manager" | "User"
  pages: string[];    // Exact page names from sheet Column E
  shops: string[] | 'all'; // "all" or array of shop names from Column F
  initials: string;
  loginTime: string;
}

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: () => boolean;
  hasPageAccess: (pageName: string) => boolean;
  hasShopAccess: (shopName: string) => boolean;
  hasCounterAccess: (counter: number) => boolean;
  getAllowedCounters: () => number[];
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx5dryxS1R5zp6myFfUlP1QPimufTqh5hcPcFMNcAJ-FiC-hyQL9mCkgHSbLkOiWTibeg/exec";

// ----- Utilities -----

/** Pages parser for Login sheet Column E: e.g. "{Dashboard,Petty Cash Form}" */
export const parsePages = (raw: any): string[] => {
  if (!raw) return [];
  const str = raw.toString().replace(/[{}]/g, "").trim();
  if (!str) return [];
  return str.split(",").map((p: string) => p.trim()).filter((p: string) => p.length > 0);
};

/** Shops parser for Login sheet Column F: e.g. "all" or "BALAJI,TLS" */
export const parseShops = (raw: any): string[] | 'all' => {
  if (!raw) return 'all';
  const str = raw.toString().trim();
  if (str.toLowerCase() === 'all' || !str) return 'all';
  return str.split(",").map((s: string) => s.trim()).filter((s: string) => s.length > 0);
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUserState] = useState<User | null>(() => {
    // 1. Try to read from Master Dashboard auto-login first
    const masterUserStr = localStorage.getItem('user');
    const masterUsername = localStorage.getItem('user-name') || localStorage.getItem('email_id');

    if (masterUserStr && masterUsername) {
      try {
        const masterUser = JSON.parse(masterUserStr);
        return {
          username: masterUsername, // Usually email_id or username
          name: masterUsername,
          role: masterUser.Role || "User",
          pages: ["Dashboard"], // Default base minimum
          shops: [],
          initials: masterUsername.substring(0, 2).toUpperCase(),
          loginTime: new Date().toISOString(),
        } as User;
      } catch (err) {
        console.error('[AuthContext] Failed to parse Master User:', err);
      }
    }

    // 2. Fallback to normal session logic if not found
    const saved = localStorage.getItem('currentUser');
    if (saved) {
      try {
        return JSON.parse(saved) as User;
      } catch (err) {
        console.error('[AuthContext] Failed to parse saved session:', err);
        localStorage.removeItem('currentUser');
        return null;
      }
    }
    return null;
  });

  const [isSyncing, setIsSyncing] = useState(false);

  // Initial Sync Logic: Fetch latest permissions from sheet on mount if logged in
  useEffect(() => {
    if (user && !isSyncing) {
      refreshUserData();
    }
  }, []); // Run once on mount

  useEffect(() => {
    if (user) {
      localStorage.setItem('currentUser', JSON.stringify(user));
      localStorage.setItem('currentUserName', user.name);
      localStorage.setItem('currentUserRole', user.role);
    } else {
      localStorage.removeItem('currentUser');
      localStorage.removeItem('currentUserName');
      localStorage.removeItem('currentUserRole');
      localStorage.removeItem('userSession');
    }
  }, [user]);

  const setUser = (newUser: User | null) => {
    setUserState(newUser);
  };

  const isAdmin = (): boolean => {
    return user?.role?.toLowerCase().includes('admin') || false;
  };

  /** 
   * Fetches latest user data from the Login sheet to sync permissions (Role, Pages, Shops).
   * Does NOT require password as user is already authenticated locally.
   */
  const refreshUserData = async () => {
    if (!user) return;
    setIsSyncing(true);
    console.log(`[AuthContext] Refreshing data for: ${user.username}...`);

    try {
      const response = await fetch(`${SCRIPT_URL}?sheet=Login&action=fetch`);
      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

      const result = await response.json();
      if (!result.success || !result.data) return;

      const rows: any[][] = result.data; // Don't skip header, first row might be data
      const matchedRow = rows.find(
        (row: any[]) => row[1]?.toString().trim().toLowerCase() === user.username.trim().toLowerCase()
      );

      if (matchedRow) {
        const name = matchedRow[0]?.toString().trim() || "";
        const role = matchedRow[3]?.toString().trim() || "User";
        const pages = parsePages(matchedRow[4]);
        const shops = parseShops(matchedRow[5]);

        const initials = name
          .split(' ')
          .map((n: string) => n[0] || '')
          .join('')
          .toUpperCase()
          .slice(0, 2) || 'U';

        setUserState(prev => {
          if (!prev) return null;
          // Only update if something actually changed to avoid cycles
          const hasChanged =
            prev.role !== role ||
            JSON.stringify(prev.pages) !== JSON.stringify(pages) ||
            JSON.stringify(prev.shops) !== JSON.stringify(shops) ||
            prev.name !== name;

          if (hasChanged) {
            console.log("[AuthContext] User permissions updated from sheet.");
            return {
              ...prev,
              name,
              role,
              pages,
              shops,
              initials
            };
          }
          return prev;
        });
      }
    } catch (err) {
      console.error("[AuthContext] Sync failed:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const inputUser = username.trim().toLowerCase();
    const inputPass = password.trim();

    console.log(`[AuthContext] Login attempt for: "${inputUser}"`);

    // Fetch from Login sheet for real-time validation (Column B = ID, Column C = Password)
    try {
      const response = await fetch(`${SCRIPT_URL}?sheet=Login&action=fetch`);
      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

      const result = await response.json();
      if (!result.success || !result.data) {
        console.error("[AuthContext] Missing data in response:", result);
        return { success: false, error: "Authentication service unavailable." };
      }

      const rows: any[][] = result.data; // include all rows (no slice(1))
      console.log(`[AuthContext] Found ${rows.length} users in sheet.`);

      const matchedRow = rows.find(
        (row: any[]) => {
          const sheetUser = row[1]?.toString().trim().toLowerCase();
          const sheetPass = row[2]?.toString().trim();
          return sheetUser === inputUser && sheetPass === inputPass;
        }
      );

      if (matchedRow) {
        const name = matchedRow[0]?.toString().trim() || "";
        const role = matchedRow[3]?.toString().trim() || "User";
        const pages = parsePages(matchedRow[4]);
        const shops = parseShops(matchedRow[5]);

        const initials = name
          .split(' ')
          .map((n: string) => n[0] || '')
          .join('')
          .toUpperCase()
          .slice(0, 2) || 'U';

        const userData: User = {
          username: inputUser,
          name,
          role,
          pages,
          shops,
          initials,
          loginTime: new Date().toISOString(),
        };

        setUserState(userData);
        console.log(`[AuthContext] Login SUCCESS for: ${name}`);
        return { success: true };
      }

      console.warn(`[AuthContext] Login FAILED: No match for "${inputUser}"`);
      return { success: false, error: "Invalid User ID or password." };
    } catch (err) {
      console.error("[AuthContext] Login Error:", err);
      return { success: false, error: "Connection error. Please try again." };
    }
  };

  const logout = () => {
    setUserState(null);
  };

  const hasPageAccess = (pageName: string): boolean => {
    if (isAdmin()) return true;

    try {
      const tabAccessRaw = localStorage.getItem("tab_system_access");
      const tabAccess = tabAccessRaw ? JSON.parse(tabAccessRaw) : {};
      const pettyTabs = (tabAccess["Petty Cash Tally"] || []).map((t: string) => t.toLowerCase().trim().replace(/[^a-z0-9]/g, ''));
      
      const normalize = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
      const target = normalize(pageName);

      if (pettyTabs.includes(target)) return true;

      const aliases: Record<string, string[]> = {
        "pettycashform": ["pettycash", "advancefrommgmt", "expenses"],
        "cashtallycounter1": ["counter1", "cashtally1"],
        "cashtallycounter2": ["counter2", "cashtally2"],
        "cashtallycounter3": ["counter3", "cashtally3"],
        "dashboard": ["home"],
        "reports": ["report"]
      };

      const targetAliases = aliases[target] || [];
      if (pettyTabs.some((up: string) => targetAliases.includes(up))) return true;

      return false;
    } catch (e) {
      return false;
    }
  };

  const hasShopAccess = (shopName: string): boolean => {
    if (!user) return false;
    if (isAdmin()) return true;
    if (user.shops === 'all') return true;

    const shopList = Array.isArray(user.shops) ? user.shops : [];
    return shopList.some(
      (s) => s.trim().toLowerCase() === shopName?.trim().toLowerCase()
    );
  };

  const hasCounterAccess = (counter: number): boolean => {
    return hasPageAccess(`Cash Tally - Counter ${counter}`);
  };

  const getAllowedCounters = (): number[] => {
    const counters: number[] = [];
    if (hasCounterAccess(1)) counters.push(1);
    if (hasCounterAccess(2)) counters.push(2);
    if (hasCounterAccess(3)) counters.push(3);
    return counters;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        login,
        logout,
        isAuthenticated: !!user,
        isAdmin,
        hasPageAccess,
        hasShopAccess,
        hasCounterAccess,
        getAllowedCounters,
        refreshUserData
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};