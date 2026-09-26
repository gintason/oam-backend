import { useState } from "react";
import { signInWithGoogle, signInWithFacebook, SocialAuthCancelled, enabledProviders } from "../../auth/socialSdk";
import { useAuth } from "../../auth/AuthContext";
import type {
  ChangeEvent,
  ComponentType,
  CSSProperties,
  FormEvent,
  ReactNode,
} from "react";
import { referralStore } from "../../services/referrals";
import { useNavigate } from "react-router-dom";
import AuthLayout from "./AuthLayout";
import { Field, SubmitButton, FormError } from "./fields";
import { authApi } from "../../auth/authApi";
import { apiErrorMessage } from "../../lib/api";
import { useTranslation } from "react-i18next";
import * as GoogleAuth from "@react-oauth/google";
import { GoogleOAuthProvider } from "@react-oauth/google";
import type { CredentialResponse } from "@react-oauth/google";
import * as FacebookAuth from "@greatsumini/react-facebook-login";
import type { SuccessResponse } from "@greatsumini/react-facebook-login";
import axios from "axios";

/* -------------------------------------------------------------------------- */
/*  Shared button style — identical for Google wrapper and Facebook button.    */
/* -------------------------------------------------------------------------- */
const SOCIAL_BUTTON_STYLE: CSSProperties = {
  backgroundColor: "#ffffff",
  color: "#3c4043",
  border: "1px solid #dadce0",
  borderRadius: "4px",
  fontSize: "14px",
  fontWeight: 500,
  fontFamily: "Roboto, arial, sans-serif",
  height: "40px",
  padding: "0 12px",
  width: "100%",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  boxSizing: "border-box",
};

function FacebookIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="#1877f2"
        d="M24 12.073C24 5.446 18.627 0 12 0S0 5.446 0 12.073c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
      />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09a6.6 6.6 0 0 1 0-4.18V7.07H2.18a11 11 0 0 0 0 9.86l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 4.75c1.62 0 3.07.56 4.21 1.64l3.15-3.15C17.45 1.4 14.97.5 12 .5A11 11 0 0 0 2.18 7.07L5.84 9.91C6.71 7.31 9.14 4.75 12 4.75z"/>
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/*  Minimal ambient types for the Facebook JS SDK fallback path.               */
/* -------------------------------------------------------------------------- */
interface FacebookAuthResponse {
  accessToken: string;
  userID?: string;
  expiresIn?: number;
  signedRequest?: string;
}

interface FacebookLoginResponse {
  status: "connected" | "not_authorized" | "unknown";
  authResponse?: FacebookAuthResponse;
}

interface FacebookSDK {
  init(options: {
    appId: string;
    cookie?: boolean;
    xfbml?: boolean;
    version: string;
  }): void;
  login(
    callback: (response: FacebookLoginResponse) => void,
    options?: { scope?: string },
  ): void;
}

/* -------------------------------------------------------------------------- */
/*  Non-disruptive fix for React error #130                                    */
/* -------------------------------------------------------------------------- */
function resolveComponent<Props = Record<string, unknown>>(
  mod: unknown,
  exportName: string,
): ComponentType<Props> | null {
  const seen = new Set<unknown>();
  const queue: unknown[] = [mod];

  while (queue.length > 0) {
    const current = queue.shift();
    if (current == null || seen.has(current)) continue;
    seen.add(current);

    if (typeof current === "function") {
      return current as ComponentType<Props>;
    }

    if (typeof current === "object") {
      const obj = current as Record<string, unknown>;
      if (obj[exportName] !== undefined) queue.push(obj[exportName]);
      if (obj.default !== undefined) queue.push(obj.default);
    }
  }

  return null;
}

const GoogleLogin = resolveComponent<{
  onSuccess: (r: CredentialResponse) => void;
  onError: () => void;
  useOneTap?: boolean;
  theme?: "outline" | "filled_blue" | "filled_black";
  size?: "large" | "medium" | "small";
  shape?: "rectangular" | "pill" | "circle" | "square";
  text?: "signin_with" | "signup_with" | "continue_with" | "signin";
  logo_alignment?: "left" | "center";
}>(GoogleAuth, "GoogleLogin");

const FacebookLogin = resolveComponent<{
  appId: string;
  onSuccess: (r: SuccessResponse) => void;
  onFail: (error: unknown) => void;
  style?: CSSProperties;
  children?: ReactNode;
}>(FacebookAuth, "FacebookLogin");

/* -------------------------------------------------------------------------- */
/*  Google OAuth client id — read once so we can safely hide the button if     */
/*  the env var is missing (the provider would throw at render otherwise).     */
/* -------------------------------------------------------------------------- */
const GOOGLE_CLIENT_ID: string =
  (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) ?? "";

const GOOGLE_READY = Boolean(GoogleLogin) && GOOGLE_CLIENT_ID.length > 0;

if (import.meta.env.DEV) {
  if (!GoogleLogin) {
    console.warn(
      "[SignUp] Could not resolve `GoogleLogin` from @react-oauth/google. " +
        "The Google button will be hidden.",
    );
  } else if (!GOOGLE_CLIENT_ID) {
    console.warn(
      "[SignUp] `VITE_GOOGLE_CLIENT_ID` is not set. The Google button will be hidden. " +
        "Add it to your .env file to enable Google sign-up.",
    );
  }
  if (!FacebookLogin) {
    console.warn(
      "[SignUp] Could not resolve `FacebookLogin` from @greatsumini/react-facebook-login. " +
        "Falling back to the raw Facebook SDK button.",
    );
  }
}

