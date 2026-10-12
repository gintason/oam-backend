import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BellRing, ShieldCheck, X, Zap } from "lucide-react";
import logo from "../assets/logo.png";
import { IOS_APP_URL, detectPlatform } from "../lib/appStores";
import { StoreBadge } from "./StoreBadges";

/**
 * Invites web visitors to install the OAM app.
 *
 *  - Phones: a bottom sheet that leads with the visitor's own store.
 *  - Desktop: a quiet card, bottom-left (the assistant lives bottom-right).
 *
 * Shown a few seconds after arriving on a "browsing" page — never mid-payment,
 * sign-in or form. Closing it hides it for 7 days; tapping a store, for 60.
 */

const SHOW_ON = new Set([
  "/", "/dashboard", "/marketplace", "/jobs", "/artisans", "/deliveries", "/orders",
  "/wallet", "/bills", "/send-package", "/help", "/about",
]);
const DELAY_MS = 5000;
const KEY = "oam_app_prompt_until";
const SESSION_KEY = "oam_app_prompt_seen";
const DAY = 24 * 60 * 60 * 1000;

function suppressed(): boolean {
  try {
    if (sessionStorage.getItem(SESSION_KEY)) return true;
    const until = Number(localStorage.getItem(KEY) || 0);
    return until > Date.now();
  } catch {
    return false;
  }
}

function snooze(days: number) {
  try {
    localStorage.setItem(KEY, String(Date.now() + days * DAY));
  } catch {
    /* private mode — the session flag still stops repeats */
  }
}

function markSeen() {
  try {
    sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    /* ignore */
  }
}

function isStandalone(): boolean {
  return typeof window !== "undefined" &&
    (window.matchMedia?.("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true);
}

export default function AppDownloadPrompt() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const platform = useMemo(detectPlatform, []);
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  // iPhone visitors are only prompted once there's an App Store link to send them to.
  const eligible = !(platform === "ios" && !IOS_APP_URL) && !isStandalone();
  // Leaving for a form or payment page hides it (without snoozing for days).
  const onBrowsingPage = SHOW_ON.has(pathname.replace(/\/+$/, "") || "/");
  const visible = open && onBrowsingPage;

  useEffect(() => {
    if (open || !eligible || !onBrowsingPage || suppressed()) return;
    const timer = window.setTimeout(() => {
      if (suppressed()) return;
      markSeen();
      setOpen(true);
    }, DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [onBrowsingPage, open, eligible]);

  useEffect(() => {
    if (!visible) return;
    // The phone sheet blocks the page, so it takes focus; the desktop card stays passive.
    if (platform !== "desktop") closeRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && dismiss();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, platform]);

  function dismiss() {
    snooze(7);
    setOpen(false);
  }
  function installed() {
    snooze(60);
    setOpen(false);
  }

  if (!visible) return null;

  const features = [
    { Icon: BellRing, text: t("appPromo.f1", "Instant alerts for payments and orders") },
    { Icon: Zap, text: t("appPromo.f2", "Faster checkout and transfers") },
    { Icon: ShieldCheck, text: t("appPromo.f3", "Secure sign-in on your device") },
  ];

  const header = (compact: boolean) => (
    <div className={`relative overflow-hidden bg-ink text-white ${compact ? "px-5 pb-5 pt-6" : "px-6 pb-6 pt-7"}`}>
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#E31012_0%,#E31012_50%,#0B7327_50%,#0B7327_100%)]" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-brand-green/40 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-16 -left-10 h-36 w-36 rounded-full bg-brand-red/25 blur-3xl" />
      <button
        ref={closeRef}
        type="button"
        onClick={dismiss}
        aria-label={t("appPromo.close", "Close")}
        className="absolute right-3.5 top-3.5 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/80 transition hover:bg-white/20 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
      >
        <X size={18} strokeWidth={2} />
      </button>
      <div className="relative flex items-center gap-4">
        <div className={`flex shrink-0 items-center justify-center rounded-2xl bg-white shadow-[0_10px_24px_-10px_rgba(0,0,0,0.6)] ${compact ? "h-14 w-14" : "h-16 w-16"}`}>
          <img src={logo} alt="" className="h-9 w-auto object-contain" />
        </div>
        <div className="min-w-0 pr-8">
          <h2 id="oam-app-prompt-title" className={`font-display font-semibold leading-tight ${compact ? "text-[19px]" : "text-[22px]"}`}>
            {t("appPromo.title", "Get the O.A.M app")}
          </h2>
          <p className="mt-1 text-[13.5px] leading-snug text-white/70">
            {t("appPromo.subtitle", "Everything OAM, faster — right on your phone.")}
          </p>
        </div>
      </div>
    </div>
  );

  const featureList = (
    <ul className="space-y-2.5">
      {features.map(({ Icon, text }) => (
        <li key={text} className="flex items-center gap-3 text-[14px] text-ink">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-green/10 text-brand-green">
            <Icon size={16} strokeWidth={2} />
          </span>
          {text}
        </li>
      ))}
    </ul>
  );

  /* ---------- phones: bottom sheet ---------- */
  if (platform !== "desktop") {
    const store = platform === "ios" ? "ios" : "android";
    return (
      <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-labelledby="oam-app-prompt-title">
        <div className="absolute inset-0 bg-ink/45 backdrop-blur-[2px]" onClick={dismiss} />
        <div className="absolute inset-x-0 bottom-0 overflow-hidden rounded-t-[28px] bg-paper shadow-[0_-18px_50px_-12px_rgba(17,17,17,0.45)] motion-safe:animate-riseIn">
          {header(false)}
          <div className="px-6 pb-[max(22px,env(safe-area-inset-bottom))] pt-5">
            {featureList}
            <div className="mt-6">
              <StoreBadge store={store} size="lg" onPress={installed} />
            </div>
            <button
              type="button"
              onClick={dismiss}
              className="mt-3 w-full rounded-2xl py-3 text-[14.5px] font-medium text-muted transition hover:bg-mist hover:text-ink"
            >
              {t("appPromo.later", "Continue on the web")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ---------- desktop: floating card ---------- */
  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="oam-app-prompt-title"
      className="fixed bottom-6 left-6 z-[80] w-[380px] max-w-[calc(100vw-48px)] overflow-hidden rounded-[24px] bg-paper ring-1 ring-hairline shadow-[0_28px_70px_-18px_rgba(17,17,17,0.45)] motion-safe:animate-riseIn"
    >
      {header(true)}
      <div className="px-5 pb-5 pt-4">
        {featureList}
        <div className="mt-5 flex gap-2.5">
          <StoreBadge store="ios" onPress={installed} />
          <StoreBadge store="android" onPress={installed} />
        </div>
        <p className="mt-3 text-center text-[12px] text-muted">{t("appPromo.free", "Free on iPhone and Android")}</p>
      </div>
    </div>
  );
}
