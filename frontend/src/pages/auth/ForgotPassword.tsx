import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, KeyRound, Loader2, MailCheck } from "lucide-react";
import { authApi } from "../../auth/authApi";
import { apiErrorMessage } from "../../lib/api";
import logo from "../../assets/logo.png";
import { useTranslation, Trans } from "react-i18next";

/**
 * Step 1: ask for the account identifier and send a reset code.
 *
 * The backend answers identically whether or not the account exists, so that
 * this endpoint can't be used to find out who has an account. The wording here
 * has to keep that promise: "if an account exists" rather than "we've sent you
 * a code". Saying the latter would leak exactly what the backend is careful not
 * to.
 */
export default function ForgotPassword() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [error, setError] = useState<string>();
  const [sent, setSent] = useState(false);

  const request = useMutation({
    mutationFn: () => authApi.requestPasswordReset(identifier.trim()),
    onSuccess: () => { setSent(true); setError(undefined); },
    onError: (err) => setError(apiErrorMessage(err, t("auth.forgot.errSend"))),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    if (!identifier.trim()) return setError(t("auth.forgot.errEnter"));
    request.mutate();
  }

  return (
    <div className="flex min-h-screen flex-col bg-mist">
      <header className="border-b border-hairline bg-paper">
        <div className="mx-auto flex max-w-md items-center justify-between px-5 py-3">
          <Link to="/"><img src={logo} alt="OAM" className="h-7 w-auto" /></Link>
          <Link to="/sign-in" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted transition hover:text-ink">
            <ArrowLeft size={15} strokeWidth={1.75} /> {t("auth.forgot.signIn")}
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 items-center px-5 py-8">
        <div className="w-full">
          {sent ? (
            <div className="rounded-2xl border border-hairline bg-paper p-6 text-center shadow-[0_1px_2px_rgba(10,10,10,0.04)] sm:p-7">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-green/10 text-brand-green">
                <MailCheck size={22} strokeWidth={1.75} />
              </span>
              <h1 className="mt-4 font-display text-xl font-semibold text-ink">{t("auth.forgot.sentTitle")}</h1>
              <p className="mt-2 text-[14px] leading-relaxed text-muted">
                <Trans i18nKey="auth.forgot.sentBody" values={{ identifier: identifier.trim() }} components={{ 1: <span className="font-medium text-ink" /> }} />
              </p>

              <button
                onClick={() => navigate(`/reset-password?identifier=${encodeURIComponent(identifier.trim())}`)}
                className="mt-5 h-11 w-full rounded-xl bg-brand-red text-[14px] font-semibold text-white transition hover:brightness-95"
              >
                {t("auth.forgot.haveCode")}
              </button>

              <button
                onClick={() => request.mutate()}
                disabled={request.isPending}
                className="mt-2 h-11 w-full rounded-xl border border-hairline bg-paper text-[13.5px] font-medium text-ink transition hover:bg-mist disabled:opacity-60"
              >
                {request.isPending ? t("auth.forgot.sending") : t("auth.forgot.sendAgain")}
              </button>

              <p className="mt-4 text-[12px] leading-relaxed text-muted">
                {t("auth.forgot.sentHelp")}
              </p>
            </div>
          ) : (
            <form
              onSubmit={submit}
              className="rounded-2xl border border-hairline bg-paper p-6 shadow-[0_1px_2px_rgba(10,10,10,0.04)] sm:p-7"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-green/10 text-brand-green">
                <KeyRound size={20} strokeWidth={1.75} />
              </span>
              <h1 className="mt-4 font-display text-2xl font-semibold text-ink">
                {t("auth.forgot.title")}
              </h1>
              <p className="mt-1.5 text-[14px] leading-relaxed text-muted">
                {t("auth.forgot.subtitle")}
              </p>

              {error && <p className="mt-4 text-[13px] text-danger">{error}</p>}

              <label htmlFor="identifier" className="mb-1.5 mt-5 block text-[12.5px] font-semibold text-ink">
                {t("auth.forgot.label")}
              </label>
              <input
                id="identifier"
                autoFocus
                autoComplete="username"
                value={identifier}
                onChange={(e) => { setIdentifier(e.target.value); setError(undefined); }}
                placeholder="you@example.com"
                className="h-12 w-full rounded-xl border border-hairline bg-paper px-3.5 text-[15px] text-ink outline-none transition focus:border-brand-green focus:ring-[3px] focus:ring-brand-green/10"
              />

              <button
                type="submit"
                disabled={request.isPending}
                className="mt-5 inline-flex h-12 w-full items-center justify-center rounded-xl bg-brand-red text-[14px] font-semibold text-white transition hover:brightness-95 disabled:opacity-60"
              >
                {request.isPending ? <Loader2 size={18} className="animate-spin" /> : t("auth.forgot.sendCode")}
              </button>

              <p className="mt-4 text-center text-[13px] text-muted">
                {t("auth.forgot.remembered")}{" "}
                <Link to="/sign-in" className="font-medium text-brand-green underline">
                  {t("auth.forgot.signIn")}
                </Link>
              </p>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
