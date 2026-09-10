/**
 * Local device unlock PIN, stored in SecureStore (Keychain/Keystore, encrypted
 * at rest). This is a convenience lock over an already-authenticated session on
 * THIS device — not a server credential. "Switch account" clears it.
 */
import * as SecureStore from "expo-secure-store";

const PIN_KEY = "oam.pin";
const NAME_KEY = "oam.pin.name";

export const pinVault = {
  set: async (pin: string, name: string) => {
    await SecureStore.setItemAsync(PIN_KEY, String(pin));
    await SecureStore.setItemAsync(NAME_KEY, name || "");
  },
  has: async () => Boolean(await SecureStore.getItemAsync(PIN_KEY)),
  name: async () => (await SecureStore.getItemAsync(NAME_KEY)) || "",
  verify: async (pin: string) => {
    const stored = await SecureStore.getItemAsync(PIN_KEY);
    return Boolean(stored) && stored === String(pin);
  },
  clear: async () => {
    await SecureStore.deleteItemAsync(PIN_KEY);
    await SecureStore.deleteItemAsync(NAME_KEY);
  },
};
