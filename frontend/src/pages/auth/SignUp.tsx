import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthLayout from "./AuthLayout";
import { Field, SubmitButton, FormError } from "./fields";
import { authApi } from "../../auth/authApi";
import { apiErrorMessage } from "../../lib/api";

export default function SignUp() {
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
      setError(apiErrorMessage(err, "Could not create your account."));
    } finally {
      setLoading(false);
    }
  }


  return (
    <AuthLayout
      title="Create your account"
      subtitle="One balance for everything you need."
      altPrompt="Already have an account?"
      altLink="/sign-in"
      altLabel="Sign in"
    >

      <form onSubmit={onSubmit} noValidate>
        <FormError message={error} />
        <Field
          id="first_name"
          label="First name"
          placeholder="Preye"
          value={form.first_name}
          onChange={update("first_name")}
          autoComplete="given-name"
        />
        <Field
          id="email"
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={update("email")}
          autoComplete="email"
          required
        />
        <Field
          id="password"
          label="Password"
          type="password"
          placeholder="At least 8 characters"
          value={form.password}
          onChange={update("password")}
          autoComplete="new-password"
          required
        />
        <p className="mb-5 text-[12px] leading-relaxed text-muted">
          By creating an account you agree to OAM's Terms and Privacy Policy.
        </p>
        <SubmitButton loading={loading}>Create account</SubmitButton>
      </form>
    </AuthLayout>
  );
}
