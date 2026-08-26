/**
 * Global auth state (Zustand). Holds the current user + a coarse status the
 * router guards read. Tokens themselves live only in SecureStore (tokenVault) —
 * this store never persists them.
 *
 *  - hydrate():   called once on launch. If a refresh token exists, fetch /me;
 *                 on any failure, drop to signed-out.
 *  - setSession(): after login / register / verify — stores tokens + user.
 *  - signOut():   best-effort server logout (blacklist), then clear + reset.
 *
 * Subscribes to sessionEvents so a dead session (failed refresh in the API
 * layer) flips the app to signed-out automatically.
 */
import { create } from "zustand";
import { tokenVault } from "@/shared/auth/token-store";
import { sessionEvents } from "@/shared/api";
import type { AuthTokens, User } from "@/entities/user";
import { authApi } from "../api/auth-api";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthState {
  status: AuthStatus;
  user: User | null;
  hydrate: () => Promise<void>;
  setSession: (user: User, tokens: AuthTokens) => Promise<void>;
  refreshUser: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: "loading",
  user: null,

  hydrate: async () => {
    if (!(await tokenVault.hasSession())) {
      set({ status: "unauthenticated", user: null });
      return;
    }
    try {
      const user = await authApi.me();
      set({ status: "authenticated", user });
    } catch {
      await tokenVault.clear();
      set({ status: "unauthenticated", user: null });
    }
  },

  setSession: async (user, tokens) => {
    await tokenVault.setTokens(tokens);
    set({ status: "authenticated", user });
  },

  refreshUser: async () => {
    try {
      const user = await authApi.me();
      set({ user });
    } catch {
      /* transient — the API interceptor handles hard session failures */
    }
  },

  signOut: async () => {
    const refresh = await tokenVault.getRefresh();
    if (refresh) {
      try {
        await authApi.logout(refresh);
      } catch {
        /* best-effort: even if the server call fails, clear locally */
      }
    }
    await tokenVault.clear();
    set({ status: "unauthenticated", user: null });
  },
}));

// A session that can't be refreshed = signed out.
sessionEvents.onExpired(() => {
  useAuthStore.setState({ status: "unauthenticated", user: null });
});