export default function SignUp() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { socialLogin } = useAuth();
  const [form, setForm] = useState({ first_name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [socialBusy, setSocialBusy] = useState<null | "google" | "facebook">(null);
  const [error, setError] = useState<string>();

  const update =
    (key: keyof typeof form) => (e: ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(undefined);
    setLoading(true);
    try {
      const res = await authApi.register({
        email: form.email.trim(),
        password: form.password,
        referral_code: referralStore.take(),
        first_name: form.first_name.trim(),
      });
      navigate("/verify", {
        state: {
          identifier: form.email.trim(),
          destination: res.verification?.destination ?? form.email.trim(),
        },
      });
    } catch (err) {
      setError(apiErrorMessage(err, t("auth.signUp.errFailed")));
    } finally {
      setLoading(false);
    }
  }

  const handleGoogleSuccess = async (
    credentialResponse: CredentialResponse,
  ) => {
    setError(undefined);
    setLoading(true);
    try {
      const idToken = credentialResponse.credential;
      if (!idToken) {
        throw new Error("Google credential token is missing.");
      }

      const response = await axios.post(
        "https://www.oam-app.com/api/v1/auth/google/",
        { token: idToken },
      );

      console.log("Google Auth Success:", response.data);
      navigate("/dashboard");
    } catch (err) {
      setError(apiErrorMessage(err, "Google sign-up failed. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  const handleFacebookSuccess = async (response: SuccessResponse) => {
    setError(undefined);
    setLoading(true);
    try {
      const accessToken = response.accessToken;
      if (!accessToken) {
        throw new Error("Facebook access token is missing.");
      }

      const backendResponse = await axios.post(
        "https://www.oam-app.com/api/v1/auth/facebook/",
        { token: accessToken },
      );

      console.log("Facebook Auth Success:", backendResponse.data);
      navigate("/dashboard");
    } catch (err) {
      setError(
        apiErrorMessage(err, "Facebook sign-up failed. Please try again."),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFacebookFallback = () => {
    const FB = (window as unknown as { FB?: FacebookSDK }).FB;
    if (!FB) {
      setError(
        "Facebook sign-up is unavailable right now. Please use email sign-up.",
      );
      return;
    }

    const appId = import.meta.env.VITE_FACEBOOK_APP_ID || "";
    FB.init({ appId, cookie: true, xfbml: false, version: "v19.0" });
    FB.login(
      (response) => {
        const token = response?.authResponse?.accessToken;
        if (token) {
          void handleFacebookSuccess({
            accessToken: token,
          } as SuccessResponse);
        }
      },
      { scope: "public_profile,email" },
    );
  };

  async function onGoogle() {
    setError(undefined);
    setSocialBusy("google");
    try {
      const token = await signInWithGoogle();
      await socialLogin("google", token);
      navigate("/dashboard");
    } catch (e) {
      if (!(e instanceof SocialAuthCancelled)) setError(apiErrorMessage(e, "Google sign-in failed. Please try again."));
    } finally { setSocialBusy(null); }
  }
  async function onFacebook() {
    setError(undefined);
    setSocialBusy("facebook");
    try {
      const token = await signInWithFacebook();
      await socialLogin("facebook", token);
      navigate("/dashboard");
    } catch (e) {
      if (!(e instanceof SocialAuthCancelled)) setError(apiErrorMessage(e, "Facebook sign-in failed. Please try again."));
    } finally { setSocialBusy(null); }
  }


  return (
    <AuthLayout
      title={t("auth.signUp.title")}
      subtitle={t("auth.signUp.subtitle")}
      altPrompt={t("auth.signUp.altPrompt")}
      altLink="/sign-in"
      altLabel={t("auth.signUp.altLabel")}
    >
      {/* Social Logins — Google and Facebook buttons share the same style */}
      <div className="mb-6 space-y-3">
        {enabledProviders.google && (
          <button type="button" onClick={onGoogle} disabled={socialBusy !== null} style={SOCIAL_BUTTON_STYLE}>
            <GoogleIcon />
            <span>{socialBusy === "google" ? "Connecting…" : "Continue with Google"}</span>
          </button>
        )}
        {enabledProviders.facebook && (
          <button type="button" onClick={onFacebook} disabled={socialBusy !== null} style={SOCIAL_BUTTON_STYLE}>
            <FacebookIcon />
            <span>{socialBusy === "facebook" ? "Connecting…" : "Continue with Facebook"}</span>
          </button>
        )}

        <div className="relative my-6 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <span className="relative bg-white px-4 text-xs uppercase text-muted">
            Or continue with email
          </span>
        </div>
      </div>

      <form onSubmit={onSubmit} noValidate>
        <FormError message={error} />
        <Field
          id="first_name"
          label={t("auth.signUp.firstNameLabel")}
          placeholder={t("auth.signUp.firstNamePlaceholder")}
          value={form.first_name}
          onChange={update("first_name")}
          autoComplete="given-name"
        />
        <Field
          id="email"
          label={t("auth.signUp.emailLabel")}
          type="email"
          placeholder={t("auth.signUp.emailPlaceholder")}
          value={form.email}
          onChange={update("email")}
          autoComplete="email"
          required
        />
        <Field
          id="password"
          label={t("auth.signUp.passwordLabel")}
          type="password"
          placeholder={t("auth.signUp.passwordPlaceholder")}
          value={form.password}
          onChange={update("password")}
          autoComplete="new-password"
          required
        />
        <p className="mb-5 text-[12px] leading-relaxed text-muted">
          {t("auth.signUp.terms")}
        </p>
        <SubmitButton loading={loading}>{t("auth.signUp.submit")}</SubmitButton>
      </form>
    </AuthLayout>
  );
}