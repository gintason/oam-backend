import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Car, ExternalLink, Info, Loader2, Search } from "lucide-react";
import AppHeader from "../../components/AppHeader";
import { affiliatesApi } from "../../services/affiliates";
import { apiErrorMessage } from "../../lib/api";

const CITIES = [
  "Lagos", "Abuja", "Port Harcourt", "Ibadan", "Kano", "Enugu", "Benin City",
  "Calabar", "Uyo", "Accra", "London", "Dubai", "Johannesburg", "Nairobi",
];

function today() { return new Date().toISOString().slice(0, 10); }

/** Car hire search — deep-links into our partner with the dates prefilled. */
export default function CarHire() {
  const navigate = useNavigate();
  const [location, setLocation] = useState("Lagos");
  const [pickup, setPickup] = useState(today());
  const [dropoff, setDropoff] = useState("");
  const [error, setError] = useState<string>();

  const search = useMutation({
    mutationFn: () =>
      affiliatesApi.getLink("carhire", {
        location, pickup_date: pickup, dropoff_date: dropoff,
      }),
    onSuccess: (link) => window.open(link.url, "_blank", "noopener,noreferrer"),
    onError: (err) => setError(apiErrorMessage(err, "Couldn't open car hire search.")),
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
            <Car size={22} strokeWidth={1.75} />
          </span>
          <div>
            <h1 className="font-display text-xl font-semibold text-ink sm:text-2xl">Car hire</h1>
            <p className="text-[13px] text-muted">Rent a car at thousands of locations.</p>
          </div>
        </div>

        <div className="rounded-2xl border border-hairline bg-paper p-5">
          {error && <div className="mb-4 rounded-lg border border-danger/30 bg-danger/5 px-3.5 py-2.5 text-[13px] text-danger">{error}</div>}

          <label className="mb-1.5 block text-[12.5px] font-semibold text-ink">Pick-up location</label>
          <input
            list="carhire-cities"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="City or airport"
            className="mb-4 h-11 w-full rounded-[10px] border border-hairline bg-paper px-3 text-[14px] text-ink outline-none focus:border-brand-green"
          />
          <datalist id="carhire-cities">
            {CITIES.map((c) => <option key={c} value={c} />)}
          </datalist>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[12.5px] font-semibold text-ink">Pick-up date</label>
              <input type="date" value={pickup} min={today()} onChange={(e) => setPickup(e.target.value)}
                className="h-11 w-full rounded-[10px] border border-hairline bg-paper px-3 text-[14px] text-ink outline-none focus:border-brand-green" />
            </div>
            <div>
              <label className="mb-1.5 block text-[12.5px] font-semibold text-ink">Drop-off date</label>
              <input type="date" value={dropoff} min={pickup || today()} onChange={(e) => setDropoff(e.target.value)}
                className="h-11 w-full rounded-[10px] border border-hairline bg-paper px-3 text-[14px] text-ink outline-none focus:border-brand-green" />
            </div>
          </div>

          <button
            onClick={() => { setError(undefined); search.mutate(); }}
            disabled={search.isPending}
            className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-[11px] bg-brand-red text-[15px] font-semibold text-white shadow-[0_8px_20px_rgba(227,16,18,0.25)] transition hover:brightness-95 disabled:opacity-60"
          >
            {search.isPending ? <Loader2 size={18} className="animate-spin" /> : <><Search size={17} strokeWidth={2} /> Search cars</>}
          </button>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-[12px] text-muted">
            <ExternalLink size={12} strokeWidth={1.75} /> Opens with our partner to complete booking.
          </p>
        </div>

        <section className="mt-8 rounded-2xl border border-hairline bg-paper p-5">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold text-ink">
            <Info size={16} strokeWidth={1.75} className="text-brand-green" /> Renting in Nigeria
          </h2>
          <ul className="mt-3 space-y-2.5 text-[13px] leading-relaxed text-muted">
            <li><span className="font-medium text-ink">Chauffeur-driven is the norm.</span> Many Nigerian rentals include a driver — often easier than self-drive if you don't know the roads.</li>
            <li><span className="font-medium text-ink">Confirm what's included:</span> fuel policy, driver's allowance, and whether trips outside the city cost extra.</li>
            <li><span className="font-medium text-ink">Self-drive usually needs</span> a valid licence (an international permit if you're visiting), a deposit, and sometimes a guarantor.</li>
            <li><span className="font-medium text-ink">Photograph the car before and after.</span> It settles any dispute over existing scratches.</li>
          </ul>
        </section>
      </main>
    </div>
  );
}
