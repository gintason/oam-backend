import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Bus, Car, Plane } from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import AppHeader from "../../components/AppHeader";
import logo from "../../assets/logo.png";

/** Shown at /travel/bus while bus tickets are switched off (see src/config/features.ts). */
export default function BusComingSoon() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();

  // Keep this placeholder out of search results until booking is live.
  useEffect(() => {
    const prev = document.title;
    document.title = t("busSoon.docTitle", "Bus tickets — coming soon | O.A.M");
    let robots = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (!robots) { robots = document.createElement("meta"); robots.name = "robots"; document.head.appendChild(robots); }
    const prevRobots = robots.content;
    robots.content = "noindex,follow";
    return () => { document.title = prev; if (robots) robots.content = prevRobots; };
  }, [t]);

  return (
    <div className="min-h-screen bg-mist">
      {isAuthenticated ? <AppHeader /> : (
        <header className="border-b border-hairline bg-paper">
          <div className="mx-auto flex h-16 max-w-5xl items-center px-5">
            <Link to="/"><img src={logo} alt="O.A.M" className="h-8 w-auto" /></Link>
          </div>
        </header>
      )}
      <main className="mx-auto max-w-xl px-5 py-10 sm:py-16">
        <Link to={isAuthenticated ? "/dashboard" : "/"} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink">
          <ArrowLeft size={15} strokeWidth={1.75} /> {isAuthenticated ? t("busSoon.backDashboard", "Back to dashboard") : t("busSoon.backHome", "Back to home")}
        </Link>
        <section className="mt-6 rounded-3xl border border-hairline bg-paper p-8 text-center shadow-[0_1px_2px_rgba(10,10,10,0.04)]">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-green/10 text-brand-green">
            <Bus size={30} strokeWidth={1.75} />
          </span>
          <span className="mt-5 inline-block rounded-full bg-brand-red/10 px-3 py-1 text-[12px] font-semibold uppercase tracking-wider text-brand-red">
            {t("busSoon.badge", "Coming soon")}
          </span>
          <h1 className="mt-3 font-display text-2xl font-medium text-ink sm:text-3xl">{t("busSoon.title", "Bus tickets are coming soon")}</h1>
          <p className="mx-auto mt-3 max-w-sm text-[15px] leading-relaxed text-muted">
            {t("busSoon.body", "We're putting the finishing touches on intercity bus booking. You'll be able to pick your route, choose your seats and pay from your wallet very soon.")}
          </p>
          <p className="mt-6 text-[13px] font-medium uppercase tracking-wider text-muted">{t("busSoon.meanwhile", "In the meantime")}</p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <Link to="/travel/flights" className="inline-flex h-11 items-center gap-2 rounded-xl border border-hairline px-4 text-[14px] font-medium text-ink hover:border-brand-green/40">
              <Plane size={16} className="text-brand-green" /> {t("busSoon.flights", "Book a flight")}
            </Link>
            <Link to="/travel/carhire" className="inline-flex h-11 items-center gap-2 rounded-xl border border-hairline px-4 text-[14px] font-medium text-ink hover:border-brand-green/40">
              <Car size={16} className="text-brand-green" /> {t("busSoon.carHire", "Hire a car")}
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
