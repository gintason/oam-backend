/**
 * Native Google sign-in for OAM mobile.
 *
 * @react-native-google-signin needs the native "RNGoogleSignin" module, which
 * only exists in a custom dev/preview/production build — NOT in Expo Go. We
 * detect Expo Go up front and never even require the module there, so the app
 * runs fine (the Google button is simply hidden). In a real build the module
 * is present, the button appears, and sign-in works.
 */
import Constants from "expo-constants";

// OAM Google OAuth client IDs (project 74521252008).
export const GOOGLE_IOS_CLIENT_ID = "74521252008-5m06gkr34p4tcoimfrqjp62hq69d37v7.apps.googleusercontent.com";
export const GOOGLE_ANDROID_CLIENT_ID = "74521252008-ho6i39aapc7flmc26emrc9dja1oh0j55.apps.googleusercontent.com";
// webClientId drives the ID token audience the backend verifies. If the ID
// token comes back null on Android, set this to the *Web* client ID from the
// same Google project and add it to the backend GOOGLE_CLIENT_IDS.
export const GOOGLE_WEB_CLIENT_ID = GOOGLE_IOS_CLIENT_ID;

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
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    webClientId: GOOGLE_WEB_CLIENT_ID,
    offlineAccess: false,
  });
  configured = true;
}

/** Opens the Google account picker and returns the ID token. */
export async function signInWithGoogle(): Promise<string> {
  const g = loadGoogle();
  if (!g) throw new SocialUnavailable();
  const { GoogleSignin, statusCodes } = g;
  configure(GoogleSignin);
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const res: any = await GoogleSignin.signIn();
    const idToken = res?.data?.idToken ?? res?.idToken;
    if (!idToken) throw new Error("Google did not return an ID token.");
    return idToken;
  } catch (e: any) {
    if (e?.code === statusCodes?.SIGN_IN_CANCELLED || e?.code === statusCodes?.IN_PROGRESS) {
      throw new SocialCancelled();
    }
    throw e;
  }
}
