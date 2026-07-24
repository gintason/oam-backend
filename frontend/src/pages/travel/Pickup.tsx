import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ExternalLink, Info, Loader2, MapPinned, Search } from "lucide-react";
import AppHeader from "../../components/AppHeader";
import { affiliatesApi, AIRPORTS, REGIONS, airportName } from "../../services/affiliates";
import { apiErrorMessage } from "../../lib/api";

function today() { return new Date().toISOString().slice(0, 10); }

/** Airport pickup / private transfer — fixed-price, pre-booked. */
export default function Pickup() {
  const navigate = useNavigate();
  const [airport, setAirport] = useState("LOS");
  const [destination, setDestination] = useState("");
  const [date, setDate] = useState(today());
  const [passengers, setPassengers] = useState(1);
  const [error, setError] = useState<string>();

  const search = useMutation({
    mutationFn: () =>
      affiliatesApi.getLink("transfers", { airport, destination, date, passengers }),
    onSuccess: (link) => window.open(link.url, "_blank", "noopener,noreferrer"),
    onError: (err) => setError(apiErrorMessage(err, "Couldn't open transfer search.")),
  });

  return (
    <div className="min-h-screen bg-mist">
      <AppHeader />
      <main className="mx-auto max-w-2xl px-5 py-8 sm:px-6 sm:py-10">
        <button onClick={() => navigate("/travel")} className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted transition hover:text-ink">
          <ArrowLeft size={15} /> Travel
        </button>

        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-green/10 text-brand-green">
            <MapPinned size={22} strokeWidth={1.75} />
          </span>
          <div>
            <h1 className="font-display text-xl font-semibold text-ink sm:text-2xl">Airport pick-up</h1>
            <p className="text-[13px] text-muted">A driver waiting when you land, at a fixed price.</p>
          </div>
        </div>

        <div className="rounded-2xl border border-hairline bg-paper p-5">
          {error && <div className="mb-4 rounded-lg border border-danger/30 bg-danger/5 px-3.5 py-2.5 text-[13px] text-danger">{error}</div>}

          <label className="mb-1.5 block text-[12.5px] font-semibold text-ink">Arriving at</label>
          <select value={airport} onChange={(e) => setAirport(e.target.value)}
            className="mb-4 h-11 w-full rounded-[10px] border border-hairline bg-paper px-3 text-[14px] text-ink outline-none focus:border-brand-green">
            {REGIONS.map((r) => (
              <optgroup key={r} label={r}>
                {AIRPORTS.filter((a) => a.region === r).map((a) => (
                  <option key={a.code} value={a.code}>
                    {airportName(a.code, a.city)} ({a.code}) — {a.country}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>

          <label className="mb-1.5 block text-[12.5px] font-semibold text-ink">Going to</label>
          <input
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="Hotel, address or area"
            className="mb-4 h-11 w-full rounded-[10px] border border-hairline bg-paper px-3 text-[14px] text-ink outline-none focus:border-brand-green"
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[12.5px] font-semibold text-ink">Arrival date</label>
              <input type="date" value={date} min={today()} onChange={(e) => setDate(e.target.value)}
                className="h-11 w-full rounded-[10px] border border-hairline bg-paper px-3 text-[14px] text-ink outline-none focus:border-brand-green" />
            </div>
            <div>
              <label className="mb-1.5 block text-[12.5px] font-semibold text-ink">Passengers</label>
              <select value={passengers} onChange={(e) => setPassengers(Number(e.target.value))}
                className="h-11 w-full rounded-[10px] border border-hairline bg-paper px-3 text-[14px] text-ink outline-none focus:border-brand-green">
                {[1,2,3,4,5,6,7,8].map((n) => <option key={n} value={n}>{n} passenger{n>1?"s":""}</option>)}
              </select>
            </div>
          </div>

          <button
            onClick={() => { setError(undefined); search.mutate(); }}
            disabled={search.isPending}
            className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-[11px] bg-brand-red text-[15px] font-semibold text-white shadow-[0_8px_20px_rgba(227,16,18,0.25)] transition hover:brightness-95 disabled:opacity-60"
          >
            {search.isPending ? <Loader2 size={18} className="animate-spin" /> : <><Search size={17} strokeWidth={2} /> Find a transfer</>}
          </button>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-[12px] text-muted">
            <ExternalLink size={12} strokeWidth={1.75} /> Opens with our partner to confirm your driver.
          </p>
        </div>

        <section className="mt-8 rounded-2xl border border-hairline bg-paper p-5">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold text-ink">
            <Info size={16} strokeWidth={1.75} className="text-brand-green" /> Why pre-book
          </h2>
          <ul className="mt-3 space-y-2.5 text-[13px] leading-relaxed text-muted">
            <li><span className="font-medium text-ink">The price is fixed before you land</span> — no negotiating at arrivals after a long flight.</li>
            <li><span className="font-medium text-ink">Your driver tracks the flight</span>, so a delay doesn't leave you stranded.</li>
            <li><span className="font-medium text-ink">Give your flight number</span> when booking, and share your driver's details with someone at home.</li>
            <li><span className="font-medium text-ink">Lagos traffic is unpredictable.</span> Allow generous time for the return trip to the airport.</li>
          </ul>
        </section>
      </main>
    </div>
  );
}
