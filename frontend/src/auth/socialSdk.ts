/**
 * Social sign-in SDKs.
 *
 * Each provider hands back a token that our backend verifies independently —
 * Google and Apple return an id_token (a signed JWT), Facebook an access_token.
 * The browser never decides who you are; it only carries the provider's
 * assertion, which the server checks against the provider's own keys.
 *
 * Scripts load lazily, on first use. Pulling three third-party SDKs into every
 * page load to serve a button most visitors won't press is a waste of their
 * data — which matters more on a mobile connection than it does on a laptop.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    google?: any;
    FB?: any;
    AppleID?: any;
    fbAsyncInit?: () => void;
  }
}

export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
export const FACEBOOK_APP_ID = import.meta.env.VITE_FACEBOOK_APP_ID as string | undefined;
export const APPLE_CLIENT_ID = import.meta.env.VITE_APPLE_CLIENT_ID as string | undefined;

/**
 * Which buttons to show. An unconfigured provider is hidden, not broken.
 *
 * Apple is intentionally absent: it needs a $99/year Apple Developer
 * membership, which isn't worth paying for until there's an iOS app. The
 * signInWithApple() function below is left in place, so switching it back on
 * later means adding the button — not rebuilding the flow.
 */
export const enabledProviders = {
  google: Boolean(GOOGLE_CLIENT_ID),
  facebook: Boolean(FACEBOOK_APP_ID),
};

export class SocialAuthCancelled extends Error {
  constructor() {
    super("cancelled");
    this.name = "SocialAuthCancelled";
  }
}

const loaded: Record<string, Promise<void>> = {};

function loadScript(src: string, id: string): Promise<void> {
  if (loaded[id]) return loaded[id];
  loaded[id] = new Promise((resolve, reject) => {
    if (document.getElementById(id)) return resolve();
    const el = document.createElement("script");
    el.src = src;
    el.id = id;
    el.async = true;
    el.defer = true;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error("Couldn't load that sign-in service."));
    document.head.appendChild(el);
  });
  return loaded[id];
}

/* ------------------------------------------------------------------ */
/* Google                                                              */
/* ------------------------------------------------------------------ */

/**
 * Google Identity Services only emits an id_token from ITS OWN rendered
 * button — there's no supported way to trigger the credential flow from an
 * arbitrary element. One Tap exists but browsers and ad blockers suppress it
 * often enough that it can't be the only route.
 *
 * So we render Google's real button off-screen and forward our button's click
 * to it. The person sees our styling; Google sees a genuine click on its own
 * control, which is what its security model requires.
 */
export async function signInWithGoogle(): Promise<string> {
  if (!GOOGLE_CLIENT_ID) throw new Error("Google sign-in isn't configured.");
  await loadScript("https://accounts.google.com/gsi/client", "gsi-client");

  return new Promise<string>((resolve, reject) => {
    const google = window.google;
    if (!google?.accounts?.id) return reject(new Error("Google sign-in is unavailable."));

    let settled = false;
    const host = document.createElement("div");
    host.style.cssText = "position:fixed;top:-1000px;left:-1000px;opacity:0;";
    document.body.appendChild(host);

    const cleanup = () => {
      window.setTimeout(() => host.remove(), 0);
    };

    google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (response: any) => {
        settled = true;
        cleanup();
        if (response?.credential) resolve(response.credential);
        else reject(new SocialAuthCancelled());
      },
      cancel_on_tap_outside: true,
      auto_select: false,
    });

    google.accounts.id.renderButton(host, { type: "standard", size: "large" });

    const realButton = host.querySelector<HTMLElement>('div[role="button"]')
      ?? host.querySelector<HTMLElement>("div > div");
    if (!realButton) {
      cleanup();
      return reject(new Error("Google sign-in is unavailable."));
    }
    realButton.click();

    // If the popup is dismissed, Google's callback never fires. Without this
    // the button would spin forever with no way back.
    window.setTimeout(() => {
      if (!settled) { cleanup(); reject(new SocialAuthCancelled()); }
    }, 120000);
  });
}

/* ------------------------------------------------------------------ */
/* Facebook                                                            */
/* ------------------------------------------------------------------ */

export async function signInWithFacebook(): Promise<string> {
  if (!FACEBOOK_APP_ID) throw new Error("Facebook sign-in isn't configured.");
  await loadScript("https://connect.facebook.net/en_US/sdk.js", "fb-sdk");

  await new Promise<void>((resolve) => {
    const ready = () => window.FB && resolve();
    if (window.FB) {
      window.FB.init({ appId: FACEBOOK_APP_ID, cookie: true, xfbml: false, version: "v19.0" });
      return resolve();
    }
    window.fbAsyncInit = () => {
      window.FB.init({ appId: FACEBOOK_APP_ID, cookie: true, xfbml: false, version: "v19.0" });
      resolve();
    };
    window.setTimeout(ready, 1500);
  });

  return new Promise<string>((resolve, reject) => {
    window.FB.login(
      (response: any) => {
        const token = response?.authResponse?.accessToken;
        if (token) resolve(token);
        else reject(new SocialAuthCancelled());
      },
      // Email is requested but Facebook may still withhold it — an account
      // registered by phone has none. The backend has to cope with that.
      { scope: "email,public_profile" },
    );
  });
}

/* ------------------------------------------------------------------ */
/* Apple                                                               */
/* ------------------------------------------------------------------ */

export async function signInWithApple(): Promise<{
  token: string; first_name?: string; last_name?: string; email?: string;
}> {
  if (!APPLE_CLIENT_ID) throw new Error("Apple sign-in isn't configured.");
  await loadScript(
    "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js",
    "apple-id",
  );

  const AppleID = window.AppleID;
  if (!AppleID?.auth) throw new Error("Apple sign-in is unavailable.");

  AppleID.auth.init({
    clientId: APPLE_CLIENT_ID,
    scope: "name email",
    redirectURI: `${window.location.origin}/sign-in`,
    usePopup: true,
  });

  try {
    const response = await AppleID.auth.signIn();
    const token = response?.authorization?.id_token;
    if (!token) throw new SocialAuthCancelled();

    // Apple sends the name ONCE, on the very first authorisation, and never
    // again. If we don't capture it here it's gone for good, so it goes to the
    // backend with the token rather than being looked up later.
    const name = response?.user?.name;
    return {
      token,
      first_name: name?.firstName,
      last_name: name?.lastName,
      email: response?.user?.email,
    };
  } catch (err: any) {
    if (err?.error === "popup_closed_by_user" || err instanceof SocialAuthCancelled) {
      throw new SocialAuthCancelled();
    }
    throw new Error("Apple sign-in didn't complete.");
  }
}
