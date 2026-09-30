import { Link, NavLink } from "react-router-dom";
import { Loader2, Building2 } from "lucide-react";
import type { ReactNode, InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes } from "react";
import AppHeader from "../AppHeader";
import {
  STATUS_LABEL, JOB_STATUS_LABEL, type ApplicationStatus, type JobStatus,
} from "../../services/jobs";

/* ------------------------------------------------------------------ */
/* Page shell + section tabs                                           */
/* ------------------------------------------------------------------ */

type Tab = { to: string; label: string; end?: boolean };

const SEEKER_TABS: Tab[] = [
  { to: "/jobs/search", label: "Find jobs" },
  { to: "/jobs/applications", label: "Applications" },
  { to: "/jobs/saved", label: "Saved & alerts" },
  { to: "/jobs/messages", label: "Messages" },
  { to: "/jobs/profile", label: "My CV" },
];

const EMPLOYER_TABS: Tab[] = [
  { to: "/jobs/employer", label: "Dashboard", end: true },
  { to: "/jobs/employer/post", label: "Post a job" },
  { to: "/jobs/employer/candidates", label: "Candidates" },
  { to: "/jobs/messages", label: "Messages" },
  { to: "/jobs/employer/plans", label: "Plans" },
];

export function JobsShell({
  children,
  side = "seeker",
  wide = false,
}: {
  children: ReactNode;
  side?: "seeker" | "employer" | "none";
  wide?: boolean;
}) {
  const tabs = side === "employer" ? EMPLOYER_TABS : side === "seeker" ? SEEKER_TABS : [];
  return (
    <div className="min-h-screen bg-mist pb-24 md:pb-10">
      <AppHeader />
      {tabs.length > 0 && (
        <div className="sticky top-[65px] z-30 border-b border-hairline bg-paper/95 backdrop-blur">
          <nav
            className={`mx-auto flex gap-1 overflow-x-auto px-3 sm:px-5 ${wide ? "max-w-7xl" : "max-w-5xl"}`}
            aria-label="Jobs"
          >
            {tabs.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                end={t.end ?? false}
                className={({ isActive }) =>
                  `whitespace-nowrap border-b-2 px-3 py-3 text-[13px] font-medium transition ${
                    isActive
                      ? "border-brand-green text-ink"
                      : "border-transparent text-muted hover:text-ink"
                  }`
                }
              >
                {t.label}
              </NavLink>
            ))}
          </nav>
        </div>
      )}
      <main className={`mx-auto px-3 py-5 sm:px-5 sm:py-6 ${wide ? "max-w-7xl" : "max-w-5xl"}`}>
        {children}
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Status pills — colour + text, never colour alone                    */
/* ------------------------------------------------------------------ */

const APP_TONE: Record<ApplicationStatus, string> = {
  applied: "bg-mist text-ink border-hairline",
  under_review: "bg-mist text-ink border-hairline",
  shortlisted: "bg-brand-green/10 text-brand-green border-brand-green/20",
  interview: "bg-brand-green/10 text-brand-green border-brand-green/20",
  offer: "bg-brand-green/15 text-brand-green border-brand-green/30",
  hired: "bg-brand-green text-white border-brand-green",
  rejected: "bg-danger/5 text-danger border-danger/15",
  withdrawn: "bg-mist text-muted border-hairline",
};

