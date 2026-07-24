import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BadgeCheck, BedDouble, CalendarCheck, ExternalLink, Globe2, Search, ShieldCheck, Sparkles, Wallet } from "lucide-react";
import AppHeader from "../../components/AppHeader";
import { KLOOK_LINK } from "../../services/affiliates";

/** Destination inspiration, grouped by region. */
const DESTINATIONS: Record<string, { city: string; country: string; blurb: string }[]> = {
  Asia: [
    { city: "Tokyo", country: "Japan", blurb: "Business hotels near stations; ryokan for a traditional stay." },
    { city: "Singapore", country: "Singapore", blurb: "Marina Bay for views, Orchard for shopping, Kampong Glam for character." },
    { city: "Bangkok", country: "Thailand", blurb: "Sukhumvit and Silom are best connected by BTS Skytrain." },
    { city: "Bali", country: "Indonesia", blurb: "Seminyak for nightlife, Ubud for rice terraces, Nusa Dua for resorts." },
    { city: "Dubai", country: "UAE", blurb: "Downtown for landmarks, Marina for beach and dining." },
    { city: "Seoul", country: "South Korea", blurb: "Myeongdong for shopping, Hongdae for a younger scene." },
  ],
  Europe: [
    { city: "London", country: "United Kingdom", blurb: "Zones 1–2 keep you close to almost everything." },
    { city: "Paris", country: "France", blurb: "Le Marais and Saint-Germain balance charm with walkability." },
    { city: "Rome", country: "Italy", blurb: "Centro Storico puts the major sites within walking distance." },
    { city: "Barcelona", country: "Spain", blurb: "Eixample is central and calmer than the Gothic Quarter." },
    { city: "Amsterdam", country: "Netherlands", blurb: "Canal Ring for classic views; Jordaan for quieter streets." },
    { city: "Istanbul", country: "Türkiye", blurb: "Sultanahmet for history, Beyoğlu for restaurants and nightlife." },
  ],
  Africa: [
    { city: "Cape Town", country: "South Africa", blurb: "V&A Waterfront for convenience; Camps Bay for the coast." },
    { city: "Nairobi", country: "Kenya", blurb: "Westlands and Kilimani are central for business travellers." },
    { city: "Marrakesh", country: "Morocco", blurb: "Riads in the Medina, resorts in Hivernage." },
    { city: "Lagos", country: "Nigeria", blurb: "Victoria Island and Ikoyi for business; Lekki for newer builds." },
    { city: "Zanzibar", country: "Tanzania", blurb: "Stone Town for culture, Nungwi for beaches." },
    { city: "Cairo", country: "Egypt", blurb: "Giza for pyramid views, Zamalek for a quieter base." },
  ],
  Americas: [
    { city: "New York", country: "USA", blurb: "Midtown for first visits; Brooklyn for value and character." },
    { city: "Toronto", country: "Canada", blurb: "Downtown Core keeps you near transit and the waterfront." },
    { city: "Mexico City", country: "Mexico", blurb: "Roma Norte and Condesa are leafy, walkable and full of cafés." },
    { city: "Miami", country: "USA", blurb: "South Beach for the ocean, Brickell for business." },
    { city: "Rio de Janeiro", country: "Brazil", blurb: "Copacabana and Ipanema for beachfront." },
    { city: "Buenos Aires", country: "Argentina", blurb: "Palermo for restaurants; Recoleta for classic architecture." },
  ],
};

const REGION_TABS = Object.keys(DESTINATIONS);

/**
 * Hotels — international booking through our Klook partnership.
 * Klook covers stays, experiences and attractions worldwide, so this page pairs
 * a clear hand-off with genuinely useful booking guidance.
 */
