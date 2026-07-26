import { BedDouble, Car, Gift, Plane, Send, Smartphone, Store, Tv, Wrench, Zap, type LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * Services grid. Each card is an ACTION entry point — when the backend/auth is
 * wired, clicking routes to that service's flow (buy airtime, pay DStv, find
 * artisans, book a flight, trade gift cards, transfer money, etc.).
 *
 * `key` maps to landing.services.items.<key> (title + desc) in the locale files.
 * Card look: white with a light green/black tint wash, green icon tile; brand
 * services (Cable, Gift Cards) use a red tile. Lifts on hover.
 */

type Service = {
  Icon: LucideIcon;
  key: string;     // landing.services.items.<key>
  route: string;   // where this action goes once wired
  tint: "green" | "red";
};

const SERVICES: Service[] = [
  { Icon: Smartphone, key: "airtime",     route: "/services/airtime",     tint: "green" },
  { Icon: Tv,         key: "cable",       route: "/services/cable",       tint: "red"   },
  { Icon: Zap,        key: "electricity", route: "/services/electricity", tint: "green" },
  { Icon: Store,      key: "marketplace", route: "/marketplace",          tint: "green" },
  { Icon: Wrench,     key: "artisans",    route: "/artisans",             tint: "green" },
  { Icon: Plane,      key: "flights",     route: "/travel/flights",       tint: "green" },
  { Icon: BedDouble,  key: "hotels",      route: "/travel/hotels",        tint: "green" },
  { Icon: Gift,       key: "giftcards",   route: "/services/giftcards",   tint: "red"   },
  { Icon: Send,       key: "transfer",    route: "/wallet/send",          tint: "green" },
  { Icon: Car,        key: "carhire",     route: "/travel/carhire",       tint: "green" },
];

const iconTile = {
  green: "bg-brand-green/[0.14] text-brand-green",
  red: "bg-brand-red/10 text-brand-red",
} as const;

export default function Services() {
  const { t } = useTranslation();

  return (
    <section id="services" className="scroll-mt-20 mx-auto max-w-6xl px-5 py-14 sm:px-6 sm:py-24">
      <div className="mb-12 max-w-2xl">
        <p className="mb-2 text-sm font-medium uppercase tracking-wider text-brand-green">
          {t("landing.services.eyebrow")}
        </p>
        <h2 className="font-display text-2xl font-medium text-ink sm:text-3xl lg:text-4xl">
          {t("landing.services.title")}
        </h2>
        <p className="mt-3 text-base leading-relaxed text-muted">
          {t("landing.services.subtitle")}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {SERVICES.map((s) => {
          const title = t(`landing.services.items.${s.key}.title`);
          return (
            <a
              key={s.key}
              href={s.route}
              aria-label={title}
              className="group rounded-2xl border border-brand-green/[0.18] bg-[linear-gradient(150deg,rgba(11,115,39,0.14),rgba(17,17,17,0.04))] p-5 transition hover:-translate-y-0.5 hover:shadow-[0_8px_18px_rgba(11,115,39,0.12)]"
            >
              <div className={`mb-4 inline-flex rounded-xl p-2.5 ${iconTile[s.tint]}`}>
                <s.Icon size={22} strokeWidth={1.75} />
              </div>
              <h3 className="text-[15px] font-medium text-ink">{title}</h3>
              <p className="mt-1 text-[13px] leading-snug text-muted">{t(`landing.services.items.${s.key}.desc`)}</p>
            </a>
          );
        })}
      </div>
    </section>
  );
}
