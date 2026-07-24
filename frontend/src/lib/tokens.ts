/**
 * JWT token storage (localStorage).
 *
 * Stores the access + refresh pair from the OAM backend. localStorage is the
 * standard, simplest choice for a JWT SPA at launch. If you later want tighter
 * security, this is the ONE file to change — swap the get/set/clear internals
 * for in-memory + httpOnly refresh cookie, and nothing else needs to move.
 */

const ACCESS_KEY = "oam.access";
const REFRESH_KEY = "oam.refresh";

export type TokenPair = { access: string; refresh: string };

export const tokenStore = {
  get access(): string | null {
    return localStorage.getItem(ACCESS_KEY);
  },
  get refresh(): string | null {
    return localStorage.getItem(REFRESH_KEY);
  },
  set(pair: TokenPair) {
    localStorage.setItem(ACCESS_KEY, pair.access);
    localStorage.setItem(REFRESH_KEY, pair.refresh);
  },
  setAccess(access: string) {
    localStorage.setItem(ACCESS_KEY, access);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
  get hasSession(): boolean {
    return Boolean(localStorage.getItem(REFRESH_KEY));
  },
};

/** Decode a JWT payload without a library (no verification — display only). */
export function decodeJwt<T = Record<string, unknown>>(token: string): T | null {
  try {
    const payload = token.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}
