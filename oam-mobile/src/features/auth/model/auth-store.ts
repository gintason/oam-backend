/**
 * Global auth state (Zustand). Holds the current user + a coarse status the
 * router guards read. Tokens live only in SecureStore (tokenVault); the
 * returning account ("Welcome back, Ada") lives in accountVault.
 *
 *  - hydrate():            on launch. A remembered account opens the app "locked":
 *                          the Welcome-back screen asks for the password only.
 *  - setSession():         after login / register / verify / Google — stores tokens,
 *                          the user, and remembers the account on this device.
 *  - unlockWithPassword(): log the remembered account in with just its password.
 *  - signOut():            server logout + clear tokens; the account stays
 *                          remembered, so the next screen is Welcome back.
 *  - switchAccount():      sign out AND forget the account (full sign-in next).
 *  - rememberAccount():    remember a just-registered account (before it's verified),
 *                          so leaving the app mid-signup still lands on Welcome back.
 *  - completeVerification(): after the signup code is verified — remember the
 *                          account and send the user to Welcome back to log in
 *                          with their password (notice = "verified" shows a banner).
 */
import { create } from "zustand";
import { tokenVault } from "@/shared/auth/token-store";
import { accountVault, accountFromUser, type RememberedAccount } from "@/shared/auth/account-store";
import { sessionEvents } from "@/shared/api";
import type { AuthTokens, User } from "@/entities/user";
import { authApi } from "../api/auth-api";

export type AuthStatus = "loading" | "authenticated" | "locked" | "unauthenticated";

interface AuthState {
  status: AuthStatus;
  user: User | null;
  account: RememberedAccount | null;
  notice: "verified" | null;
  hydrate: () => Promise<void>;
  rememberAccount: (account: RememberedAccount) => Promise<void>;
  completeVerification: (user: User, tokens: AuthTokens) => Promise<void>;
  setSession: (user: User, tokens: AuthTokens) => Promise<void>;
  unlockWithPassword: (password: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  signOut: () => Promise<void>;
  switchAccount: () => Promise<void>;
}

async function revokeRefresh() {
  const refresh = await tokenVault.getRefresh();
  if (!refresh) return;
  try {
    await authApi.logout(refresh);
  } catch {
    /* best-effort */
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: "loading",
  user: null,
  account: null,
  notice: null,

  hydrate: async () => {
    await accountVault.clearLegacyPin();
    let account = await accountVault.get();

    // Signed in before this update (e.g. with the old unlock PIN) but no
    // remembered account yet: use the saved session once to learn who it is.
    if (!account && (await tokenVault.hasSession())) {
      try {
        const user = await authApi.me();
        account = accountFromUser(user);
        if (account) await accountVault.set(account);
      } catch {
        await tokenVault.clear();
      }
    }

    // Returning user: always ask for the password on launch (no API call here —
    // the password login below issues fresh tokens).
    set(account ? { status: "locked", account, user: null } : { status: "unauthenticated", account: null, user: null });
  },

  setSession: async (user, tokens) => {
    await tokenVault.setTokens(tokens);
    const account = accountFromUser(user);
    if (account) await accountVault.set(account);
    set({ status: "authenticated", user, account: account ?? get().account, notice: null });
  },

  rememberAccount: async (account) => {
    if (!account.identifier) return;
    await accountVault.set(account);
    set({ account });
  },

  completeVerification: async (user, tokens) => {
    const account = accountFromUser(user) ?? get().account;
    if (account) await accountVault.set(account);
    // The verify call returns a session; retire it — the user logs in with their password next.
    await tokenVault.setTokens(tokens);
    await revokeRefresh();
    await tokenVault.clear();
    set(account
      ? { status: "locked", user: null, account, notice: "verified" }
      : { status: "unauthenticated", user: null, account: null, notice: null });
  },

  unlockWithPassword: async (password) => {
    const account = get().account;
    if (!account) throw new Error("No saved account on this device. Please sign in.");
    const { user, tokens } = await authApi.login(account.identifier, password);
    await revokeRefresh();            // retire the previous session's refresh token
    await get().setSession(user, tokens);
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
    await revokeRefresh();
    await tokenVault.clear();
    const account = get().account;
    set({ status: account ? "locked" : "unauthenticated", user: null });
  },

  switchAccount: async () => {
    await revokeRefresh();
    await tokenVault.clear();
    await accountVault.clear();
    set({ status: "unauthenticated", user: null, account: null });
  },
}));

// A session that can't be refreshed = signed out (back to Welcome back if we know the user).
sessionEvents.onExpired(() => {
  const { account } = useAuthStore.getState();
  useAuthStore.setState({ status: account ? "locked" : "unauthenticated", user: null });
});
