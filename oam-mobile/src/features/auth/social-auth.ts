/**
 * Native Google sign-in for OAM mobile.
 *
 * The @react-native-google-signin native module ("RNGoogleSignin") only exists
 * in a custom dev/preview/production build — NOT in Expo Go or an older binary.
 * So we lazy-require it inside the functions: importing this file never crashes,
 * and if the native module is missing we surface a clear, catchable error only
 * when the user taps "Continue with Google".
 */

// OAM Google OAuth client IDs (project 74521252008).
export const GOOGLE_IOS_CLIENT_ID = "74521252008-5m06gkr34p4tcoimfrqjp62hq69d37v7.apps.googleusercontent.com";
export const GOOGLE_ANDROID_CLIENT_ID = "74521252008-ho6i39aapc7flmc26emrc9dja1oh0j55.apps.googleusercontent.com";
// webClientId drives the ID token audience the backend verifies. If your ID
// token comes back null on Android, set this to the *Web* client ID from the
// same Google project and add it to the backend GOOGLE_CLIENT_IDS.
export const GOOGLE_WEB_CLIENT_ID = GOOGLE_IOS_CLIENT_ID;

export class SocialCancelled extends Error {
  constructor() { super("cancelled"); this.name = "SocialCancelled"; }
}
export class SocialUnavailable extends Error {
  constructor() { super("Google sign-in needs a new app build to work."); this.name = "SocialUnavailable"; }
}

/** Loads the native module lazily; returns null if it isn't in this binary. */
function loadGoogle(): { GoogleSignin: any; statusCodes: any } | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require("@react-native-google-signin/google-signin");
    if (!mod?.GoogleSignin) return null;
    return { GoogleSignin: mod.GoogleSignin, statusCodes: mod.statusCodes };
  } catch {
    return null;
  }
}

/** True only when the native module is present (i.e. a proper build). */
export function isGoogleAvailable(): boolean {
  return loadGoogle() !== null;
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
