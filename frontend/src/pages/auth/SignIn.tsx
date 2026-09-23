import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AuthLayout from "./AuthLayout";
import { Field, SubmitButton, FormError } from "./fields";
import { useAuth } from "../../auth/AuthContext";
import { apiErrorMessage } from "../../lib/api";
import { AxiosError } from "axios";
import { useTranslation } from "react-i18next";
import { GoogleLogin } from "@react-oauth/google";
import type { CredentialResponse } from "@react-oauth/google";
import axios from "axios";

export default function SignIn() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? "/dashboard";

  const [form, setForm] = useState({ identifier: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const update = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    setLoading(true);
    try {
      await login(form.identifier.trim(), form.password);
      navigate(from, { replace: true });
    } catch (err) {
      const ax = err as AxiosError<{ reason?: string }>;
      if (ax.response?.status === 403 && ax.response.data?.reason === "unverified") {
        navigate("/verify", { state: { identifier: form.identifier.trim() } });
        return;
      }
      setError(apiErrorMessage(err, t("auth.signIn.errFailed")));
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

      // POST the Google ID token to your Django backend verification endpoint
      const response = await axios.post("https://www.oam-app.com/api/v1/auth/google/", {
        token: idToken,
      });

      console.log("Google Login Success:", response.data);
      
      // TODO: If your backend returns JWT tokens on social login, 
      // ensure your AuthContext updates its state, then navigate to destination
      navigate(from, { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err, "Google sign-in failed. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title={t("auth.signIn.title")}
      subtitle={t("auth.signIn.subtitle")}
      altPrompt={t("auth.signIn.altPrompt")}
      altLink="/sign-up"
      altLabel={t("auth.signIn.altLabel")}
    >
      {/* Google Sign-In Button Integration */}
      <div className="mb-6">
        <GoogleLogin
          onSuccess={handleGoogleSuccess}
          onError={() => setError("Google sign-in was unsuccessful. Please try again.")}
          useOneTap
          theme="outline"
          size="large"
          width="100%"
        />
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
          <Link to="/forgot-password" className="text-[12.5px] font-medium text-brand-green hover:underline">
            {t("auth.signIn.forgot")}
          </Link>
        </div>
        <SubmitButton loading={loading}>{t("auth.signIn.submit")}</SubmitButton>
      </form>
    </AuthLayout>
  );
}