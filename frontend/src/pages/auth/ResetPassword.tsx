import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, Check, CheckCircle2, Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { authApi } from "../../auth/authApi";
import { tokenStore } from "../../lib/tokens";
import { apiErrorMessage } from "../../lib/api";
import logo from "../../assets/logo.png";

/**
 * Step 2: code plus a new password.
 *
 * The rules below mirror Django's validate_password, which the backend applies.
 * Showing them live matters: being told your password is unacceptable only
 * after you submit — having already typed it twice — is a small, avoidable
 * insult, and it's the point where people give up on a reset.
 */
const RULES = [
  { label: "At least 8 characters", test: (v: string) => v.length >= 8 },
  { label: "Not entirely numbers", test: (v: string) => !/^\d+$/.test(v) },
  { label: "Not an obvious password", test: (v: string) =>
      !["password", "12345678", "qwerty123", "password1", "abc12345"].includes(v.toLowerCase()) },
];

export default function ResetPassword() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [identifier, setIdentifier] = useState(params.get("identifier") ?? "");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string>();
  const [done, setDone] = useState(false);

  const passed = RULES.filter((r) => r.test(password)).length;
  const allPassed = password.length > 0 && passed === RULES.length;

  const confirm = useMutation({
    mutationFn: () => authApi.confirmPasswordReset({
      identifier: identifier.trim(),
      code: code.trim(),
      new_password: password,
    }),
    onSuccess: () => {
      // The backend hands back a fresh token pair, but we drop it and send the
      // person to sign in with the new password instead.
      //
      // It's one extra step, and it earns it: signing in proves the new
      // password actually works while they're still on the page and can fix it.
      // Landing straight in the dashboard means the first test of a password
      // you just invented happens days later, when you've forgotten it.
      tokenStore.clear();
      setDone(true);
      setError(undefined);
    },
    onError: (err) => setError(apiErrorMessage(err, "That code didn't work. Check it and try again.")),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    if (!identifier.trim()) return setError("Enter the email or phone on your account.");
    if (code.trim().length < 4) return setError("Enter the code we sent you.");
    if (!allPassed) return setError("Choose a password that meets all three rules below.");
    confirm.mutate();
  }

  return (
    <div className="flex min-h-screen flex-col bg-mist">
      <header className="border-b border-hairline bg-paper">
        <div className="mx-auto flex max-w-md items-center justify-between px-5 py-3">
          <Link to="/"><img src={logo} alt="OAM" className="h-7 w-auto" /></Link>
          <Link to="/forgot-password" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted transition hover:text-ink">
            <ArrowLeft size={15} strokeWidth={1.75} /> Back
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 items-center px-5 py-8">
        {done ? (
          <Success onContinue={() => navigate("/sign-in", { replace: true })} />
        ) : (
        <form
          onSubmit={submit}
          className="w-full rounded-2xl border border-hairline bg-paper p-6 shadow-[0_1px_2px_rgba(10,10,10,0.04)] sm:p-7"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-green/10 text-brand-green">
            <ShieldCheck size={20} strokeWidth={1.75} />
          </span>
          <h1 className="mt-4 font-display text-2xl font-semibold text-ink">Set a new password</h1>
          <p className="mt-1.5 text-[14px] leading-relaxed text-muted">
            Enter the code we sent you, then choose a new password.
          </p>

          {error && <p className="mt-4 text-[13px] text-danger">{error}</p>}

          <label htmlFor="ident" className="mb-1.5 mt-5 block text-[12.5px] font-semibold text-ink">
            Email or phone number
          </label>
          <input
            id="ident"
            autoComplete="username"
            value={identifier}
            onChange={(e) => { setIdentifier(e.target.value); setError(undefined); }}
            placeholder="you@example.com"
            className="h-12 w-full rounded-xl border border-hairline bg-paper px-3.5 text-[15px] text-ink outline-none transition focus:border-brand-green focus:ring-[3px] focus:ring-brand-green/10"
          />

          <label htmlFor="code" className="mb-1.5 mt-4 block text-[12.5px] font-semibold text-ink">
            Reset code
          </label>
          <input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => { setCode(e.target.value.replace(/\D/g, "").slice(0, 8)); setError(undefined); }}
            placeholder="123456"
            className="h-12 w-full rounded-xl border border-hairline bg-paper px-3.5 text-[18px] font-semibold tracking-[0.3em] text-ink outline-none transition focus:border-brand-green focus:ring-[3px] focus:ring-brand-green/10"
          />

          <label htmlFor="password" className="mb-1.5 mt-4 block text-[12.5px] font-semibold text-ink">
            New password
          </label>
          <div className="relative">
            <input
              id="password"
              type={show ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(undefined); }}
              placeholder="At least 8 characters"
              className="h-12 w-full rounded-xl border border-hairline bg-paper px-3.5 pr-11 text-[15px] text-ink outline-none transition focus:border-brand-green focus:ring-[3px] focus:ring-brand-green/10"
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              aria-label={show ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted transition hover:text-ink"
            >
              {show ? <EyeOff size={17} strokeWidth={1.75} /> : <Eye size={17} strokeWidth={1.75} />}
            </button>
          </div>

          <ul className="mt-3 space-y-1.5">
            {RULES.map((rule) => {
              const ok = password.length > 0 && rule.test(password);
              return (
                <li key={rule.label} className="flex items-center gap-1.5 text-[12.5px]">
                  <span className={`flex h-4 w-4 items-center justify-center rounded-full transition ${
                    ok ? "bg-brand-green text-white" : "bg-mist text-muted"
                  }`}>
                    <Check size={10} strokeWidth={3} />
                  </span>
                  <span className={ok ? "text-ink" : "text-muted"}>{rule.label}</span>
                </li>
              );
            })}
          </ul>

          <button
            type="submit"
            disabled={confirm.isPending}
            className="mt-5 inline-flex h-12 w-full items-center justify-center rounded-xl bg-brand-red text-[14px] font-semibold text-white transition hover:brightness-95 disabled:opacity-60"
          >
            {confirm.isPending ? <Loader2 size={18} className="animate-spin" /> : "Reset password"}
          </button>

          <p className="mt-3.5 rounded-lg bg-mist px-3 py-2.5 text-[11.5px] leading-relaxed text-muted">
            Resetting signs you out everywhere else. If someone else had access to your
            account, this removes it.
          </p>
        </form>
        )}
      </main>
    </div>
  );
}