export function StatusPill({ status }: { status: ApplicationStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11.5px] font-semibold ${APP_TONE[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

const JOB_TONE: Record<JobStatus, string> = {
  draft: "bg-mist text-muted border-hairline",
  pending_review: "bg-warn/10 text-warn border-warn/20",
  active: "bg-brand-green/10 text-brand-green border-brand-green/20",
  paused: "bg-mist text-ink border-hairline",
  closed: "bg-mist text-muted border-hairline",
  expired: "bg-warn/10 text-warn border-warn/20",
  rejected: "bg-danger/5 text-danger border-danger/15",
};

export function JobStatusPill({ status }: { status: JobStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11.5px] font-semibold ${JOB_TONE[status]}`}>
      {JOB_STATUS_LABEL[status]}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Bits                                                                */
/* ------------------------------------------------------------------ */

export function CompanyLogo({ url, name, size = 44 }: { url?: string; name: string; size?: number }) {
  if (url) {
    return (
      <img
        src={url}
        alt=""
        width={size}
        height={size}
        className="shrink-0 rounded-xl border border-hairline bg-paper object-contain"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-xl bg-brand-green/10 font-display font-semibold text-brand-green"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      aria-hidden
    >
      {name ? name[0].toUpperCase() : <Building2 size={size * 0.45} />}
    </span>
  );
}

export function Avatar({ name, url, size = 40 }: { name: string; url?: string; size?: number }) {
  if (url) {
    return <img src={url} alt="" className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />;
  }
  const initials = name.split(/\s+/).map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-ink font-semibold text-white"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      aria-hidden
    >
      {initials || "?"}
    </span>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center py-10 ${className}`}>
      <Loader2 size={22} className="animate-spin text-muted" />
    </div>
  );
}

export function EmptyState({
  icon, title, body, action,
}: { icon: ReactNode; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-hairline bg-paper px-6 py-10 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-mist text-muted">{icon}</span>
      <h3 className="mt-3 font-display text-[16px] font-semibold text-ink">{title}</h3>
      {body && <p className="mx-auto mt-1 max-w-sm text-[13.5px] leading-relaxed text-muted">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorNote({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="rounded-lg border border-danger/20 bg-danger/5 px-3 py-2 text-[13px] text-danger">
      {children}
    </p>
  );
}

export function Chip({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`h-8 rounded-full border px-3 text-[12.5px] font-medium transition ${
        active
          ? "border-ink bg-ink text-white"
          : "border-hairline bg-paper text-ink hover:border-ink/40"
      }`}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Buttons                                                             */
/* ------------------------------------------------------------------ */

type BtnProps = {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
  className?: string;
  to?: string;
};

export function Button({
  children, onClick, type = "button", disabled, loading, variant = "primary", size = "md",
  className = "", to,
}: BtnProps) {
  const base = `inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition disabled:opacity-60 ${
    size === "sm" ? "h-8 px-3 text-[12.5px]" : "h-10 px-4 text-[13.5px]"
  }`;
  const tone = {
    primary: "bg-brand-green text-white hover:brightness-95",
    secondary: "border border-hairline bg-paper text-ink hover:bg-mist",
    ghost: "text-muted hover:bg-mist hover:text-ink",
    danger: "border border-danger/25 bg-paper text-danger hover:bg-danger/5",
  }[variant];
  const cls = `${base} ${tone} ${className}`;
  const content = (
    <>
      {loading && <Loader2 size={14} className="animate-spin" />}
      {children}
    </>
  );
  if (to) return <Link to={to} className={cls}>{content}</Link>;
  return (
    <button type={type} onClick={onClick} disabled={disabled || loading} className={cls}>
      {content}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Form fields                                                         */
/* ------------------------------------------------------------------ */

export function Field({
  label, hint, error, children, htmlFor,
}: { label: string; hint?: string; error?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-[12.5px] font-semibold text-ink">{label}</label>
      {children}
      {error ? (
        <p className="mt-1 text-[12px] text-danger">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-[12px] text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-hairline bg-paper px-3 text-[14px] text-ink outline-none transition placeholder:text-muted/70 focus:border-brand-green focus:ring-2 focus:ring-brand-green/15";

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`h-10 ${inputCls} ${props.className ?? ""}`} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`py-2 leading-relaxed ${inputCls} ${props.className ?? ""}`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`h-10 ${inputCls} ${props.className ?? ""}`} />;
}

export function Toggle({
  checked, onChange, label,
}: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 py-1">
      <span className="text-[13.5px] text-ink">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? "bg-brand-green" : "bg-hairline"}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${checked ? "left-[22px]" : "left-0.5"}`}
        />
      </button>
    </label>
  );
}

/** Small match badge: score + label, colour only as reinforcement. */
export function MatchBadge({ score, compact = false }: { score: number; compact?: boolean }) {
  const label = score >= 80 ? "Great match" : score >= 60 ? "Good match" : score >= 40 ? "Fair match" : "Low match";
  const tone = score >= 60 ? "text-brand-green bg-brand-green/10" : "text-muted bg-mist";
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${tone}`}
          title={compact ? label : undefined}>
      <span className="tabular">{score}%</span>{compact ? " match" : ` · ${label}`}
    </span>
  );
}
