import { type InputHTMLAttributes, forwardRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useTranslation } from "react-i18next";

export const Field = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }
>(({ label, error, id, type, ...props }, ref) => {
  const { t } = useTranslation();
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword ? (show ? "text" : "password") : type;

  return (
    <div className="mb-4">
      <label htmlFor={id} className="mb-1.5 block text-[12.5px] font-semibold text-[#0a0a0a]">
        {label}
      </label>
      <div className="relative">
        <input
          ref={ref}
          id={id}
          type={inputType}
          {...props}
          className={`h-[46px] w-full rounded-[11px] border bg-white px-3.5 text-[14px] text-ink outline-none transition placeholder:text-muted focus:border-brand-green focus:ring-[3px] focus:ring-brand-green/10 ${
            isPassword ? "pr-11" : ""
          } ${error ? "border-danger" : "border-hairline"}`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            aria-label={show ? t("auth.fields.hidePassword") : t("auth.fields.showPassword")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted transition hover:text-ink"
          >
            {show ? <EyeOff size={17} strokeWidth={1.75} /> : <Eye size={17} strokeWidth={1.75} />}
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-[12px] text-danger">{error}</p>}
    </div>
  );
});
Field.displayName = "Field";

export function SubmitButton({ loading, children }: { loading?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="flex h-12 w-full items-center justify-center rounded-[11px] bg-brand-red text-[15px] font-semibold text-white shadow-[0_8px_20px_rgba(227,16,18,0.25)] transition hover:brightness-95 active:scale-[0.99] disabled:opacity-60 disabled:shadow-none"
    >
      {loading ? (
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
      ) : (
        children
      )}
    </button>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div className="mb-4 rounded-[11px] border border-danger/30 bg-danger/5 px-3.5 py-2.5 text-[13px] text-danger">
      {message}
    </div>
  );
}

export function FormNotice({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div className="mb-4 rounded-[11px] border border-brand-green/30 bg-brand-green/5 px-3.5 py-2.5 text-[13px] text-brand-green">
      {message}
    </div>
  );
}

/** Social sign-in buttons. Wired to /auth/social/ but gated until SDKs are set up. */
// Apple is not wired up for now. signInWithApple() remains in socialSdk.ts,
// so restoring it later is adding the button back, not rebuilding the flow.
type Provider = "google" | "facebook";

/**
 * A provider with no client ID configured is HIDDEN rather than shown broken.
 * A button that reliably fails is worse than no button — people assume the
 * whole sign-up is unreliable and leave.
 *
 * If none are configured, nothing renders and the email form stands alone.
 */
export function SocialButtons({
  onProvider,
  busy,
  available,
}: {
  onProvider?: (p: Provider) => void;
  busy?: Provider | null;
  available?: Record<Provider, boolean>;
}) {
  const show = (p: Provider) => available?.[p] ?? true;
  if (!show("google") && !show("facebook")) return null;

  return (
    <div className="flex gap-2 sm:gap-2.5">
      {show("google") && (
      <SocialButton label="Google" busy={busy === "google"} disabled={Boolean(busy)} onClick={() => onProvider?.("google")}>
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0012 23z" />
          <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 010-4.2V7.06H2.18a11 11 0 000 9.88l3.66-2.84z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1a11 11 0 00-9.82 6.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
        </svg>
      </SocialButton>
      )}
      {show("facebook") && (
      <SocialButton label="Facebook" busy={busy === "facebook"} disabled={Boolean(busy)} onClick={() => onProvider?.("facebook")}>
        <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#1877F2" d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z" />
        </svg>
      </SocialButton>
      )}
    </div>
  );
}

function SocialButton({ label, children, onClick, busy, disabled }: {
  label: string;
  children: React.ReactNode;
  onClick?: () => void;
  busy?: boolean;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={t("auth.fields.continueWith", { provider: label })}
      aria-busy={busy || undefined}
      title={t("auth.fields.continueWith", { provider: label })}
      className="flex h-11 flex-1 items-center justify-center gap-2 rounded-[11px] border border-hairline bg-white text-[13px] font-medium text-ink transition hover:border-ink/20 hover:bg-mist disabled:cursor-not-allowed disabled:opacity-50"
    >
      {busy ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-hairline border-t-ink" />
      ) : (
        children
      )}
      <span className="hidden xs:inline">{busy ? t("auth.fields.opening") : label}</span>
    </button>
  );
}

export function OrDivider({ label }: { label?: string }) {
  const { t } = useTranslation();
  return (
    <div className="my-5 flex items-center gap-3">
      <div className="h-px flex-1 bg-hairline" />
      <span className="text-[11px] font-medium text-muted">{label ?? t("auth.fields.orEmail")}</span>
      <div className="h-px flex-1 bg-hairline" />
    </div>
  );
}
