import { useState, type ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Footer } from "../../sections/CTAFooter";
import logo from "../../assets/logo.png";

const NAV = [
  { to: "/bills", label: "Pay bills" },
  { to: "/marketplace", label: "Marketplace" },
  { to: "/artisans", label: "Artisans" },
  { to: "/travel", label: "Travel" },
  { to: "/send-package", label: "Send a package" },
  { to: "/jobs", label: "Jobs" },
];

/** Shell for the public (signed-out / search engine) pages: header, <main>, footer. */
export function PublicLayout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const link = ({ isActive }: { isActive: boolean }) =>
    `rounded-lg px-3 py-2 text-[14px] transition ${isActive ? "text-ink font-medium" : "text-muted hover:text-ink"}`;
  return (
    <div className="min-h-screen bg-paper">
      <header className="sticky top-0 z-30 border-b border-hairline bg-paper/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link to="/" aria-label="O.A.M home">
            <img src={logo} alt="O.A.M — pay bills, hire artisans and shop online" width={152} height={32} className="h-8 w-auto sm:h-9" />
          </Link>
          <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
            {NAV.map((n) => <NavLink key={n.to} to={n.to} className={link}>{n.label}</NavLink>)}
          </nav>
          <div className="hidden items-center gap-2 lg:flex">
            <Link to="/sign-in" className="h-9 rounded-lg border border-hairline px-4 text-sm font-medium leading-9 text-ink hover:bg-mist">Sign in</Link>
            <Link to="/sign-up" className="h-9 rounded-lg bg-brand-red px-4 text-sm font-medium leading-9 text-white hover:brightness-95">Get started</Link>
          </div>
          <button className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-hairline lg:hidden"
            aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        {open ? (
          <nav aria-label="Mobile" className="border-t border-hairline px-4 py-3 lg:hidden">
            {NAV.map((n) => <NavLink key={n.to} to={n.to} onClick={() => setOpen(false)} className={(s) => `block ${link(s)}`}>{n.label}</NavLink>)}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link to="/sign-in" className="h-11 rounded-lg border border-hairline text-center text-sm font-medium leading-[44px]">Sign in</Link>
              <Link to="/sign-up" className="h-11 rounded-lg bg-brand-red text-center text-sm font-medium leading-[44px] text-white">Get started</Link>
            </div>
          </nav>
        ) : null}
      </header>
      <main>{children}</main>
      <Footer />
    </div>
  );
}

/** "Get started" for a signed-out visitor: sign in, then land on the real page. */
export function StartLink({ to, children, className }: { to: string; children: ReactNode; className?: string }) {
  return (
    <Link to="/sign-in" state={{ from: { pathname: to } }}
      className={className ?? "inline-flex h-12 items-center gap-2 rounded-lg bg-brand-red px-6 text-[15px] font-medium text-white transition hover:brightness-95"}>
      {children}
    </Link>
  );
}

export function Breadcrumbs({ items }: { items: [string, string][] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-[13px] text-muted">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map(([name, to], i) => (
          <li key={to} className="flex items-center gap-1.5">
            {i > 0 ? <span aria-hidden="true">/</span> : null}
            {i < items.length - 1 ? <Link to={to} className="hover:text-ink">{name}</Link> : <span className="text-ink">{name}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}
