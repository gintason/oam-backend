import { Link, useLocation, useNavigate } from "react-router-dom";
import { LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { revenueApi } from "../services/billing";
import logo from "../assets/logo.png";
import { useUserScope } from "../auth/useUserScope";
import { messagingApi } from "../services/messaging";
import { useAuth } from "../auth/AuthContext";
import BottomTabs from "./BottomTabs";
import Assistant from "./Assistant";
import LanguageSwitcher from "./LanguageSwitcher";

/**
 * Travel, Marketplace and Find Artisans are deliberately absent: they already
 * have cards in the dashboard's own services grid, and repeating them in the
 * navbar makes the bar long without making anything easier to reach.
 *
 * `inTabs` marks the items that appear in the mobile bottom bar. Those are
 * hidden from the mobile menu here — repeating the same destination in two
 * places on a small screen just makes both feel unreliable. On desktop there
 * is no bottom bar, so the full list shows.
 *
 * `key` maps to header.nav.<key> in the translation files.
 */
const NAV = [
  { key: "dashboard", to: "/dashboard", inTabs: true },
  { key: "wallet", to: "/wallet", inTabs: true },
  { key: "orders", to: "/orders", inTabs: true },
  { key: "messages", to: "/messages", inTabs: false },
];

/** Top navigation shared across authenticated in-app pages. */
export default function AppHeader() {
  const { t } = useTranslation();
  const scope = useUserScope();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  // Only admins can read revenue — if it succeeds, show the Earnings link.
  const isAdmin = useQuery({
    queryKey: ["revenue", scope, "probe"],
    queryFn: revenueApi.get,
    retry: false,
    staleTime: 10 * 60_000,
  }).isSuccess;

  // Unread badge. Polled rather than pushed — see Chat.tsx for why.
  const unread = useQuery({
    queryKey: ["messaging", scope, "unread"],
    queryFn: messagingApi.unread,
    enabled: Boolean(user),
    refetchInterval: 30000,
    retry: false,
  }).data ?? 0;

  const navItems = isAdmin
    ? [...NAV, { key: "earnings", to: "/earnings", inTabs: false }]
    : NAV;

  // Bottom-bar destinations are dropped from the mobile menu.
  const mobileNavItems = navItems.filter((n) => !n.inTabs);

  async function onLogout() {
    await logout();
    navigate("/", { replace: true });
  }

  const initial =
    user?.first_name?.[0]?.toUpperCase() ||
    user?.email?.[0]?.toUpperCase() ||
    "U";

  return (
    <>
    <header className="sticky top-0 z-40 border-b border-hairline bg-paper/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-6">
        <div className="flex items-center gap-8">
          <Link to="/dashboard" className="inline-flex">
            <img src={logo} alt="OAM" className="h-8 w-auto" />
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((n) => {
              const active = location.pathname === n.to;
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={`relative rounded-lg px-3 py-2 text-sm font-medium transition ${
                    active ? "bg-brand-green/10 text-brand-green" : "text-ink hover:bg-mist"
                  }`}
                >
                  {t(`header.nav.${n.key}`)}
                  {n.to === "/messages" && unread > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-red px-1 text-[10px] font-bold text-white">
                      {unread > 9 ? "9+" : unread}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <LanguageSwitcher className="hidden sm:block" />
          <div className="hidden items-center gap-2.5 sm:flex">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-green/10 text-[13px] font-semibold text-brand-green">
              {initial}
            </span>
            <span className="max-w-[120px] truncate text-sm font-medium text-ink">
              {user?.first_name || user?.email}
            </span>
          </div>
          {/* Red on a very light green wash: unmistakably the exit, without a
              solid red button shouting at everyone who wasn't leaving. */}
          <button
            onClick={onLogout}
            className="hidden h-9 items-center gap-1.5 rounded-lg border border-brand-red/25 bg-[linear-gradient(150deg,rgba(11,115,39,0.13),rgba(227,16,18,0.07))] px-3 text-sm font-medium text-brand-red transition duration-200 hover:border-brand-red/40 hover:bg-[linear-gradient(150deg,rgba(11,115,39,0.18),rgba(227,16,18,0.13))] hover:shadow-[0_4px_12px_rgba(227,16,18,0.14)] md:inline-flex"
          >
            <LogOut size={15} strokeWidth={1.75} />
            {t("header.signOut")}
          </button>
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label={t("header.menu")}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-hairline text-ink md:hidden"
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* mobile menu */}
      {open && (
        <div className="border-t border-hairline bg-paper px-5 py-3 md:hidden">
          <nav className="flex flex-col gap-1">
            {mobileNavItems.map((n) => {
              const active = location.pathname === n.to;
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  onClick={() => setOpen(false)}
                  className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    active ? "bg-brand-green/10 text-brand-green" : "text-ink hover:bg-mist"
                  }`}
                >
                  {t(`header.nav.${n.key}`)}
                  {n.to === "/messages" && unread > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-red px-1.5 text-[11px] font-bold text-white">
                      {unread}
                    </span>
                  )}
                </Link>
              );
            })}
            {/* Language switcher also lives in the mobile menu (it's hidden in
                the top bar on small screens to save space). */}
            <div className="mt-2 border-t border-hairline pt-3">
              <LanguageSwitcher className="w-full" />
            </div>
          </nav>
        </div>
      )}
    </header>

    <BottomTabs />
    <Assistant />
    </>
  );
}
