import { useState, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRightLeft, Clock, ExternalLink, Info, Loader2, Lock, Plane } from "lucide-react";
import AppHeader from "../../components/AppHeader";
import {
  affiliatesApi, AIRPORTS, REGIONS, ROUTE_INFO, POPULAR_BY_REGION, POPULAR_ROUTES, airportName,
} from "../../services/affiliates";
import { apiErrorMessage } from "../../lib/api";

function today() { return new Date().toISOString().slice(0, 10); }

/**
 * Flight search. OAM doesn't hold flight inventory — we build a tracked,
 * deep-linked search on our partner (Aviasales), who compares hundreds of
 * airlines and agencies. Everything the traveller types is carried across, so
 * they land on results rather than a blank homepage.
 */
export default function Flights() {
  const navigate = useNavigate();
  const [origin, setOrigin] = useState("LOS");
  const [destination, setDestination] = useState("LHR");
  const [depart, setDepart] = useState(today());
  const [ret, setRet] = useState("");
  const [adults, setAdults] = useState(1);
  const [roundTrip, setRoundTrip] = useState(true);
  const [error, setError] = useState<string>();

  const search = useMutation({
    mutationFn: () =>
      affiliatesApi.getLink("flights", {
        origin, destination,
        depart_date: depart,
        return_date: roundTrip ? ret : "",
        adults,
      }),
    onSuccess: (link) => window.open(link.url, "_blank", "noopener,noreferrer"),
    onError: (err) => setError(apiErrorMessage(err, "Couldn't open flight search.")),
  });

  const routeKey = `${origin}-${destination}`;
  const info = ROUTE_INFO[routeKey];

  const [region, setRegion] = useState<string>("Europe");
  const popularFromHere = useMemo(() => {
    const codes = POPULAR_BY_REGION[region] ?? [];
    return codes
      .filter((c) => c !== origin)
      .map((c) => AIRPORTS.find((a) => a.code === c))
      .filter(Boolean) as typeof AIRPORTS;
  }, [region, origin]);

  function swap() {
    setOrigin(destination);
    setDestination(origin);
  }

  return (
    <div className="min-h-screen bg-mist">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-5 py-8 sm:px-6 sm:py-10">
        <button onClick={() => navigate("/travel")} className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted transition hover:text-ink">
          <ArrowLeft size={15} /> Travel
        </button>

        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-green/10 text-brand-green">
            <Plane size={22} strokeWidth={1.75} />
          </span>
          <div>
            <h1 className="font-display text-xl font-semibold text-ink sm:text-2xl">Find flights</h1>
            <p className="text-[13px] text-muted">Compare hundreds of airlines and agencies.</p>
          </div>
        </div>

        {/* Search */}
        <div className="rounded-2xl border border-hairline bg-paper p-5">
          {error && <div className="mb-4 rounded-lg border border-danger/30 bg-danger/5 px-3.5 py-2.5 text-[13px] text-danger">{error}</div>}

          <div className="mb-4 flex gap-2">
            <button
              onClick={() => setRoundTrip(true)}
              className={`h-9 flex-1 rounded-lg text-[13px] font-medium transition ${roundTrip ? "bg-brand-green/10 text-brand-green" : "bg-mist text-muted hover:text-ink"}`}
            >
              Round trip
            </button>
            <button
              onClick={() => { setRoundTrip(false); setRet(""); }}
              className={`h-9 flex-1 rounded-lg text-[13px] font-medium transition ${!roundTrip ? "bg-brand-green/10 text-brand-green" : "bg-mist text-muted hover:text-ink"}`}
            >
              One way
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
            <div>
              <label className="mb-1.5 block text-[12.5px] font-semibold text-ink">From</label>
              <AirportSelect value={origin} onChange={setOrigin} />
            </div>
            <button
              onClick={swap}
              aria-label="Swap"
              className="mx-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-hairline bg-paper text-muted transition hover:bg-mist hover:text-ink"
            >
              <ArrowRightLeft size={16} strokeWidth={1.75} />
            </button>
            <div>
              <label className="mb-1.5 block text-[12.5px] font-semibold text-ink">To</label>
              <AirportSelect value={destination} onChange={setDestination} />
            </div>
          </div>

          <div className={`mt-4 grid gap-3 ${roundTrip ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
            <div>
              <label className="mb-1.5 block text-[12.5px] font-semibold text-ink">Departing</label>
              <input
                type="date"
                value={depart}
                min={today()}
                onChange={(e) => setDepart(e.target.value)}
                className="h-11 w-full rounded-[10px] border border-hairline bg-paper px-3 text-[14px] text-ink outline-none focus:border-brand-green"
              />
            </div>
            {roundTrip && (
              <div>
                <label className="mb-1.5 block text-[12.5px] font-semibold text-ink">Returning</label>
                <input
                  type="date"
                  value={ret}
                  min={depart || today()}
                  onChange={(e) => setRet(e.target.value)}
                  className="h-11 w-full rounded-[10px] border border-hairline bg-paper px-3 text-[14px] text-ink outline-none focus:border-brand-green"
                />
              </div>
            )}
            <div>
              <label className="mb-1.5 block text-[12.5px] font-semibold text-ink">Passengers</label>
              <select
                value={adults}
                onChange={(e) => setAdults(Number(e.target.value))}
                className="h-11 w-full rounded-[10px] border border-hairline bg-paper px-3 text-[14px] text-ink outline-none focus:border-brand-green"
              >
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>{n} adult{n > 1 ? "s" : ""}</option>
                ))}
              </select>
            </div>
          </div>

          {info && (
            <div className="mt-4 flex items-start gap-2 rounded-lg bg-mist px-3.5 py-2.5">
              <Clock size={15} strokeWidth={1.75} className="mt-0.5 shrink-0 text-brand-green" />
              <p className="text-[12.5px] text-muted">
                <span className="font-medium text-ink">{origin} → {destination} · {info.hours} non-stop</span>
                <span className="block">{info.note}</span>
              </p>
            </div>
          )}

          <button
            onClick={() => { setError(undefined); search.mutate(); }}
            disabled={search.isPending}
            className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-[11px] bg-brand-red text-[15px] font-semibold text-white shadow-[0_8px_20px_rgba(227,16,18,0.25)] transition hover:brightness-95 active:scale-[0.99] disabled:opacity-60"
          >
            {search.isPending
              ? <Loader2 size={18} className="animate-spin" />
              : <><Plane size={17} strokeWidth={2} /> Compare prices</>}
          </button>

          <p className="mt-3 text-center text-[12.5px] text-muted">
            Compare fares from hundreds of airlines and travel agencies.
          </p>
          <p className="mt-1.5 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-[11.5px] text-muted">
            <span className="inline-flex items-center gap-1"><Lock size={11} strokeWidth={2} /> Secure search</span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1"><ExternalLink size={11} strokeWidth={2} /> Opens in a new tab</span>
            <span aria-hidden="true">·</span>
            <span>Powered by Aviasales</span>
          </p>
        </div>

        {/* Popular destinations */}
        {/* One-tap popular routes */}
        <section className="mt-8">
          <h2 className="mb-3 text-[15px] font-semibold text-ink">Popular routes</h2>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {POPULAR_ROUTES.map((r) => {
              const ri = ROUTE_INFO[`${r.from}-${r.to}`];
              const active = origin === r.from && destination === r.to;
              return (
                <button
                  key={r.label}
                  onClick={() => { setOrigin(r.from); setDestination(r.to); }}
                  className={`rounded-xl border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-sm ${
                    active ? "border-brand-green bg-brand-green/5" : "border-hairline bg-paper"
                  }`}
                >
                  <div className="text-[13px] font-semibold leading-snug text-ink">{r.label}</div>
                  <div className="mt-0.5 text-[11px] text-muted">{r.from} → {r.to}</div>
                  {ri && <div className="mt-1 text-[11px] text-brand-green">{ri.hours}</div>}
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-8">
          <h2 className="mb-3 text-[15px] font-semibold text-ink">Explore destinations</h2>
          <div className="scrollbar-hide -mx-5 mb-3 flex gap-2 overflow-x-auto px-5 sm:mx-0 sm:px-0">
            {REGIONS.map((r) => (
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
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {popularFromHere.map((d) => {
              const ri = ROUTE_INFO[`${origin}-${d.code}`];
              return (
                <button
                  key={d.code}
                  onClick={() => setDestination(d.code)}
                  className={`rounded-xl border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-sm ${
                    destination === d.code ? "border-brand-green bg-brand-green/5" : "border-hairline bg-paper"
                  }`}
                >
                  <div className="text-[13.5px] font-semibold text-ink">{d.city}</div>
                  <div className="text-[11.5px] text-muted">{d.country} · {d.code}</div>
                  {ri && <div className="mt-1 text-[11px] text-brand-green">{ri.hours}</div>}
                </button>
              );
            })}
          </div>
        </section>

        {/* Practical info */}
        <section className="mt-8 rounded-2xl border border-hairline bg-paper p-5">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold text-ink">
            <Info size={16} strokeWidth={1.75} className="text-brand-green" />
            Before you book
          </h2>
          <ul className="mt-3 space-y-2.5 text-[13px] leading-relaxed text-muted">
            <li><span className="font-medium text-ink">Name must match your passport.</span> Airlines charge to correct names, and some won't allow changes at all.</li>
            <li><span className="font-medium text-ink">Check visa and transit rules early.</span> Some connections need a transit visa even if you never leave the airport.</li>
            <li><span className="font-medium text-ink">Lagos and Abuja have separate domestic and international terminals.</span> Allow extra time if you're connecting between them.</li>
            <li><span className="font-medium text-ink">Mid-week departures are usually cheaper</span> than Friday and Sunday, and prices tend to climb closer to departure.</li>
            <li><span className="font-medium text-ink">Confirm baggage allowance</span> before paying — the cheapest fare often excludes checked bags.</li>
          </ul>
        </section>
      </main>
    </div>
  );
}

function AirportSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-11 w-full rounded-[10px] border border-hairline bg-paper px-3 text-[14px] text-ink outline-none focus:border-brand-green"
    >
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
  );
}
