import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AuthLayout from "./AuthLayout";
import { Field, SubmitButton, FormError } from "./fields";
import { useAuth } from "../../auth/AuthContext";
import { apiErrorMessage } from "../../lib/api";
import { AxiosError } from "axios";
import { useTranslation } from "react-i18next";

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


  return (
    <AuthLayout
      title={t("auth.signIn.title")}
      subtitle={t("auth.signIn.subtitle")}
      altPrompt={t("auth.signIn.altPrompt")}
      altLink="/sign-up"
      altLabel={t("auth.signIn.altLabel")}
    >

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
