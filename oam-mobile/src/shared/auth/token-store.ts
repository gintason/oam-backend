/**
 * Secure JWT vault — the mobile equivalent of the web's tokenStore, but backed
 * by Expo SecureStore (Keychain on iOS, Keystore on Android) instead of
 * localStorage. Same keys the web uses. All methods are async (SecureStore is).
 */
import * as SecureStore from "expo-secure-store";

const ACCESS_KEY = "oam.access";
const REFRESH_KEY = "oam.refresh";

export type TokenPair = { access: string; refresh: string };

export const tokenVault = {
  getAccess: () => SecureStore.getItemAsync(ACCESS_KEY),
  getRefresh: () => SecureStore.getItemAsync(REFRESH_KEY),

  async setTokens(pair: TokenPair) {
    await SecureStore.setItemAsync(ACCESS_KEY, pair.access);
    await SecureStore.setItemAsync(REFRESH_KEY, pair.refresh);
  },
  setAccess: (access: string) => SecureStore.setItemAsync(ACCESS_KEY, access),

  async clear() {
    await SecureStore.deleteItemAsync(ACCESS_KEY);
    await SecureStore.deleteItemAsync(REFRESH_KEY);
  },

  async hasSession() {
    return Boolean(await SecureStore.getItemAsync(REFRESH_KEY));
  },
};

/** Decode a JWT payload (display only — no verification). */
export function decodeJwt<T = Record<string, unknown>>(token: string): T | null {
  try {
    const part = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(part)) as T; // atob is available in Hermes on SDK 57
  } catch {
    return null;
  }
}
