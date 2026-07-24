import {
  createContext, useContext, useEffect, useState, useCallback, type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { authApi, type User } from "./authApi";
import { tokenStore } from "../lib/tokens";

type AuthState = {
  user: User | null;
  loading: boolean;              // true while restoring session on first load
  isAuthenticated: boolean;
  isVerified: boolean;
  login: (identifier: string, password: string) => Promise<User>;
  register: Parameters<typeof authApi.register>[0] extends infer P
    ? (input: P & Record<string, unknown>) => Promise<User>
    : never;
  verifyOtp: (identifier: string, code: string) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthCtx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  /**
   * Wipe every cached query.
   *
   * TanStack Query caches by query key, and our keys ("wallet", "orders"…)
   * don't include the user — so without this, signing in as a second person on
   * the same browser shows them the PREVIOUS user's wallet balance and
   * transactions until each query happens to refetch. That's a privacy leak,
   * not just a stale-data glitch, so we clear on every identity change:
   * login, register, OTP verification, and logout.
   */
  const resetCache = useCallback(() => {
    queryClient.clear();
  }, [queryClient]);

  // Restore session on first load: if a refresh token exists, fetch /me.
  useEffect(() => {
    let active = true;
    (async () => {
      if (!tokenStore.hasSession) {
        setLoading(false);
        return;
      }
      try {
        const me = await authApi.me();
        if (active) setUser(me);
      } catch {
        tokenStore.clear();
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // React to a forced logout from the api interceptor (refresh failed).
  useEffect(() => {
    function onLogout() {
      setUser(null);
      resetCache();
    }
    window.addEventListener("oam:logout", onLogout);
    return () => window.removeEventListener("oam:logout", onLogout);
  }, [resetCache]);

  const login = useCallback(async (identifier: string, password: string) => {
    resetCache();                       // drop anything the previous user left
    const { user } = await authApi.login({ identifier, password });
    setUser(user);
    resetCache();                       // and anything fetched mid-flight
    return user;
  }, [resetCache]);

  const register = useCallback(async (input: Record<string, unknown>) => {
    resetCache();
    const { user } = await authApi.register(input as never);
    setUser(user);
    resetCache();
    return user;
  }, [resetCache]);

  const verifyOtp = useCallback(async (identifier: string, code: string) => {
    const { user } = await authApi.verifyOtp({ identifier, code });
    setUser(user);
    resetCache();
    return user;
  }, [resetCache]);

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
    resetCache();                       // never leave a wallet on screen
  }, [resetCache]);

  const refreshUser = useCallback(async () => {
    const me = await authApi.me();
    setUser(me);
  }, []);

  const value: AuthState = {
    user,
    loading,
    isAuthenticated: Boolean(user),
    isVerified: Boolean(user?.is_verified),
    login,
    register: register as AuthState["register"],
    verifyOtp,
    logout,
    refreshUser,
  };

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
