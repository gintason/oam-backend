import { BedDouble, Car, Gift, Link, Plane, Send, Smartphone, Store, Tv, Wrench, Zap, type LucideIcon } from "lucide-react";

/**
 * Services grid. Each card is an ACTION entry point — when the backend/auth is
 * wired, clicking routes to that service's flow (buy airtime, pay DStv, find
 * artisans, book a flight, trade gift cards, transfer money, etc.).
 *
 * For now each card carries a `route` (the intended destination) and renders as
 * a link. Swap the <a href> for your router (<Link to={route}>) later, or gate
 * behind auth (redirect to sign-in, then continue to route).
 *
 * Card look: white with a light green/black tint wash, green icon tile; brand
 * services (Cable, Gift Cards) use a red tile. Lifts on hover.
 */

type Service = {
  Icon: LucideIcon;
  title: string;
  desc: string;
  route: string;   // where this action goes once wired
  tint: "green" | "red";
};

const SERVICES: Service[] = [
  { Icon: Smartphone, title: "Airtime & Data", desc: "Top up any network instantly.", route: "/services/airtime",     tint: "green" },
  { Icon: Tv,         title: "Cable TV",       desc: "DStv, GOtv and Startimes.",     route: "/services/cable",       tint: "red"   },
  { Icon: Zap,        title: "Electricity",    desc: "Prepaid tokens and postpaid.",  route: "/services/electricity", tint: "green" },
  { Icon: Store,      title: "Marketplace",    desc: "Buy and sell locally.",         route: "/marketplace",          tint: "green" },
  { Icon: Wrench,     title: "Artisans",       desc: "Trusted pros near you.",        route: "/artisans",             tint: "green" },
  { Icon: Plane,      title: "Flights",        desc: "Compare and book cheap fares.", route: "/travel/flights",       tint: "green" },
  { Icon: BedDouble,  title: "Hotels",         desc: "Stays and experiences.",        route: "/travel/hotels",        tint: "green" },
  { Icon: Gift,       title: "Gift Cards",     desc: "Buy and redeem digital cards.", route: "/services/giftcards" ,  tint: "red"   },
  { Icon: Send,       title: "Money Transfer", desc: "Fast, secure transfers.",       route: "/wallet/send",    tint: "green" },
  { Icon: Car,        title: "Car Hire",       desc: "Rent a ride, anywhere.",        route: "/travel/carhire" ,      tint: "green" },
];

/*
 * These routes must match the paths declared in App.tsx exactly. Three of them
 * had drifted — /services/gift-cards, /services/transfer and /travel/car-hire
 * were hyphenated or renamed while the real routes weren't, so those three
 * cards led to a blank page. Nothing errors when a <Link> points nowhere, which
 * is why it went unnoticed: React Router simply renders no match.
 */

const iconTile = {
  green: "bg-brand-green/[0.14] text-brand-green",
  red: "bg-brand-red/10 text-brand-red",
} as const;

export default function Services() {
  return (
    <section id="services" className="scroll-mt-20 mx-auto max-w-6xl px-5 py-14 sm:px-6 sm:py-24">
      <div className="mb-12 max-w-2xl">
        <p className="mb-2 text-sm font-medium uppercase tracking-wider text-brand-green">
          One app, everything
        </p>
        <h2 className="font-display text-2xl font-medium text-ink sm:text-3xl lg:text-4xl">
          Every service you need, in one place
        </h2>
        <p className="mt-3 text-base leading-relaxed text-muted">
          Pay bills, shop, find help, travel, and move money — all from a single
          wallet, with instant delivery.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {SERVICES.map((s) => (
          <a
            key={s.title}
            href={s.route}
            aria-label={s.title}
            className="group rounded-2xl border border-brand-green/[0.18] bg-[linear-gradient(150deg,rgba(11,115,39,0.14),rgba(17,17,17,0.04))] p-5 transition hover:-translate-y-0.5 hover:shadow-[0_8px_18px_rgba(11,115,39,0.12)]"
          >
            <div className={`mb-4 inline-flex rounded-xl p-2.5 ${iconTile[s.tint]}`}>
              <s.Icon size={22} strokeWidth={1.75} />
            </div>
            <h3 className="text-[15px] font-medium text-ink">{s.title}</h3>
            <p className="mt-1 text-[13px] leading-snug text-muted">{s.desc}</p>
          </a>
        ))}
      </div>
    </section>
  );
}
