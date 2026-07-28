import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft, Search, Loader2, Star, Package, SlidersHorizontal, MapPin,
} from "lucide-react";
import AppHeader from "../../components/AppHeader";
import VerifiedBadge from "../../components/VerifiedBadge";
import { DarkPanel } from "../../components/Surface";
import CategoryTabs from "../../components/CategoryTabs";
import { useUserScope } from "../../auth/useUserScope";
import { useDebounced } from "../../hooks/useDebounced";
import {
  marketplaceApi, CONDITIONS, type ListingListItem,
} from "../../services/marketplace";
import { naira, friendlyTime } from "../../lib/format";

export default function BrowseListings() {
  const navigate = useNavigate();
  const scope = useUserScope();
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [condition, setCondition] = useState("");
  const [location, setLocation] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const debouncedQ = useDebounced(q, 500);
  const debouncedLoc = useDebounced(location, 500);
  const debouncedMin = useDebounced(minPrice, 700);
  const debouncedMax = useDebounced(maxPrice, 700);

  const categories = useQuery({
    queryKey: ["market-categories"],
    queryFn: marketplaceApi.categories,
    staleTime: 10 * 60_000,
  });

  const listings = useQuery({
    queryKey: ["marketplace", scope, "browse", debouncedQ, category, condition,
               debouncedLoc, debouncedMin, debouncedMax],
    queryFn: () => marketplaceApi.browse({
      q: debouncedQ || undefined,
      category: category || undefined,
      condition: condition || undefined,
      location: debouncedLoc || undefined,
      min_price: debouncedMin || undefined,
      max_price: debouncedMax || undefined,
    }),
  });

  const items = listings.data?.results ?? [];

  /**
   * "All" first so there's always a way back to everything, then O.A.M Motors —
   * the house brand leads, matching the landing page — then whatever else the
   * backend returns, in its own order.
   */
  const tabList = [
    { label: "All", slug: "all" },
    ...(categories.data ?? [])
      .map((c) => ({ label: c.slug === "oam-motors" ? "O.A.M Motors" : c.name, slug: c.slug }))
      .sort((a, b) =>
        a.slug === "oam-motors" ? -1 : b.slug === "oam-motors" ? 1 : 0,
      ),
  ];
  const activeFilters = [condition, debouncedLoc, debouncedMin, debouncedMax]
    .filter(Boolean).length;

  return (
    <div className="min-h-screen bg-mist">
      <AppHeader />

      <main className="mx-auto max-w-5xl px-4 py-5 sm:px-5 sm:py-6">
        <button
          onClick={() => navigate("/marketplace")}
          className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted transition hover:text-ink"
        >
          <ArrowLeft size={15} strokeWidth={1.75} /> Marketplace
        </button>

        <DarkPanel className="mb-3">
          <div className="p-5 sm:p-6">
            <h1 className="font-display text-[22px] font-semibold leading-tight sm:text-2xl">
              Browse items
            </h1>
            <p className="mt-1 text-[13px] text-white/60">
              From sellers across Nigeria.
            </p>
          </div>
        </DarkPanel>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={16} strokeWidth={1.75}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="What are you looking for?"
              className="h-11 w-full rounded-xl border border-hairline bg-paper pl-10 pr-3.5 text-[14px] text-ink outline-none transition focus:border-brand-green focus:ring-[3px] focus:ring-brand-green/10"
            />
          </div>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`relative inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl border px-3.5 text-[13.5px] font-medium transition ${
              showFilters || activeFilters
                ? "border-brand-green bg-brand-green/5 text-brand-green"
                : "border-hairline bg-paper text-ink hover:bg-mist"
            }`}
          >
            <SlidersHorizontal size={15} strokeWidth={1.75} />
            Filters
            {activeFilters > 0 && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-brand-green text-[10px] font-bold text-white">
                {activeFilters}
              </span>
            )}
          </button>
        </div>

        <div className="mt-3">
          <CategoryTabs
            tabs={tabList}
            activeSlug={category || "all"}
            onSelect={(slug) => setCategory(slug === "all" ? "" : slug)}
            ariaLabel="Marketplace categories"
          />
        </div>

        {showFilters && (
          <div className="mt-3 grid gap-3 rounded-2xl border border-hairline bg-paper p-4 shadow-[0_1px_2px_rgba(10,10,10,0.04)] sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[12px] font-semibold text-ink">Condition</label>
              <select value={condition} onChange={(e) => setCondition(e.target.value)}
                      className="h-10 w-full rounded-lg border border-hairline bg-paper px-2.5 text-[13.5px] text-ink outline-none focus:border-brand-green">
                <option value="">Any condition</option>
                {CONDITIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-[12px] font-semibold text-ink">Location</label>
              <input value={location} onChange={(e) => setLocation(e.target.value)}
                     placeholder="e.g. Abuja"
                     className="h-10 w-full rounded-lg border border-hairline bg-paper px-3 text-[13.5px] text-ink outline-none focus:border-brand-green" />
            </div>
            <div>
              <label className="mb-1.5 block text-[12px] font-semibold text-ink">Price range (₦)</label>
              <div className="flex items-center gap-2">
                <input value={minPrice} inputMode="numeric"
                       onChange={(e) => setMinPrice(e.target.value.replace(/\D/g, ""))}
                       placeholder="Min"
                       className="h-10 w-full rounded-lg border border-hairline bg-paper px-3 text-[13.5px] text-ink outline-none focus:border-brand-green" />
                <span className="text-muted">–</span>
                <input value={maxPrice} inputMode="numeric"
                       onChange={(e) => setMaxPrice(e.target.value.replace(/\D/g, ""))}
                       placeholder="Max"
                       className="h-10 w-full rounded-lg border border-hairline bg-paper px-3 text-[13.5px] text-ink outline-none focus:border-brand-green" />
              </div>
            </div>
            {activeFilters > 0 && (
              <button
                onClick={() => { setCondition(""); setLocation(""); setMinPrice(""); setMaxPrice(""); }}
                className="justify-self-start text-[12.5px] font-medium text-brand-red underline sm:col-span-2"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}

        <div className="mt-5">
          {listings.isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 size={22} className="animate-spin text-muted" />
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-2xl border border-hairline bg-paper py-12 text-center shadow-[0_1px_2px_rgba(10,10,10,0.04)] sm:py-14">
              <Package size={28} strokeWidth={1.5} className="mx-auto text-muted" />
              <p className="mt-3 text-[14px] font-medium text-ink">Nothing matches that</p>
              <p className="mx-auto mt-1 max-w-sm text-[13px] leading-relaxed text-muted">
                {activeFilters > 0
                  ? "Try widening your filters."
                  : "The marketplace is just getting started — be one of the first to list something."}
              </p>
              <Link to="/marketplace/sell"
                    className="mt-4 inline-flex h-10 items-center rounded-lg bg-brand-red px-4 text-[13px] font-semibold text-white transition hover:brightness-95">
                Post an item
              </Link>
            </div>
          ) : (
            <>
              <p className="mb-3 text-[12.5px] text-muted">
                {listings.data?.count} item{listings.data?.count === 1 ? "" : "s"}
              </p>
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((l) => <Card key={l.id} listing={l} />)}
              </ul>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function Card({ listing }: { listing: ListingListItem }) {
  return (
    <li>
      <Link
        to={`/marketplace/${listing.id}`}
        className="group block h-full overflow-hidden rounded-2xl border border-hairline bg-paper shadow-[0_1px_2px_rgba(10,10,10,0.04)] transition duration-200 hover:-translate-y-0.5 hover:border-brand-green/40 hover:shadow-[0_8px_24px_rgba(10,10,10,0.08)]"
      >
        <div className="relative aspect-[4/3] bg-mist">
          {listing.primary_image ? (
            <img src={listing.primary_image} alt=""
                 className="h-full w-full object-cover transition group-hover:scale-[1.02]" />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Package size={30} strokeWidth={1.25} className="text-muted" />
            </div>
          )}
          {listing.is_featured && (
            <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-md bg-warn px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              <Star size={9} strokeWidth={2.5} /> Featured
            </span>
          )}
          {listing.is_verified && (
            <span className="absolute right-2 top-2">
              <VerifiedBadge size="sm" />
            </span>
          )}
        </div>

        <div className="p-3.5">
          <p className="line-clamp-1 text-[14px] font-semibold text-ink">{listing.title}</p>
          <p className="mt-0.5 text-[16px] font-bold text-brand-red tabular">
            {naira(listing.price)}
            {listing.negotiable && (
              <span className="ml-1.5 text-[11px] font-medium text-muted">negotiable</span>
            )}
          </p>
          <p className="mt-1 flex items-center gap-1 text-[11.5px] text-muted">
            <MapPin size={11} strokeWidth={1.75} />
            <span className="line-clamp-1">{listing.location || "—"}</span>
          </p>
          <p className="mt-0.5 text-[11px] text-muted">{friendlyTime(listing.created_at)}</p>
        </div>
      </Link>
    </li>
  );
}
