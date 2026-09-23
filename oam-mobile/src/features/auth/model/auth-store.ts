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
  lock: () => Promise<void>;
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
    // A saved session + a local PIN => go straight to the unlock screen. We do NOT
    // call the API here: an expired access token (which the interceptor refreshes
    // on the next real request) must not bounce a returning user to the password
    // screen. The user object is refreshed after the PIN is entered (see unlock()).
    if (await pinVault.has()) {
      set({ status: "locked", lockedName: (await pinVault.name()) || "" });
      return;
    }
    // Session but no PIN yet: confirm it's live, then continue authenticated.
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

  beginPinSetup: () => set({ pendingPin: true }),

  setPin: async (pin) => {
    const user = get().user;
    await pinVault.set(pin, user?.first_name || "");
    set({ pendingPin: false });
  },

  unlock: async (pin) => {
    const ok = await pinVault.verify(pin);
    if (ok) {
      set({ status: "authenticated" });
      try {
        const user = await authApi.me();
        set({ user });
      } catch {
        /* token refresh / session handling covers a stale token here */
      }
    }
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

  // Lock the app WITHOUT signing out: keep the session + PIN, just require the
  // PIN to get back in. This is what "log out & return with your PIN" needs — a
  // real signOut would destroy the session and force an email/password login.
  lock: async () => {
    if (!(await pinVault.has())) { await get().signOut(); return; }  // no PIN -> real sign out
    set({ status: "locked", lockedName: (await pinVault.name()) || get().user?.first_name || "" });
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
