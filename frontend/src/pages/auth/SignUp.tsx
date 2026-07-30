import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthLayout from "./AuthLayout";
import { Field, SubmitButton, FormError } from "./fields";
import { authApi } from "../../auth/authApi";
import { apiErrorMessage } from "../../lib/api";
import { useTranslation } from "react-i18next";

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


  return (
    <AuthLayout
      title={t("auth.signUp.title")}
      subtitle={t("auth.signUp.subtitle")}
      altPrompt={t("auth.signUp.altPrompt")}
      altLink="/sign-in"
      altLabel={t("auth.signUp.altLabel")}
    >

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
