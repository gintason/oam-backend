import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import logo from "../../assets/logo.png";

/**
 * Layout for the public Company pages.
 *
 * Deliberately outside RequireAuth: someone deciding whether to trust OAM with
 * their money shouldn't have to hand over a phone number before they can read
 * the terms.
 */
export default function PageShell({
  title,
  intro,
  updated,
  children,
}: {
  title: string;
  intro?: string;
  updated?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-mist">
      <header className="sticky top-0 z-40 border-b border-hairline bg-paper/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 sm:px-5">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="OAM" className="h-7 w-auto" />
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted transition hover:text-ink"
          >
            <ArrowLeft size={15} strokeWidth={1.75} /> Home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-5 sm:py-10">
        <div className="relative overflow-hidden rounded-2xl bg-[#0a0a0a] text-white">
          <div
            className="absolute inset-x-0 top-0 h-[3px]"
            style={{ background: "linear-gradient(90deg,#111 33%,#E31012 33%,#E31012 66%,#0B7327 66%)" }}
          />
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 8% 0%, rgba(11,115,39,0.42), transparent 58%), radial-gradient(circle at 95% 100%, rgba(227,16,18,0.16), transparent 52%)",
            }}
          />
          <div className="relative p-5 sm:p-8">
            <h1 className="font-display text-[26px] font-semibold leading-tight tracking-tight sm:text-[32px]">
              {title}
            </h1>
            {intro && (
              <p className="mt-2.5 max-w-xl text-[14px] leading-relaxed text-white/70 sm:text-[15px]">
                {intro}
              </p>
            )}
            {updated && (
              <p className="mt-3 text-[11.5px] uppercase tracking-wider text-white/40">
                Last updated {updated}
              </p>
            )}
          </div>
        </div>

        <div className="mt-5 space-y-4">{children}</div>

        <p className="mt-8 text-center text-[12.5px] text-muted">
          Questions? Email{" "}
          <a href="mailto:info@oam-app.com" className="font-medium text-brand-green underline">
            info@oam-app.com
          </a>
        </p>
      </main>
    </div>
  );
}

/** A white content card with an optional heading. */
export function Block({
  heading,
  children,
}: {
  heading?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-hairline bg-paper p-5 shadow-[0_1px_2px_rgba(10,10,10,0.04)] sm:p-6">
      {heading && (
        <h2 className="mb-2.5 font-display text-[17px] font-semibold text-ink">{heading}</h2>
      )}
      <div className="space-y-3 text-[14px] leading-relaxed text-muted [&_strong]:font-semibold [&_strong]:text-ink">
        {children}
      </div>
    </section>
  );
}

/** Highlighted note — used for the legal-review warnings, among others. */
export function Notice({
  tone = "warn",
  children,
}: {
  tone?: "warn" | "info";
  children: React.ReactNode;
}) {
  const styles =
    tone === "warn"
      ? "border-warn/30 bg-warn/5 text-ink"
      : "border-brand-green/25 bg-brand-green/5 text-ink";
  return (
    <div className={`rounded-xl border p-4 text-[13px] leading-relaxed ${styles}`}>
      {children}
    </div>
  );
}
