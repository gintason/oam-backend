import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ArrowRight, ImageOff, Loader2, MapPin, Package, Star } from "lucide-react";
import CategoryTabs from "../components/CategoryTabs";
import { publicMarketApi, type PublicListing } from "../services/publicArtisans";
import { naira, friendlyTime } from "../lib/format";

/**
 * Live marketplace preview.
 *
 * Categories and listings both come from the public API, so a category added in
 * Django appears here without a code change — and what a visitor sees is what's
 * genuinely for sale.
 */
export default function Marketplace() {
  const { t } = useTranslation();
  const [category, setCategory] = useState("");

  const categories = useQuery({
    queryKey: ["public-market-categories"],
    queryFn: publicMarketApi.categories,
    staleTime: 10 * 60_000,
    retry: false,
  });

  const listings = useQuery({
    queryKey: ["public-listings", category],
    queryFn: () => publicMarketApi.listings({ category: category || undefined, limit: 8 }),
    retry: false,
  });

  /** "All" first, then O.A.M Motors as the house brand, then the rest. */
  const tabs = [
    { label: t("landing.marketplace.all"), slug: "all" },
    ...(categories.data ?? [])
      .map((c) => ({ label: c.slug === "oam-motors" ? "O.A.M Motors" : c.name, slug: c.slug }))
      .sort((a, b) => (a.slug === "oam-motors" ? -1 : b.slug === "oam-motors" ? 1 : 0)),
  ];

  const items = listings.data?.results ?? [];

  return (
    <section id="marketplace" className="bg-brand-green/[0.04]">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-24">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div className="max-w-2xl">
            <p className="mb-2 text-sm font-medium uppercase tracking-wider text-brand-green">
              {t("landing.marketplace.eyebrow")}
            </p>
            <h2 className="font-display text-2xl font-medium text-ink sm:text-3xl lg:text-4xl">
              {t("landing.marketplace.title")}
            </h2>
            <p className="mt-3 text-base leading-relaxed text-muted">
              {t("landing.marketplace.subtitle")}
            </p>
          </div>
          <Link
            to="/marketplace/browse"
            className="inline-flex shrink-0 items-center gap-2 text-[15px] font-medium text-brand-red transition-all hover:gap-3"
          >
            {t("landing.marketplace.viewAll")}
            <ArrowRight size={18} strokeWidth={1.75} />
          </Link>
        </div>

        {/* Tabs */}
        {tabs.length > 1 && (
          <div className="-mx-4 mb-7 px-4 sm:mx-0 sm:px-0">
            <CategoryTabs
              tabs={tabs}
              activeSlug={category || "all"}
              onSelect={(slug) => setCategory(slug === "all" ? "" : slug)}
              ariaLabel={t("landing.marketplace.categoriesAria")}
            />
          </div>
        )}

        {/* Items */}
        {listings.isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={22} className="animate-spin text-muted" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState filtered={Boolean(category)} />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {items.map((item) => <ListingCard key={item.id} item={item} />)}
          </div>
        )}
      </div>
    </section>
  );
}

function ListingCard({ item }: { item: PublicListing }) {
  const { t } = useTranslation();
  return (
    <Link
      to={`/marketplace/${item.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-hairline bg-paper shadow-[0_1px_2px_rgba(10,10,10,0.04)] transition duration-200 hover:-translate-y-0.5 hover:border-brand-green/40 hover:shadow-[0_8px_24px_rgba(10,10,10,0.08)]"
    >
      <div className="relative aspect-[4/3] bg-mist">
        {item.primary_image ? (
          <img
            src={item.primary_image}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <ImageOff size={26} strokeWidth={1.25} className="text-muted" />
          </div>
        )}
        {item.is_featured && (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-md bg-warn px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
            <Star size={9} strokeWidth={2.5} /> {t("landing.marketplace.featured")}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3.5">
        <p className="line-clamp-1 text-[14px] font-semibold text-ink">{item.title}</p>
        <p className="mt-0.5 tabular text-[16px] font-bold text-brand-red">
          {naira(item.price)}
          {item.negotiable && (
            <span className="ml-1.5 text-[11px] font-medium text-muted">{t("landing.marketplace.negotiable")}</span>
          )}
        </p>
        <p className="mt-1 flex items-center gap-1 text-[11.5px] text-muted">
          <MapPin size={11} strokeWidth={1.75} />
          <span className="line-clamp-1">{item.location || item.category_name}</span>
        </p>
        <p className="mt-auto pt-1 text-[11px] text-muted">{friendlyTime(item.created_at)}</p>
      </div>
    </Link>
  );
}

/**
 * Honest empty state.
 *
 * A new marketplace has nothing in it. Saying so, and inviting the visitor to
 * be among the first, is better than filling the space with things that aren't
 * for sale.
 */
function EmptyState({ filtered }: { filtered: boolean }) {
  const { t } = useTranslation();
  return (
    <div className="rounded-2xl border border-hairline bg-paper py-14 text-center">
      <Package size={30} strokeWidth={1.5} className="mx-auto text-muted" />
      <p className="mt-3 text-[15px] font-medium text-ink">
        {filtered ? t("landing.marketplace.emptyFilteredTitle") : t("landing.marketplace.emptyTitle")}
      </p>
      <p className="mx-auto mt-1.5 max-w-md text-[13px] leading-relaxed text-muted">
        {filtered
          ? t("landing.marketplace.emptyFilteredBody")
          : t("landing.marketplace.emptyBody")}
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <Link
          to="/marketplace/browse"
          className="inline-flex h-11 items-center rounded-xl border border-hairline bg-paper px-5 text-[13.5px] font-medium text-ink transition hover:bg-mist"
        >
          {t("landing.marketplace.browseEverything")}
        </Link>
        <Link
          to="/marketplace/post"
          className="inline-flex h-11 items-center rounded-xl bg-brand-red px-5 text-[13.5px] font-semibold text-white transition hover:brightness-95"
        >
          {t("landing.marketplace.postItem")}
        </Link>
      </div>
    </div>
  );
}
