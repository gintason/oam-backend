import { Link } from "react-router-dom";

/**
 * Shared surfaces for the Marketplace and Home Services sections.
 *
 * The brand's dark card (near-black with a green wash and the tricolor rule)
 * was only used on the wallet balance until now, which made the rest of the app
 * feel like a different product. These bring the same language everywhere,
 * while keeping the plain white card for dense content — a page of gradients
 * is harder to read, not more premium.
 */

/** Dark hero card: light green bleeding into black. For section headers. */
export function DarkPanel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-[#0a0a0a] text-white ${className}`}>
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
      <div className="relative">{children}</div>
    </div>
  );
}

/** Standard content card — white, hairline border, lifts on hover when linked. */
export function Card({
  children,
  className = "",
  interactive = false,
}: {
  children: React.ReactNode;
  className?: string;
  interactive?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border border-hairline bg-paper shadow-[0_1px_2px_rgba(10,10,10,0.04)] ${
        interactive
          ? "transition duration-200 hover:-translate-y-0.5 hover:border-brand-green/40 hover:shadow-[0_8px_24px_rgba(10,10,10,0.08)]"
          : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * Big choice card for the decision hubs.
 *
 * Uses the same treatment as the services cards on the landing page: a hairline
 * green border over a soft green-to-charcoal gradient. Both options on a hub
 * get the identical card — they're two equal paths, not a recommended one and
 * an afterthought, and styling one louder than the other quietly pushes people
 * toward it.
 */
export function ChoiceCard({
  to,
  icon,
  title,
  description,
  action,
}: {
  to: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  action: string;
}) {
  return (
    <Link to={to} className="group block h-full">
      <div className="flex h-full flex-col rounded-2xl border border-brand-green/[0.18] bg-[linear-gradient(150deg,rgba(11,115,39,0.14),rgba(17,17,17,0.04))] p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_18px_rgba(11,115,39,0.12)] sm:p-6">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-green/12 text-brand-green">
          {icon}
        </span>
        <h2 className="mt-4 font-display text-[17px] font-semibold text-ink sm:text-[18px]">
          {title}
        </h2>
        <p className="mt-1.5 flex-1 text-[13.5px] leading-relaxed text-muted">{description}</p>
        <span className="mt-4 inline-flex items-center gap-1 text-[13px] font-semibold text-brand-green">
          {action}
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
               className="transition group-hover:translate-x-0.5">
            <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2"
                  strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
    </Link>
  );
}

/** Small stat block for dashboard headers, readable on the dark panel. */
export function Stat({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: "default" | "warn" | "good";
}) {
  const valueTone =
    tone === "warn" ? "text-warn" : tone === "good" ? "text-brand-green" : "text-white";
  return (
    <div>
      <p className="text-[10.5px] font-semibold uppercase tracking-wider text-white/45">{label}</p>
      <p className={`mt-1 tabular font-display text-[20px] font-bold leading-none ${valueTone}`}>
        {value}
      </p>
      {hint && <p className="mt-1 text-[11.5px] text-white/50">{hint}</p>}
    </div>
  );
}

/** Section heading used across the inner pages. */
export function SectionTitle({
  children,
  action,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <h2 className="font-display text-[16px] font-semibold text-ink sm:text-[17px]">{children}</h2>
      {action}
    </div>
  );
}
