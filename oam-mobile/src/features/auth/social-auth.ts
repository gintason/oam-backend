/**
 * Native Google sign-in for OAM mobile.
 *
 * Uses @react-native-google-signin. signInWithGoogle() returns the Google
 * ID token, which the backend (/auth/social/google/) verifies. The token's
 * `aud` is the webClientId below, so that ID must be listed in the backend's
 * GOOGLE_CLIENT_IDS.
 */
import { GoogleSignin, statusCodes } from "@react-native-google-signin/google-signin";

// OAM Google OAuth client IDs (project 74521252008).
export const GOOGLE_IOS_CLIENT_ID = "74521252008-5m06gkr34p4tcoimfrqjp62hq69d37v7.apps.googleusercontent.com";
export const GOOGLE_ANDROID_CLIENT_ID = "74521252008-ho6i39aapc7flmc26emrc9dja1oh0j55.apps.googleusercontent.com";
// webClientId drives the ID token audience the backend verifies. If your ID
// token comes back null on Android, set this to the *Web* client ID from the
// same Google project and add it to the backend GOOGLE_CLIENT_IDS.
export const GOOGLE_WEB_CLIENT_ID = GOOGLE_IOS_CLIENT_ID;

let configured = false;
export function configureGoogle() {
  if (configured) return;
  GoogleSignin.configure({
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    webClientId: GOOGLE_WEB_CLIENT_ID,
    offlineAccess: false,
  });
  configured = true;
}

export class SocialCancelled extends Error {
  constructor() { super("cancelled"); this.name = "SocialCancelled"; }
}

/** Opens the Google account picker and returns the ID token. */
export async function signInWithGoogle(): Promise<string> {
  configureGoogle();
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const res: any = await GoogleSignin.signIn();
    // v13+ shape: { data: { idToken } }; older: { idToken }
    const idToken = res?.data?.idToken ?? res?.idToken;
    if (!idToken) throw new Error("Google did not return an ID token.");
    return idToken;
  } catch (e: any) {
    if (e?.code === statusCodes.SIGN_IN_CANCELLED || e?.code === statusCodes.IN_PROGRESS) {
      throw new SocialCancelled();
    }
    throw e;
  }
}
