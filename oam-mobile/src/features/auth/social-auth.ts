/**
 * Native Google sign-in for OAM mobile.
 *
 * @react-native-google-signin needs the native "RNGoogleSignin" module, which
 * only exists in a custom dev/preview/production build — NOT in Expo Go. We
 * detect Expo Go up front and never even require the module there, so the app
 * runs fine (the Google button is simply hidden). In a real build the module
 * is present, the button appears, and sign-in works.
 *
 * Token audience
 * --------------
 * The ID token Google returns is issued for `webClientId` (its `aud`), on iOS
 * and Android alike. The backend accepts only the IDs in GOOGLE_CLIENT_IDS, so
 * EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID must be the same *Web application* client
 * ID the backend (and the website, VITE_GOOGLE_CLIENT_ID) uses. The Android
 * and iOS OAuth clients must live in the same Google Cloud project as that
 * web client, or Google refuses the sign-in (DEVELOPER_ERROR).
 */
import Constants from "expo-constants";

// OAM's one Google Cloud project: "OAM Platform" (74521252008). Web, backend
// and mobile all use it. The web client ID is the backend's GOOGLE_CLIENT_IDS
// on Render and the website's VITE_GOOGLE_CLIENT_ID. The env vars can override
// these, but the web client ID must stay the same everywhere.
const OAM_WEB_CLIENT_ID = "74521252008-u08inid1vo4tu9s4blkk7j119g8k851t.apps.googleusercontent.com";
const OAM_IOS_CLIENT_ID = "74521252008-5m06gkr34p4tcoimfrqjp62hq69d37v7.apps.googleusercontent.com";

// Must be written out literally: Expo inlines EXPO_PUBLIC_* at build time.
/** The backend's Web client ID — becomes the ID token `aud`. */
export const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() || OAM_WEB_CLIENT_ID;
/** iOS OAuth client ("OAM iOS Client") from the same project. */
export const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim() || OAM_IOS_CLIENT_ID;

// "storeClient" === Expo Go. Anything else (standalone / bare / dev-client) is
// a real build that can contain the native module.
const IS_EXPO_GO = Constants.executionEnvironment === "storeClient";

export class SocialCancelled extends Error {
  constructor() { super("cancelled"); this.name = "SocialCancelled"; }
}
export class SocialUnavailable extends Error {
  constructor() { super("Google sign-in needs a full app build (not Expo Go)."); this.name = "SocialUnavailable"; }
}

let cached: { GoogleSignin: any; statusCodes: any } | null | undefined;
function loadGoogle(): { GoogleSignin: any; statusCodes: any } | null {
  if (IS_EXPO_GO) return null;            // never require the native module in Expo Go
  if (cached !== undefined) return cached;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require("@react-native-google-signin/google-signin");
    cached = mod?.GoogleSignin ? { GoogleSignin: mod.GoogleSignin, statusCodes: mod.statusCodes } : null;
  } catch {
    cached = null;
  }
  return cached;
}

/** True only when the native module is present (a real build, not Expo Go). */
export function isGoogleAvailable(): boolean {
  if (IS_EXPO_GO) return false;
  try { return loadGoogle() !== null; } catch { return false; }
}

let configured = false;
function configure(GoogleSignin: any) {
  if (configured) return;
  GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,   // → ID token `aud`; must match the backend
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    offlineAccess: false,
  });
  configured = true;
}

/** Reads `aud` from a JWT without verifying it (the backend verifies). */
function tokenAudience(idToken: string): string | undefined {
  try {
    const part = idToken.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = typeof atob === "function" ? atob(part.padEnd(part.length + ((4 - (part.length % 4)) % 4), "=")) : "";
    return json ? JSON.parse(json).aud : undefined;
  } catch {
    return undefined;
  }
}

/** Opens the Google account picker and returns the ID token. */
export async function signInWithGoogle(): Promise<string> {
  const g = loadGoogle();
  if (!g) throw new SocialUnavailable();
  const { GoogleSignin, statusCodes } = g;
  configure(GoogleSignin);
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    // Always show the account picker instead of silently reusing the last account.
    await GoogleSignin.signOut().catch(() => {});
    const res: any = await GoogleSignin.signIn();
    if (res?.type === "cancelled") throw new SocialCancelled();
    const idToken = res?.data?.idToken ?? res?.idToken;
    if (!idToken) throw new Error("Google did not return an ID token.");
    if (__DEV__) {
      const aud = tokenAudience(idToken);
      if (aud && aud !== GOOGLE_WEB_CLIENT_ID) console.warn(`[google] token aud ${aud} ≠ webClientId ${GOOGLE_WEB_CLIENT_ID}`);
    }
    return idToken;
  } catch (e: any) {
    if (e instanceof SocialCancelled) throw e;
    if (e?.code === statusCodes?.SIGN_IN_CANCELLED || e?.code === statusCodes?.IN_PROGRESS) {
      throw new SocialCancelled();
    }
    // DEVELOPER_ERROR (10): the "OAM Mobile Android Client" in project
    // 74521252008 doesn't list this build's signing SHA-1 for com.oam.mobile.
    if (String(e?.code) === "10" || /DEVELOPER_ERROR/i.test(String(e?.message))) {
      throw new Error("Google sign-in isn't set up for this build yet. Please use email for now.");
    }
    throw e;
  }
}
