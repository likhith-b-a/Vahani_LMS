/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useState } from "react";
import { logoutUser } from "@/api/auth";

export type UserRole = "scholar" | "admin" | "tutor" | "programme_manager";

export interface Enrollment {
  id: string;
  status: string;
  title: string;
  createdAt: string;
  description: string;
  programmeManagerId: string;
  programmeManager: {
    name: string;
    email: string;
  };
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  refreshToken?: string;
  enrollments?: Enrollment[];
  accessToken?: string;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  setAuthData: (userData: User) => void;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

const readStoredToken = (key: string) => {
  const token = localStorage.getItem(key);
  return token && token.trim().length > 0 ? token : null;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem("user");
    return stored ? (JSON.parse(stored) as User) : null;
  });

  const [accessToken, setAccessToken] = useState<string | null>(() => {
    return readStoredToken("accessToken");
  });

  const [refreshToken, setRefreshToken] = useState<string | null>(() => {
    return readStoredToken("refreshToken");
  });

  const setAuthData = useCallback((userData: User) => {
    setUser(userData);
    setRefreshToken(userData.refreshToken || null);
    setAccessToken(userData.accessToken || null);

    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("accessToken", userData.accessToken || "");
    localStorage.setItem("refreshToken", userData.refreshToken || "");
  }, []);

  const clearAuthData = useCallback(() => {
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
    localStorage.removeItem("user");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
  }, []);

  React.useEffect(() => {
    if (!accessToken && !refreshToken) {
      clearAuthData();
    }
  }, [accessToken, clearAuthData, refreshToken]);

  React.useEffect(() => {
    const handleAuthExpired = () => {
      clearAuthData();
    };

    window.addEventListener("auth:expired", handleAuthExpired);
    return () => window.removeEventListener("auth:expired", handleAuthExpired);
  }, [clearAuthData]);

  const logout = useCallback(async () => {
    try {
      await logoutUser();
    } catch {
      // Clearing local auth still logs the user out on the client if the session is already invalid.
    } finally {
      clearAuthData();
    }
  }, [clearAuthData]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user && (!!accessToken || !!refreshToken),
        accessToken,
        refreshToken,
        setAuthData,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
