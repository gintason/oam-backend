/**
 * The account last signed in on THIS device, kept in SecureStore so the app can
 * greet a returning user by name and ask only for their password ("Welcome
 * back, Ada"). It holds no secrets: name, the identifier to log in with, and
 * how they usually sign in. "Switch account" forgets it.
 */
import * as SecureStore from "expo-secure-store";
import type { User } from "@/entities/user";

const ACCOUNT_KEY = "oam.account";
// Keys from the removed unlock-PIN feature; deleted on launch.
const LEGACY_PIN_KEYS = ["oam.pin", "oam.pin.name"];

export type RememberedAccount = {
  name: string;          // first name, for "Welcome back, …"
  identifier: string;    // email or phone — what we log in with
  email: string | null;
  phone: string | null;
  provider: string;      // "email" | "phone" | "google" | …
};

export function accountFromUser(user: User): RememberedAccount | null {
  const identifier = user.email || user.phone;
  if (!identifier) return null;
  return {
    name: (user.first_name || "").trim(),
    identifier,
    email: user.email,
    phone: user.phone,
    provider: user.auth_provider || "email",
  };
}

export const accountVault = {
  async get(): Promise<RememberedAccount | null> {
    try {
      const raw = await SecureStore.getItemAsync(ACCOUNT_KEY);
      const acc = raw ? (JSON.parse(raw) as RememberedAccount) : null;
      return acc?.identifier ? acc : null;
    } catch {
      return null;
    }
  },
  set: (acc: RememberedAccount) => SecureStore.setItemAsync(ACCOUNT_KEY, JSON.stringify(acc)),
  clear: () => SecureStore.deleteItemAsync(ACCOUNT_KEY),
  async clearLegacyPin() {
    for (const k of LEGACY_PIN_KEYS) await SecureStore.deleteItemAsync(k).catch(() => {});
  },
};

/** "pe•••••n@gmail.com" / "+234 ••• ••• 4567" — enough to recognise, not to copy. */
export function maskIdentifier(acc: Pick<RememberedAccount, "email" | "phone" | "identifier">): string {
  if (acc.email) {
    const [user, domain] = acc.email.split("@");
    if (!domain) return acc.email;
    const head = user.slice(0, Math.min(2, user.length));
    const tail = user.length > 3 ? user.slice(-1) : "";
    return `${head}${"•".repeat(Math.max(3, user.length - head.length - tail.length))}${tail}@${domain}`;
  }
  const digits = (acc.phone || acc.identifier).replace(/\s+/g, "");
  if (digits.length < 7) return digits;
  const cc = digits.startsWith("+") ? digits.slice(0, 4) + " " : "";
  return `${cc}••• ••• ${digits.slice(-4)}`;
}
