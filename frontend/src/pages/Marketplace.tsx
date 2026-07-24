import { useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { MapPin, Search, ShieldCheck, Store } from "lucide-react";
import { marketplaceApi, type Listing } from "../services/marketplace";
import { useCurrency } from "../currency/CurrencyContext";
import AppHeader from "../components/AppHeader";

/**
 * In-app Marketplace browse page (auth-gated). Live categories + listings from
 * the backend, with a category filter, search, and loading/empty/error states.
 */
export default function Marketplace() {
  const { format } = useCurrency();
  const [category, setCategory] = useState<string | undefined>(undefined); // slug
  const [searchInput, setSearchInput] = useState("");
  const [q, setQ] = useState("");

  // Categories (cached; rarely change)
  const categoriesQuery = useQuery({
    queryKey: ["marketplace", "categories"],
    queryFn: marketplaceApi.getCategories,
    staleTime: 10 * 60_000,
  });

  // Listings react to category + search
  const listingsQuery = useQuery({
    queryKey: ["marketplace", "listings", { category, q }],
    queryFn: () => marketplaceApi.getListings({ category, q }),
    placeholderData: keepPreviousData, // keep old results visible while refetching
  });

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    setQ(searchInput.trim());
  }

  const listings = listingsQuery.data?.results ?? [];
  const total = listingsQuery.data?.count ?? 0;

  return (
    <div className="min-h-screen bg-mist">
      <AppHeader />

      <main className="mx-auto max-w-6xl px-5 py-8 sm:px-6 sm:py-10">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">
            Marketplace
          </h1>
          <p className="mt-1 text-[14px] text-muted">
            Buy and sell across Nigeria — {total > 0 ? `${total} live listing${total === 1 ? "" : "s"}` : "browse listings"}.
          </p>
        </div>

        {/* Search */}
        <form
          onSubmit={submitSearch}
          className="mb-5 flex items-center gap-2 rounded-xl border border-hairline bg-paper p-2"
        >
          <div className="flex flex-1 items-center gap-2 px-2">
            <Search size={18} strokeWidth={1.75} className="shrink-0 text-muted" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search listings…"
              className="h-9 w-full min-w-0 bg-transparent text-[14px] text-ink outline-none placeholder:text-muted"
            />
          </div>
          <button
            type="submit"
            className="h-10 shrink-0 rounded-lg bg-brand-green px-5 text-[14px] font-medium text-white transition hover:brightness-95"
          >
            Search
          </button>
        </form>

        {/* Category tabs */}
        <div className="scrollbar-hide -mx-5 mb-6 flex snap-x gap-2 overflow-x-auto scroll-smooth px-5 pb-1 sm:mx-0 sm:px-0">
          <CategoryChip label="All" active={!category} onClick={() => setCategory(undefined)} />
          {categoriesQuery.data?.map((c) => (
            <CategoryChip
              key={c.id}
              label={c.name}
              active={category === c.slug}
              onClick={() => setCategory(c.slug)}
            />
          ))}
        </div>

        {/* Results */}
        {listingsQuery.isError ? (
          <ErrorState onRetry={() => listingsQuery.refetch()} />
        ) : listingsQuery.isLoading ? (
          <ListingSkeletonGrid />
        ) : listings.length === 0 ? (
          <EmptyState hasFilters={Boolean(category || q)} onClear={() => { setCategory(undefined); setQ(""); setSearchInput(""); }} />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {listings.map((l) => (
              <ListingCard key={l.id} listing={l} price={format(parseFloat(l.price))} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function CategoryChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 snap-start whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition ${
        active ? "bg-brand-green text-white" : "border border-hairline bg-paper text-ink hover:bg-mist"
      }`}
    >
      {label}
    </button>
  );
}

function ListingCard({ listing, price }: { listing: Listing; price: string }) {
  return (
    <div className="group overflow-hidden rounded-2xl border border-hairline bg-paper transition hover:-translate-y-0.5 hover:border-ink/20 hover:shadow-sm">
      <div className="relative flex h-32 items-center justify-center overflow-hidden bg-mist sm:h-36">
        {listing.primary_image ? (
          <img
            src={listing.primary_image}
            alt={listing.title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <Store size={30} strokeWidth={1.5} className="text-muted" />
        )}
        {listing.is_featured && (
          <span className="absolute left-2 top-2 rounded-md bg-brand-red px-2 py-0.5 text-[10px] font-semibold text-white">
            Featured
          </span>
        )}
      </div>
      <div className="p-3">
        <h3 className="line-clamp-1 text-[14px] font-medium text-ink">{listing.title}</h3>
        <div className="mt-1 tabular text-[15px] font-semibold text-brand-green">{price}</div>
        <div className="mt-2 flex items-center justify-between text-[12px] text-muted">
          <span className="line-clamp-1">{listing.category_name}</span>
          {listing.location && (
            <span className="flex shrink-0 items-center gap-0.5">
              <MapPin size={11} strokeWidth={1.75} />
              <span className="max-w-[70px] truncate">{listing.location}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function ListingSkeletonGrid() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-hairline bg-paper">
          <div className="h-32 animate-pulse bg-hairline/60 sm:h-36" />
          <div className="space-y-2 p-3">
            <div className="h-3.5 w-3/4 animate-pulse rounded bg-hairline/60" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-hairline/60" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-hairline/60" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ hasFilters, onClear }: { hasFilters: boolean; onClear: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-hairline bg-paper px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-mist">
        <Store size={22} strokeWidth={1.5} className="text-muted" />
      </div>
      <h3 className="mt-4 text-[15px] font-semibold text-ink">No listings found</h3>
      <p className="mt-1 max-w-xs text-[13px] text-muted">
        {hasFilters
          ? "Nothing matches your filters yet. Try a different category or search."
          : "There are no live listings right now. Check back soon."}
      </p>
      {hasFilters && (
        <button
          onClick={onClear}
          className="mt-4 rounded-lg border border-hairline bg-paper px-4 py-2 text-[13px] font-medium text-ink transition hover:bg-mist"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-danger/20 bg-danger/[0.03] px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-danger/10">
        <ShieldCheck size={22} strokeWidth={1.5} className="text-danger" />
      </div>
      <h3 className="mt-4 text-[15px] font-semibold text-ink">Couldn't load listings</h3>
      <p className="mt-1 max-w-xs text-[13px] text-muted">
        Something went wrong reaching the marketplace. Check your connection and try again.
      </p>
      <button
        onClick={onRetry}
        className="mt-4 rounded-lg bg-brand-green px-4 py-2 text-[13px] font-medium text-white transition hover:brightness-95"
      >
        Try again
      </button>
    </div>
  );
}