export default function Hotels() {
  const navigate = useNavigate();
  const [region, setRegion] = useState(REGION_TABS[0]);

  function open() {
    window.open(KLOOK_LINK, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="min-h-screen bg-mist">
      <AppHeader />
      <main className="mx-auto max-w-4xl px-5 py-8 sm:px-6 sm:py-10">
        <button onClick={() => navigate("/travel")} className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted transition hover:text-ink">
          <ArrowLeft size={15} /> Travel
        </button>

        {/* Hero */}
        <section className="relative overflow-hidden rounded-2xl bg-[#0a0a0a] p-7 text-white sm:p-9">
          <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: "linear-gradient(90deg,#111 33%,#E31012 33%,#E31012 66%,#0B7327 66%)" }} aria-hidden="true" />
          <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(circle at 12% 20%, rgba(11,115,39,0.38), transparent 55%), radial-gradient(circle at 88% 85%, rgba(227,16,18,0.16), transparent 50%)" }} aria-hidden="true" />
          <div className="relative max-w-xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.08] px-3 py-1 text-[11.5px] font-medium text-white/80">
              <Globe2 size={13} strokeWidth={2} /> Stays in 100+ countries
            </span>
            <h1 className="mt-4 font-display text-[28px] font-semibold leading-tight sm:text-[34px]">
              Book hotels anywhere in the world
            </h1>
            <p className="mt-2.5 text-[14.5px] leading-relaxed text-white/70">
              From city business hotels to island resorts — compare stays, read verified
              guest reviews and book with instant confirmation through our travel partner.
            </p>
            <button
              onClick={open}
              className="mt-6 inline-flex h-12 items-center gap-2 rounded-[11px] bg-brand-red px-6 text-[15px] font-semibold text-white shadow-[0_8px_24px_rgba(227,16,18,0.3)] transition hover:brightness-95 active:scale-[0.99]"
            >
              <Search size={17} strokeWidth={2} /> Search hotels
              <ExternalLink size={14} strokeWidth={2} className="opacity-70" />
            </button>
            <p className="mt-3 text-[12px] text-white/45">
              Opens with Klook, our booking partner. Payment and confirmation happen there.
            </p>
          </div>
        </section>

        {/* Value props */}
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            { icon: <BadgeCheck size={18} strokeWidth={1.75} />, title: "Verified reviews", text: "Ratings from guests who actually stayed." },
            { icon: <CalendarCheck size={18} strokeWidth={1.75} />, title: "Instant confirmation", text: "Most bookings confirm immediately by email." },
            { icon: <Wallet size={18} strokeWidth={1.75} />, title: "Free cancellation", text: "Widely available — always check the rate's terms." },
          ].map((v) => (
            <div key={v.title} className="rounded-xl border border-hairline bg-paper p-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-green/10 text-brand-green">{v.icon}</span>
              <h3 className="mt-2.5 text-[13.5px] font-semibold text-ink">{v.title}</h3>
              <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted">{v.text}</p>
            </div>
          ))}
        </div>

        {/* Destination inspiration */}
        <section className="mt-8">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles size={16} strokeWidth={1.75} className="text-brand-green" />
            <h2 className="text-[15px] font-semibold text-ink">Where to stay, by region</h2>
          </div>
          <div className="scrollbar-hide -mx-5 mb-3 flex gap-2 overflow-x-auto px-5 sm:mx-0 sm:px-0">
            {REGION_TABS.map((r) => (
              <button
                key={r}
                onClick={() => setRegion(r)}
                className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-medium transition ${
                  region === r ? "bg-brand-green text-white" : "border border-hairline bg-paper text-ink hover:bg-mist"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {DESTINATIONS[region].map((d) => (
              <button
                key={d.city}
                onClick={open}
                className="group rounded-xl border border-hairline bg-paper p-4 text-left transition hover:-translate-y-0.5 hover:border-ink/15 hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-[14px] font-semibold text-ink">{d.city}</div>
                    <div className="text-[11.5px] text-muted">{d.country}</div>
                  </div>
                  <BedDouble size={16} strokeWidth={1.75} className="mt-0.5 shrink-0 text-muted transition group-hover:text-brand-green" />
                </div>
                <p className="mt-2 text-[12.5px] leading-relaxed text-muted">{d.blurb}</p>
              </button>
            ))}
          </div>
        </section>

        {/* Booking guidance */}
        <section className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-hairline bg-paper p-5">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold text-ink">
              <ShieldCheck size={16} strokeWidth={1.75} className="text-brand-green" /> Booking smart
            </h2>
            <ul className="mt-3 space-y-2.5 text-[13px] leading-relaxed text-muted">
              <li><span className="font-medium text-ink">Read the cancellation terms first.</span> The cheapest rate is often non-refundable — the flexible rate can be worth a few dollars more.</li>
              <li><span className="font-medium text-ink">Check what "taxes included" means.</span> Some countries add city or tourist tax on arrival, payable at the property.</li>
              <li><span className="font-medium text-ink">Filter by review count, not just score.</span> A 9.6 from 12 reviews says less than a 8.9 from 2,000.</li>
              <li><span className="font-medium text-ink">Confirm check-in times</span> if you land early or very late — not every property has a 24-hour desk.</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-hairline bg-paper p-5">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold text-ink">
              <Globe2 size={16} strokeWidth={1.75} className="text-brand-green" /> Travelling internationally
            </h2>
            <ul className="mt-3 space-y-2.5 text-[13px] leading-relaxed text-muted">
              <li><span className="font-medium text-ink">Many visa applications ask for proof of accommodation</span> — a confirmed booking with free cancellation covers this neatly.</li>
              <li><span className="font-medium text-ink">Book in the local currency</span> where you can; card conversion is usually cheaper than a hotel's own rate.</li>
              <li><span className="font-medium text-ink">Tell your bank you're travelling</span> so an international payment isn't flagged and declined.</li>
              <li><span className="font-medium text-ink">Save your confirmation offline.</span> Immigration sometimes asks for an address before you have data or wifi.</li>
            </ul>
          </div>
        </section>

        <div className="mt-8 rounded-2xl border border-hairline bg-paper p-6 text-center">
          <h2 className="font-display text-[19px] font-semibold text-ink">Ready to find your stay?</h2>
          <p className="mx-auto mt-1.5 max-w-md text-[13.5px] leading-relaxed text-muted">
            Search hotels, apartments and resorts worldwide, then book securely with our partner.
          </p>
          <button
            onClick={open}
            className="mt-5 inline-flex h-12 items-center gap-2 rounded-[11px] bg-brand-green px-7 text-[15px] font-semibold text-white transition hover:brightness-95 active:scale-[0.99]"
          >
            Search hotels <ExternalLink size={15} strokeWidth={2} className="opacity-80" />
          </button>
        </div>
      </main>
    </div>
  );
}
