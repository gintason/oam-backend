import { useState } from "react";
import { referralStore } from "../../services/referrals";
import { useNavigate } from "react-router-dom";
import AuthLayout from "./AuthLayout";
import { Field, SubmitButton, FormError } from "./fields";
import { authApi } from "../../auth/authApi";
import { apiErrorMessage } from "../../lib/api";
import { useTranslation } from "react-i18next";
import { GoogleLogin } from "@react-oauth/google";
import type { CredentialResponse } from "@react-oauth/google";
import FacebookLogin from "@greatsumini/react-facebook-login";
import type { SuccessResponse } from "@greatsumini/react-facebook-login";
import axios from "axios";

export default function SignUp() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [form, setForm] = useState({ first_name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const update = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
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

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    setError(undefined);
    setLoading(true);
    try {
      const idToken = credentialResponse.credential;
      
      if (!idToken) {
        throw new Error("Google credential token is missing.");
      }

      const response = await axios.post("https://www.oam-app.com/api/v1/auth/google/", {
        token: idToken,
      });

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

      const backendResponse = await axios.post("https://www.oam-app.com/api/v1/auth/facebook/", {
        token: accessToken,
      });

      console.log("Facebook Auth Success:", backendResponse.data);
      navigate("/dashboard");
    } catch (err) {
      setError(apiErrorMessage(err, "Facebook sign-up failed. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title={t("auth.signUp.title")}
      subtitle={t("auth.signUp.subtitle")}
      altPrompt={t("auth.signUp.altPrompt")}
      altLink="/sign-in"
      altLabel={t("auth.signUp.altLabel")}
    >
      <div className="mb-6 space-y-3">
        <GoogleLogin
          onSuccess={handleGoogleSuccess}
          onError={() => setError("Google sign-in was unsuccessful. Please try again.")}
          useOneTap
          theme="outline"
          size="large"
          width="100%"
        />

        <FacebookLogin
          appId={import.meta.env.VITE_FACEBOOK_APP_ID || ""}
          onSuccess={handleFacebookSuccess}
          onFail={(error) => console.log("Facebook Login Failed:", error)}
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