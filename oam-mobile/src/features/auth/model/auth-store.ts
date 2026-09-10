/**
 * Global auth state (Zustand). Holds the current user + a coarse status the
 * router guards read. Tokens live only in SecureStore (tokenVault); the local
 * unlock PIN lives in pinVault.
 *
 *  - hydrate():   on launch. If a session exists AND a local unlock PIN is set,
 *                 the app opens "locked" (PIN screen). Otherwise authenticated.
 *  - setSession(): after login / register / verify — stores tokens + user.
 *  - setPin():    save a local unlock PIN for this device (created at signup).
 *  - unlock():    verify the entered PIN and, on success, open the app.
 *  - signOut():   server logout + clear tokens AND the local PIN (switch account).
 */
import { create } from "zustand";
import { tokenVault } from "@/shared/auth/token-store";
import { pinVault } from "@/shared/auth/pin-store";
import { sessionEvents } from "@/shared/api";
import type { AuthTokens, User } from "@/entities/user";
import { authApi } from "../api/auth-api";

export type AuthStatus = "loading" | "authenticated" | "locked" | "unauthenticated";

interface AuthState {
  status: AuthStatus;
  user: User | null;
  lockedName: string;
  pendingPin: boolean;
  hydrate: () => Promise<void>;
  setSession: (user: User, tokens: AuthTokens) => Promise<void>;
  beginPinSetup: () => void;
  setPin: (pin: string) => Promise<void>;
  unlock: (pin: string) => Promise<boolean>;
  refreshUser: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: "loading",
  user: null,
  lockedName: "",
  pendingPin: false,

  hydrate: async () => {
    if (!(await tokenVault.hasSession())) {
      set({ status: "unauthenticated", user: null });
      return;
    }
    try {
      const user = await authApi.me();
      if (await pinVault.has()) {
        set({ status: "locked", user, lockedName: (await pinVault.name()) || user.first_name || "" });
      } else {
        set({ status: "authenticated", user });
      }
    } catch {
      await tokenVault.clear();
      set({ status: "unauthenticated", user: null });
    }
  },

  setSession: async (user, tokens) => {
    await tokenVault.setTokens(tokens);
    set({ status: "authenticated", user });
  },

  beginPinSetup: () => set({ pendingPin: true }),

  setPin: async (pin) => {
    const user = get().user;
    await pinVault.set(pin, user?.first_name || "");
    set({ pendingPin: false });
  },

  unlock: async (pin) => {
    const ok = await pinVault.verify(pin);
    if (ok) set({ status: "authenticated" });
    return ok;
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
        /* best-effort */
      }
    }
    await tokenVault.clear();
    await pinVault.clear();
    set({ status: "unauthenticated", user: null, lockedName: "" });
  },
}));

// A session that can't be refreshed = signed out.
sessionEvents.onExpired(() => {
  useAuthStore.setState({ status: "unauthenticated", user: null, lockedName: "" });
});
