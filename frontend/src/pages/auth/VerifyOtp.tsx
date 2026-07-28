import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AuthLayout from "./AuthLayout";
import { SubmitButton, FormError, FormNotice } from "./fields";
import { useAuth } from "../../auth/AuthContext";
import { authApi } from "../../auth/authApi";
import { apiErrorMessage } from "../../lib/api";

const CODE_LENGTH = 6;
const RESEND_COOLDOWN = 60;

export default function VerifyOtp() {
  const { verifyOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as { identifier?: string; destination?: string }) || {};

  const [identifier] = useState(state.identifier ?? "");
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [cooldown, setCooldown] = useState(0);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  // Tracks the last code we auto-submitted, so a wrong code doesn't re-fire in
  // a loop. We only auto-submit a given 6-digit code once; editing any digit
  // clears this and allows a fresh auto-submit.
  const autoSubmitted = useRef<string>("");

  useEffect(() => {
    if (!identifier) navigate("/sign-in", { replace: true });
    else inputs.current[0]?.focus();
  }, [identifier, navigate]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const code = digits.join("");

  function setDigit(i: number, val: string) {
    const clean = val.replace(/\D/g, "");
    if (!clean) {
      setDigits((d) => d.map((x, idx) => (idx === i ? "" : x)));
      return;
    }
    // support paste of full code
    if (clean.length > 1) {
      const arr = clean.slice(0, CODE_LENGTH).split("");
      setDigits((d) => d.map((x, idx) => arr[idx] ?? x));
      inputs.current[Math.min(arr.length, CODE_LENGTH - 1)]?.focus();
      return;
    }
    setDigits((d) => d.map((x, idx) => (idx === i ? clean : x)));
    if (i < CODE_LENGTH - 1) inputs.current[i + 1]?.focus();
  }

  function onKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[i] && i > 0) inputs.current[i - 1]?.focus();
  }

  async function verify(codeToCheck: string) {
    if (codeToCheck.length !== CODE_LENGTH || loading) return;
    setError(undefined);
    setNotice(undefined);
    setLoading(true);
    try {
      await verifyOtp(identifier, codeToCheck);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err, "That code didn't work. Try again."));
      // Let the user (or auto-submit) retry after a correction.
      autoSubmitted.current = "";
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (code.length !== CODE_LENGTH) {
      setError("Enter the full 6-digit code.");
      return;
    }
    autoSubmitted.current = code;
    await verify(code);
  }

  // Auto-verify the moment the final digit is entered — no need to tap Verify.
  useEffect(() => {
    if (code.length === CODE_LENGTH && autoSubmitted.current !== code && !loading) {
      autoSubmitted.current = code;
      void verify(code);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  async function onResend() {
    if (cooldown > 0) return;
    setError(undefined);
    setNotice(undefined);
    try {
      await authApi.resendOtp({ identifier });
      setNotice("A new code has been sent.");
      setCooldown(RESEND_COOLDOWN);
    } catch (err) {
      setError(apiErrorMessage(err, "Could not resend the code."));
    }
  }

  const masked = state.destination ?? identifier;

  return (
    <AuthLayout
      title="Verify your account"
      subtitle={masked ? `Enter the 6-digit code sent to ${masked}.` : "Enter the 6-digit code we sent you."}
      altPrompt="Wrong account?"
      altLink="/sign-in"
      altLabel="Back to sign in"
    >
      <form onSubmit={onSubmit} noValidate>
        <FormError message={error} />
        <FormNotice message={notice} />

        <div className="mb-6 flex justify-between gap-1.5 sm:gap-2">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => { inputs.current[i] = el; }}
              inputMode="numeric"
              autoComplete={i === 0 ? "one-time-code" : "off"}
              maxLength={CODE_LENGTH}
              value={d}
              onChange={(e) => setDigit(i, e.target.value)}
              onKeyDown={(e) => onKeyDown(i, e)}
              aria-label={`Digit ${i + 1}`}
              className="h-12 w-full min-w-0 rounded-[10px] border border-hairline bg-white text-center text-[18px] font-semibold text-ink outline-none transition focus:border-brand-green focus:ring-[3px] focus:ring-brand-green/10 xs:h-14 xs:rounded-[11px] xs:text-[22px]"
            />
          ))}
        </div>

        <SubmitButton loading={loading}>Verify</SubmitButton>
      </form>

      <div className="mt-5 text-center text-[13.5px] text-muted">
        Didn't get it?{" "}
        <button
          onClick={onResend}
          disabled={cooldown > 0}
          className="font-semibold text-brand-red hover:underline disabled:text-muted disabled:no-underline"
        >
          {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
        </button>
      </div>
    </AuthLayout>
  );
}
