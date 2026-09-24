import { useState } from "react";
import type { ChangeEvent, ComponentType, FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AuthLayout from "./AuthLayout";
import { Field, SubmitButton, FormError } from "./fields";
import { useAuth } from "../../auth/AuthContext";
import { apiErrorMessage } from "../../lib/api";
import { AxiosError } from "axios";
import { useTranslation } from "react-i18next";
import * as GoogleAuth from "@react-oauth/google";
import type { CredentialResponse } from "@react-oauth/google";
import * as FacebookAuth from "@greatsumini/react-facebook-login";
import type { SuccessResponse } from "@greatsumini/react-facebook-login";
import axios from "axios";

/* -------------------------------------------------------------------------- */
/*  Minimal ambient types for the Facebook JS SDK fallback path.               */
/*  (The primary path uses @greatsumini/react-facebook-login.)                 */
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
/*                                                                            */
/*  "Element type is invalid ... but got: object" happens when a third-party   */
/*  component import resolves to a module-namespace / interop wrapper object   */
/*  instead of the component function itself (common with mixed ESM/CJS        */
/*  packages under Vite/Rollup production builds).                             */
/*                                                                            */
/*  This helper walks `default` / named exports until it finds a callable      */
/*  component, and returns `null` if none exists so we can render a safe       */
/*  fallback instead of crashing the whole page.                               */
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
}>(GoogleAuth, "GoogleLogin");

const FacebookLogin = resolveComponent<{
  appId: string;
  onSuccess: (r: SuccessResponse) => void;
  onFail: (error: unknown) => void;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}>(FacebookAuth, "FacebookLogin");

if (import.meta.env.DEV) {
  if (!GoogleLogin) {
    console.warn(
      "[SignIn] Could not resolve `GoogleLogin` from @react-oauth/google. " +
        "The Google button will be hidden. Check the installed package version.",
    );
  }
  if (!FacebookLogin) {
    console.warn(
      "[SignIn] Could not resolve `FacebookLogin` from @greatsumini/react-facebook-login. " +
        "Falling back to the raw Facebook SDK button.",
    );
  }
}

export default function SignIn() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from =
    (location.state as { from?: { pathname: string } })?.from?.pathname ??
    "/dashboard";

  const [form, setForm] = useState({ identifier: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const update =
    (key: keyof typeof form) => (e: ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(undefined);
    setLoading(true);
    try {
      await login(form.identifier.trim(), form.password);
      navigate(from, { replace: true });
    } catch (err) {
      const ax = err as AxiosError<{ reason?: string }>;
      if (
        ax.response?.status === 403 &&
        ax.response.data?.reason === "unverified"
      ) {
        navigate("/verify", { state: { identifier: form.identifier.trim() } });
        return;
      }
      setError(apiErrorMessage(err, t("auth.signIn.errFailed")));
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
        {
          token: idToken,
        },
      );

      console.log("Google Login Success:", response.data);
      navigate(from, { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err, "Google sign-in failed. Please try again."));
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
        {
          token: accessToken,
        },
      );

      console.log("Facebook Login Success:", backendResponse.data);
      navigate(from, { replace: true });
    } catch (err) {
      setError(
        apiErrorMessage(err, "Facebook sign-in failed. Please try again."),
      );
    } finally {
      setLoading(false);
    }
  };

  /* Only used if `FacebookLogin` could not be resolved above. */
  const handleFacebookFallback = () => {
    const FB = (window as unknown as { FB?: FacebookSDK }).FB;
    if (!FB) {
      setError(
        "Facebook sign-in is unavailable right now. Please use email sign-in.",
      );
      return;
    }

    const appId = import.meta.env.VITE_FACEBOOK_APP_ID || "";
    FB.init({ appId, cookie: true, xfbml: false, version: "v19.0" });
    FB.login(
      (response) => {
        const token = response?.authResponse?.accessToken;
        if (token) {
          void handleFacebookSuccess({ accessToken: token } as SuccessResponse);
        }
      },
      { scope: "public_profile,email" },
    );
  };

  return (
    <AuthLayout
      title={t("auth.signIn.title")}
      subtitle={t("auth.signIn.subtitle")}
      altPrompt={t("auth.signIn.altPrompt")}
      altLink="/sign-up"
      altLabel={t("auth.signIn.altLabel")}
    >
      {/* Social Logins Integration */}
      <div className="mb-6 space-y-3">
        {GoogleLogin ? (
          <div className="flex justify-center w-full">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() =>
                setError("Google sign-in was unsuccessful. Please try again.")
              }
              useOneTap
              theme="outline"
              size="large"
            />
          </div>
        ) : null}

        {FacebookLogin ? (
          <FacebookLogin
            appId={import.meta.env.VITE_FACEBOOK_APP_ID || ""}
            onSuccess={handleFacebookSuccess}
            onFail={(error: unknown) =>
              console.log("Facebook Login Failed:", error)
            }
            style={{
              backgroundColor: "#1877f2",
              color: "#fff",
              fontSize: "14px",
              fontWeight: "500",
              padding: "10px 16px",
              borderRadius: "4px",
              border: "none",
              width: "100%",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            Continue with Facebook
          </FacebookLogin>
        ) : (
          <button
            type="button"
            onClick={handleFacebookFallback}
            style={{
              backgroundColor: "#1877f2",
              color: "#fff",
              fontSize: "14px",
              fontWeight: "500",
              padding: "10px 16px",
              borderRadius: "4px",
              border: "none",
              width: "100%",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            Continue with Facebook
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
          id="identifier"
          label={t("auth.signIn.identifierLabel")}
          placeholder={t("auth.signIn.identifierPlaceholder")}
          value={form.identifier}
          onChange={update("identifier")}
          autoComplete="username"
          required
        />
        <Field
          id="password"
          label={t("auth.signIn.passwordLabel")}
          type="password"
          placeholder={t("auth.signIn.passwordPlaceholder")}
          value={form.password}
          onChange={update("password")}
          autoComplete="current-password"
          required
        />
        <div className="mb-5 text-right">
          <Link
            to="/forgot-password"
            className="text-[12.5px] font-medium text-brand-green hover:underline"
          >
            {t("auth.signIn.forgot")}
          </Link>
        </div>
        <SubmitButton loading={loading}>
          {t("auth.signIn.submit")}
        </SubmitButton>
      </form>
    </AuthLayout>
  );
}