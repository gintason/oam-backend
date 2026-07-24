import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft, MapPin, Search, Loader2, BadgeCheck, Star, Wrench, Navigation,
} from "lucide-react";
import AppHeader from "../../components/AppHeader";
import { DarkPanel } from "../../components/Surface";
import { useUserScope } from "../../auth/useUserScope";
import { useDebounced } from "../../hooks/useDebounced";
import {
  homeServicesApi, CITIES, type ArtisanListItem,
} from "../../services/homeservices";

const RADII = [5, 10, 25, 50];

/**
 * Browse artisans near a point.
 *
 * The backend search is proximity-based and REQUIRES coordinates, so we ask the
 * browser for a location — but plenty of people decline that prompt, and on a
 * desktop it's often wrong anyway. So a city selector is always visible rather
 * than being a hidden fallback: the search radius is meaningless unless the
 * user can see, and change, what it's measured from.
 */
export default function FindArtisans() {
  const navigate = useNavigate();
  const scope = useUserScope();

  const [city, setCity] = useState<(typeof CITIES)[number]>(CITIES[0]);
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({
    lat: CITIES[0].lat, lng: CITIES[0].lng,
  });
  const [usingDevice, setUsingDevice] = useState(false);
  const [radius, setRadius] = useState(10);
  const [category, setCategory] = useState("");
  const [q, setQ] = useState("");
  const debouncedQ = useDebounced(q, 500);

  const categories = useQuery({
    queryKey: ["artisan-categories"],
    queryFn: homeServicesApi.categories,
    staleTime: 10 * 60_000,
  });

  const results = useQuery({
    queryKey: ["artisans", scope, coords.lat, coords.lng, radius, category, debouncedQ],
    queryFn: () => homeServicesApi.search({
      lat: coords.lat, lng: coords.lng, radius_km: radius,
      category: category || undefined, q: debouncedQ || undefined,
    }),
  });

  function useMyLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setUsingDevice(true);
      },
      () => setUsingDevice(false),
      { timeout: 8000 },
    );
  }

  // Offer it once on load; a refusal simply leaves the city selector in charge.
  useEffect(() => { useMyLocation(); /* eslint-disable-next-line */ }, []);

  const artisans = results.data?.results ?? [];

  return (
    <div className="min-h-screen bg-mist">
      <AppHeader />

      <main className="mx-auto max-w-4xl px-4 py-5 sm:px-5 sm:py-6">
        <button
          onClick={() => navigate("/artisans")}
          className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted transition hover:text-ink"
        >
          <ArrowLeft size={15} strokeWidth={1.75} /> Home services
        </button>

        <h1 className="font-display text-[22px] font-semibold text-ink sm:text-2xl">Find an artisan</h1>

        {/* location + radius */}
        <div className="mt-4 rounded-2xl border border-hairline bg-paper p-4 shadow-[0_1px_2px_rgba(10,10,10,0.04)]">
          <div className="flex flex-wrap items-center gap-2">
            <MapPin size={15} strokeWidth={1.75} className="text-muted" />
            <span className="text-[13px] text-muted">Searching near</span>
            {usingDevice ? (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-brand-green/10 px-2.5 py-1 text-[13px] font-semibold text-brand-green">
                <Navigation size={12} strokeWidth={2.25} /> your location
              </span>
            ) : (
              <select
                value={city.name}
                onChange={(e) => {
                  const next = CITIES.find((c) => c.name === e.target.value)!;
                  setCity(next);
                  setCoords({ lat: next.lat, lng: next.lng });
                }}
                className="h-8 rounded-lg border border-hairline bg-paper px-2 text-[13px] font-medium text-ink outline-none focus:border-brand-green"
              >
                {CITIES.map((c) => <option key={c.name}>{c.name}</option>)}
              </select>
            )}

            {usingDevice ? (
              <button
                onClick={() => { setUsingDevice(false); setCoords({ lat: city.lat, lng: city.lng }); }}
                className="text-[12.5px] font-medium text-muted underline transition hover:text-ink"
              >
                choose a city instead
              </button>
            ) : (
              <button
                onClick={useMyLocation}
                className="text-[12.5px] font-medium text-brand-green underline transition hover:brightness-90"
              >
                use my location
              </button>
            )}
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {RADII.map((r) => (
              <button
                key={r}
                onClick={() => setRadius(r)}
                className={`h-8 rounded-lg px-3 text-[12.5px] font-medium transition ${
                  radius === r ? "bg-ink text-white"
                              : "border border-hairline bg-paper text-muted hover:bg-mist hover:text-ink"
                }`}
              >
                {r} km
              </button>
            ))}
          </div>
        </div>

        {/* search + category */}
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search size={16} strokeWidth={1.75}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Plumber, electrician, mechanic…"
              className="h-11 w-full rounded-xl border border-hairline bg-paper pl-10 pr-3.5 text-[14px] text-ink outline-none transition focus:border-brand-green focus:ring-[3px] focus:ring-brand-green/10"
            />
          </div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-11 rounded-xl border border-hairline bg-paper px-3 text-[14px] text-ink outline-none focus:border-brand-green sm:w-52"
          >
            <option value="">All trades</option>
            {categories.data?.map((c) => (
              <option key={c.id} value={c.slug}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* results */}
        <div className="mt-5">
          {results.isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 size={22} className="animate-spin text-muted" />
            </div>
          ) : results.isError ? (
            <p className="rounded-xl border border-hairline bg-paper p-5 text-center text-[13.5px] text-muted">
              Couldn't load artisans just now. Try again in a moment.
            </p>
          ) : artisans.length === 0 ? (
            <div className="rounded-2xl border border-hairline bg-paper py-12 text-center shadow-[0_1px_2px_rgba(10,10,10,0.04)] sm:py-14">
              <Wrench size={28} strokeWidth={1.5} className="mx-auto text-muted" />
              <p className="mt-3 text-[14px] font-medium text-ink">
                No artisans within {radius} km
              </p>
              <p className="mx-auto mt-1 max-w-sm text-[13px] leading-relaxed text-muted">
                Try a wider radius or a different trade. This is a new service, so
                coverage is still growing.
              </p>
              <Link to="/artisans/me"
                    className="mt-4 inline-flex h-10 items-center rounded-lg bg-brand-red px-4 text-[13px] font-semibold text-white transition hover:brightness-95">
                List your own trade
              </Link>
            </div>
          ) : (
            <>
              <p className="mb-2.5 text-[12.5px] text-muted">
                {results.data?.count} artisan{results.data?.count === 1 ? "" : "s"} within {radius} km
              </p>
              <ul className="grid gap-3 sm:grid-cols-2">
                {artisans.map((a) => <Card key={a.id} artisan={a} />)}
              </ul>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function Card({ artisan }: { artisan: ArtisanListItem }) {
  return (
    <li>
      <Link
        to={`/artisans/${artisan.id}`}
        className="flex h-full gap-3 rounded-2xl border border-hairline bg-paper p-4 shadow-[0_1px_2px_rgba(10,10,10,0.04)] transition duration-200 hover:-translate-y-0.5 hover:border-brand-green/40 hover:shadow-[0_8px_24px_rgba(10,10,10,0.08)]"
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-mist">
          {artisan.profile_photo
            ? <img src={artisan.profile_photo} alt="" className="h-full w-full object-cover" />
            : <Wrench size={20} strokeWidth={1.75} className="text-muted" />}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-1.5">
            <h3 className="line-clamp-1 text-[14px] font-semibold text-ink">
              {artisan.business_name}
            </h3>
            {artisan.is_verified && (
              <BadgeCheck size={14} strokeWidth={2} className="mt-0.5 shrink-0 text-brand-green" />
            )}
          </div>
          <p className="text-[12.5px] text-muted">{artisan.category_name}</p>
          <p className="mt-0.5 line-clamp-1 text-[12px] text-muted">
            {[artisan.city, artisan.state].filter(Boolean).join(", ")}
            {artisan.distance_km != null && ` · ${artisan.distance_km.toFixed(1)} km away`}
          </p>
          {artisan.is_featured && (
            <span className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-warn/10 px-1.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-warn">
              <Star size={9} strokeWidth={2.5} /> Featured
            </span>
          )}
        </div>
      </Link>
    </li>
  );
}
