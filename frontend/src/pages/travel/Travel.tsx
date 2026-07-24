import { Link } from "react-router-dom";
import { ArrowRight, BedDouble, Car, Gift, MapPinned, Plane, Wrench } from "lucide-react";
import AppHeader from "../../components/AppHeader";

const SERVICES = [
  {
    to: "/travel/flights",
    icon: <Plane size={22} strokeWidth={1.75} />,
    title: "Flights",
    text: "Compare hundreds of airlines and agencies on one search.",
    live: true,
  },
  {
    to: "/travel/carhire",
    icon: <Car size={22} strokeWidth={1.75} />,
    title: "Car hire",
    text: "Rent a car — self-drive or with a driver — at thousands of locations.",
    live: true,
  },
  {
    to: "/travel/pickup",
    icon: <MapPinned size={22} strokeWidth={1.75} />,
    title: "Airport pick-up",
    text: "A driver waiting when you land, at a price fixed before you fly.",
    live: true,
  },
  {
    to: "/travel/hotels",
    icon: <BedDouble size={22} strokeWidth={1.75} />,
    title: "Hotels",
    text: "Stays in over 100 countries, with instant confirmation.",
    live: true,
  },
  {
    to: "/services/giftcards",
    icon: <Gift size={22} strokeWidth={1.75} />,
    title: "Gift cards",
    text: "Gaming, streaming and retail codes from sellers worldwide.",
    live: true,
  },
];

/** Travel hub — the entry point to every travel service. */
export default function Travel() {
  return (
    <div className="min-h-screen bg-mist">
      <AppHeader />
      <main className="mx-auto max-w-4xl px-5 py-8 sm:px-6 sm:py-10">
        <div className="mb-7">
          <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">Travel</h1>
          <p className="mt-1 text-[14px] text-muted">
            Flights, hotels, cars and transfers worldwide — searched across trusted partners.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {SERVICES.map((s) => (
            <Link
              key={s.to}
              to={s.to}
              className="group flex items-start gap-4 rounded-2xl border border-hairline bg-paper p-5 transition hover:-translate-y-0.5 hover:border-ink/15 hover:shadow-sm"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-green/10 text-brand-green">
                {s.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="text-[15px] font-semibold text-ink">{s.title}</span>
                  {!s.live && (
                    <span className="rounded-md bg-mist px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                      Guide
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block text-[13px] leading-relaxed text-muted">{s.text}</span>
              </span>
              <ArrowRight size={17} strokeWidth={1.75} className="mt-1 shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-ink" />
            </Link>
          ))}
        </div>

        {/* How this works — honest about the model */}
        <section className="mt-8 rounded-2xl border border-hairline bg-paper p-5">
          <h2 className="text-[15px] font-semibold text-ink">How booking works</h2>
          <p className="mt-2 text-[13px] leading-relaxed text-muted">
            OAM searches trusted travel partners rather than holding seats or rooms itself.
            You fill in your trip here, we carry those details across, and you complete
            payment securely with the partner — so you get their full inventory, their
            prices and their customer protection, with nothing extra added on top.
          </p>
        </section>

        <section className="mt-4 flex items-start gap-3 rounded-2xl border border-hairline bg-paper p-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-mist text-muted">
            <Wrench size={18} strokeWidth={1.75} />
          </span>
          <div>
            <h2 className="text-[14px] font-semibold text-ink">Need a mechanic instead?</h2>
            <p className="mt-0.5 text-[13px] text-muted">
              For roadside help and vehicle repairs, browse verified artisans near you.{" "}
              <Link to="/artisans" className="font-medium text-brand-green hover:underline">Find artisans</Link>
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
