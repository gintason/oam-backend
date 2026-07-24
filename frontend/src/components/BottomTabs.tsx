import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutGrid, Wallet, Receipt, LogOut } from "lucide-react";
import { useAuth } from "../auth/AuthContext";

/**
 * Mobile bottom navigation.
 *
 * Styled to match the wallet balance card — near-black surface, the tricolor
 * hairline, and the same soft radial wash — so the two most-used surfaces in
 * the app feel like one system rather than two unrelated screens.
 *
 * Hidden on md+ where the top nav has room to breathe. The items here are
 * deliberately removed from the mobile top menu: duplicating navigation in two
 * places on a small screen makes both harder to trust.
 */

const TABS = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutGrid },
  { label: "Wallet", to: "/wallet", icon: Wallet },
  { label: "Orders", to: "/orders", icon: Receipt },
] as const;

export default function BottomTabs() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  async function onLogout() {
    if (signingOut) return;
    setSigningOut(true);
    await logout();
    navigate("/", { replace: true });
  }

  return (
    <nav
      className="oam-bottom-tabs fixed inset-x-0 bottom-0 z-50 md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Primary"
    >
        <div className="relative overflow-hidden border-t border-white/10 bg-[#0a0a0a]">
          <div
            className="absolute inset-x-0 top-0 h-[3px]"
            style={{ background: "linear-gradient(90deg,#111 33%,#E31012 33%,#E31012 66%,#0B7327 66%)" }}
          />
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 12% 0%, rgba(11,115,39,0.30), transparent 60%), radial-gradient(circle at 88% 100%, rgba(227,16,18,0.12), transparent 55%)",
            }}
          />

          <ul className="relative flex items-stretch">
            {TABS.map((t) => {
              const active =
                location.pathname === t.to || location.pathname.startsWith(`${t.to}/`);
              const Icon = t.icon;
              return (
                <li key={t.to} className="flex-1">
                  <Link
                    to={t.to}
                    aria-current={active ? "page" : undefined}
                    className="flex h-[62px] flex-col items-center justify-center gap-1 px-1"
                  >
                    <span
                      className={`flex h-7 w-12 items-center justify-center rounded-full transition ${
                        active ? "bg-brand-green/25 text-white" : "text-white/55"
                      }`}
                    >
                      <Icon size={19} strokeWidth={active ? 2.1 : 1.75} />
                    </span>
                    <span
                      className={`text-[10.5px] leading-none transition ${
                        active ? "font-semibold text-white" : "font-medium text-white/55"
                      }`}
                    >
                      {t.label}
                    </span>
                  </Link>
                </li>
              );
            })}

            <li className="flex-1">
              <button
                onClick={onLogout}
                disabled={signingOut}
                className="flex h-[62px] w-full flex-col items-center justify-center gap-1 px-1 disabled:opacity-60"
              >
                <span className="flex h-7 w-12 items-center justify-center rounded-full text-white/55 transition active:bg-brand-red/25 active:text-white">
                  <LogOut size={19} strokeWidth={1.75} />
                </span>
                <span className="text-[10.5px] font-medium leading-none text-white/55">
                  {signingOut ? "…" : "Logout"}
                </span>
              </button>
            </li>
          </ul>
      </div>
    </nav>
  );
}