/**
 * Confirmation before sending them to sign in.
 *
 * A silent redirect after changing a password is unnerving — you can't tell
 * whether it worked, or whether something failed and bounced you. Saying so
 * plainly, and naming the fact that other sessions were ended, is the
 * reassurance that matters most to someone who just reset a password because
 * they were worried about their account.
 */
function Success({ onContinue }: { onContinue: () => void }) {
  const [seconds, setSeconds] = useState(5);

  useEffect(() => {
    if (seconds <= 0) { onContinue(); return; }
    const t = setTimeout(() => setSeconds((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds, onContinue]);

  return (
    <div className="w-full rounded-2xl border border-hairline bg-paper p-6 text-center shadow-[0_1px_2px_rgba(10,10,10,0.04)] sm:p-7">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-green/10 text-brand-green">
        <CheckCircle2 size={28} strokeWidth={1.75} />
      </span>

      <h1 className="mt-4 font-display text-2xl font-semibold text-ink">
        Password reset successful
      </h1>
      <p className="mt-2 text-[14px] leading-relaxed text-muted">
        Your new password is active. Sign in with it to continue.
      </p>

      <div className="mt-4 rounded-xl bg-mist px-4 py-3 text-left">
        <p className="flex items-start gap-2 text-[12.5px] leading-relaxed text-muted">
          <ShieldCheck size={14} strokeWidth={1.75} className="mt-0.5 shrink-0 text-brand-green" />
          Every other device signed into this account has been signed out. If
          someone else had access, they no longer do.
        </p>
      </div>

      <button
        onClick={onContinue}
        className="mt-5 h-12 w-full rounded-xl bg-brand-red text-[14px] font-semibold text-white transition hover:brightness-95"
      >
        Go to sign in
      </button>

      <p className="mt-3 text-[12px] text-muted">
        Taking you there in {seconds}s
      </p>
    </div>
  );
}
