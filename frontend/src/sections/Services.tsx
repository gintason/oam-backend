import { useTranslation } from "react-i18next";
import { BedDouble, Car, Gift, Plane, Send, Smartphone, Store, Tv, Wrench, Zap, type LucideIcon, ShoppingBag, Ticket, Bus } from "lucide-react";

/**
 * Services grid. Each card is an ACTION entry point — clicking routes to that
 * service's flow (buy airtime, pay DStv, find artisans, book a flight, etc.).
 *
 * Titles and descriptions are read from `landing.services.*` in the locale
 * files, so the whole grid follows the selected language. The English strings
 * below are kept only as fallbacks (2nd arg to t()) — if a key is ever missing,
 * the card shows English rather than a raw key or a blank.
 */

type Service = {
  Icon: LucideIcon;
  key: string;        // i18n id -> landing.services.items.<key>
  title: string;      // English fallback
  desc: string;       // English fallback
  route: string;
  tint: "green" | "red";
};

const SERVICES: Service[] = [
  { Icon: Smartphone, key: "airtime",     title: "Airtime & Data",  desc: "Top up any network instantly.", route: "/services/airtime",     tint: "green" },
  { Icon: Tv,         key: "cable",       title: "Cable TV",        desc: "DStv, GOtv and Startimes.",     route: "/services/cable",       tint: "green"   },
  { Icon: Zap,        key: "electricity", title: "Electricity",     desc: "Prepaid tokens and postpaid.",  route: "/services/electricity", tint: "green" },
  { Icon: Store,      key: "marketplace", title: "Marketplace",     desc: "Buy and sell locally.",         route: "/marketplace",          tint: "green" },
  { Icon: Wrench,     key: "artisans",    title: "Artisans",        desc: "Trusted pros near you.",        route: "/artisans",             tint: "green" },
  { Icon: ShoppingBag, key: "ecommerce",   title: "E-commerce",      desc: "Shop from OAM partner stores.", route: "/ecommerce",            tint: "green"   },
  { Icon: Ticket,     key: "betting",     title: "Fund Betting",    desc: "Top up your betting account.",  route: "/services/betting",     tint: "green"   },
  { Icon: Plane,      key: "flights",     title: "Flights",         desc: "Compare and book cheap fares.", route: "/travel/flights",       tint: "green" },
  { Icon: Bus,        key: "bus",         title: "Bus Tickets",     desc: "Book intercity bus trips.",     route: "/travel/bus",           tint: "green" },
  { Icon: BedDouble,  key: "hotels",      title: "Hotels",          desc: "Stays and experiences.",        route: "/travel/hotels",        tint: "green" },
  { Icon: Gift,       key: "giftcards",   title: "Gift Cards",      desc: "Buy and redeem digital cards.", route: "/services/giftcards",   tint: "green"   },
  { Icon: Send,       key: "transfer",    title: "Money Transfer",  desc: "Fast, secure transfers.",       route: "/wallet/send",          tint: "green" },
  { Icon: Car,        key: "carhire",     title: "Car Hire",        desc: "Rent a ride, anywhere.",        route: "/travel/carhire",       tint: "green" },
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
          {t("landing.services.eyebrow", "One app, everything")}
        </p>
        <h2 className="font-display text-2xl font-medium text-ink sm:text-3xl lg:text-4xl">
          {t("landing.services.title", "Every service you need, in one place")}
        </h2>
        <p className="mt-3 text-base leading-relaxed text-muted">
          {t(
            "landing.services.subtitle",
            "Pay bills, shop, find help, travel, and move money — all from a single wallet, with instant delivery.",
          )}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {SERVICES.map((s) => {
          const title = t(`landing.services.items.${s.key}.title`, s.title);
          const desc = t(`landing.services.items.${s.key}.desc`, s.desc);
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
              <p className="mt-1 text-[13px] leading-snug text-muted">{desc}</p>
            </a>
          );
        })}
      </div>
    </section>
  );
}
