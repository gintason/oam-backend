import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { BadgeCheck, Loader2, MapPin, Search, Star, Wrench } from "lucide-react";
import { publicArtisansApi, type FeaturedArtisan } from "../services/publicArtisans";
import { useDebounced } from "../hooks/useDebounced";

/**
 * Featured Artisans — real data, verified only.
 *
 * Every profile here has been checked by a person: identity document, photos of
 * work, and a video, reviewed and approved. That's what the endpoint filters
 * on, and it's the reason this section can carry a "Verified" badge at all.
 */
export default function FeaturedArtisans() {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const debouncedQuery = useDebounced(query, 400);

  const categories = useQuery({
    queryKey: ["public-artisan-categories"],
    queryFn: publicArtisansApi.categories,
    staleTime: 10 * 60_000,
    retry: false,
  });

  const featured = useQuery({
    queryKey: ["featured-artisans", category],
    queryFn: () => publicArtisansApi.featured({ category: category || undefined, limit: 8 }),
    retry: false,
  });

  const all = featured.data?.results ?? [];
  const results = debouncedQuery.trim()
    ? all.filter((a) => {
        const q = debouncedQuery.trim().toLowerCase();
        return (
          a.business_name.toLowerCase().includes(q) ||
          a.category_name.toLowerCase().includes(q) ||
          `${a.city} ${a.state}`.toLowerCase().includes(q)
        );
      })
    : all;

  return (
    <section id="artisans" className="bg-brand-green/[0.04]">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl bg-[#0a0a0a] text-white">
          <div
            className="absolute inset-x-0 top-0 h-[3px]"
            style={{ background: "linear-gradient(90deg,#111 33%,#E31012 33%,#E31012 66%,#0B7327 66%)" }}
          />
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 8% 0%, rgba(11,115,39,0.42), transparent 58%), radial-gradient(circle at 95% 100%, rgba(227,16,18,0.16), transparent 52%)",
            }}
          />
          <div className="relative p-5 sm:p-8">
            <h2 className="font-display text-[26px] font-semibold leading-tight tracking-tight sm:text-[32px]">
              {t("landing.artisans.title")}
            </h2>
            <p className="mt-2 max-w-lg text-[14px] leading-relaxed text-white/70 sm:text-[15px]">
              {t("landing.artisans.subtitle")}
            </p>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search
                  size={16}
                  strokeWidth={1.75}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40"
                />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("landing.artisans.searchPlaceholder")}
                  className="h-12 w-full rounded-xl border border-white/15 bg-white/5 pl-10 pr-3.5 text-[14px] text-white placeholder-white/40 outline-none transition focus:border-brand-green focus:bg-white/10"
                />
              </div>
              <Link
                to="/artisans/find"
                className="inline-flex h-12 shrink-0 items-center justify-center rounded-xl bg-brand-red px-6 text-[14px] font-semibold text-white transition hover:brightness-110"
              >
                {t("landing.artisans.findNearMe")}
              </Link>
            </div>

            {(categories.data?.length ?? 0) > 0 && (
              <div className="scrollbar-hide mt-3 flex gap-1.5 overflow-x-auto">
                <TradeChip active={!category} onClick={() => setCategory("")}>{t("landing.artisans.all")}</TradeChip>
                {categories.data?.slice(0, 8).map((c) => (
                  <TradeChip
                    key={c.id}
                    active={category === c.slug}
                    onClick={() => setCategory(category === c.slug ? "" : c.slug)}
                  >
                    {c.name}
                  </TradeChip>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="mt-6">
          {featured.isLoading ? (
            <div className="flex justify-center py-14">
              <Loader2 size={22} className="animate-spin text-muted" />
            </div>
          ) : results.length === 0 ? (
            <EmptyState hasFilter={Boolean(category || debouncedQuery.trim())} />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {results.map((a) => <ArtisanCard key={a.id} artisan={a} />)}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function TradeChip({ active, onClick, children }: {
  active: boolean; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-[12.5px] font-medium transition ${
        active
          ? "bg-white text-ink"
          : "border border-white/15 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function ArtisanCard({ artisan }: { artisan: FeaturedArtisan }) {
  const { t } = useTranslation();
  const initials = artisan.business_name
    .replace(/^\[demo\]\s*/i, "")
    .split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

  return (
    <Link
      to="/artisans/find"
      className="group flex h-full flex-col rounded-2xl border border-brand-green/[0.18] bg-[linear-gradient(150deg,rgba(11,115,39,0.14),rgba(17,17,17,0.04))] p-4 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_18px_rgba(11,115,39,0.12)]"
    >
      <div className="flex items-start gap-3">
        <span className="relative shrink-0">
          <span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-[#0a0a0a] text-[15px] font-bold text-white">
            {artisan.profile_photo
              ? <img src={artisan.profile_photo} alt="" className="h-full w-full object-cover" />
              : initials || <Wrench size={18} strokeWidth={1.75} />}
          </span>
          {artisan.is_verified && (
            <span
              className="absolute -bottom-1 -right-1 rounded-full bg-white p-px shadow-[0_1px_3px_rgba(10,10,10,0.25)]"
              title={t("landing.artisans.verified", { defaultValue: "Verified" })}
            >
              <BadgeCheck size={15} strokeWidth={2.5} className="text-brand-green" />
            </span>
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-1">
            <h3 className="line-clamp-1 text-[14px] font-semibold text-ink">
              {artisan.business_name.replace(/^\[demo\]\s*/i, "")}
            </h3>
            {artisan.is_verified && (
              <BadgeCheck size={14} strokeWidth={2} className="mt-0.5 shrink-0 text-brand-green" />
            )}
          </div>
          <p className="text-[12.5px] text-muted">{artisan.category_name}</p>
        </div>
      </div>

      <p className="mt-2.5 flex items-center gap-1 text-[12px] text-muted">
        <MapPin size={11} strokeWidth={1.75} />
        <span className="line-clamp-1">
          {[artisan.city, artisan.state].filter(Boolean).join(", ") || "—"}
        </span>
      </p>

      <div className="mt-auto flex flex-wrap gap-1.5 pt-3">
        <span className="inline-flex items-center gap-1 rounded-md bg-brand-green/12 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-green">
          <BadgeCheck size={9} strokeWidth={2.5} /> {t("landing.artisans.verified")}
        </span>
        {artisan.is_featured && (
          <span className="inline-flex items-center gap-1 rounded-md bg-warn/12 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-warn">
            <Star size={9} strokeWidth={2.5} /> {t("landing.artisans.featured")}
          </span>
        )}
      </div>
    </Link>
  );
}

/**
 * Honest empty state.
 *
 * A brand-new directory genuinely has nobody in it, and pretending otherwise
 * with placeholder profiles would be the first thing a visitor discovers is
 * untrue. Inviting them to be early is a better use of the space.
 */
function EmptyState({ hasFilter }: { hasFilter: boolean }) {
  const { t } = useTranslation();
  return (
    <div className="rounded-2xl border border-hairline bg-paper py-12 text-center">
      <Wrench size={28} strokeWidth={1.5} className="mx-auto text-muted" />
      <p className="mt-3 text-[15px] font-medium text-ink">
        {hasFilter ? t("landing.artisans.emptyFilteredTitle") : t("landing.artisans.emptyTitle")}
      </p>
      <p className="mx-auto mt-1.5 max-w-md text-[13px] leading-relaxed text-muted">
        {hasFilter
          ? t("landing.artisans.emptyFilteredBody")
          : t("landing.artisans.emptyBody")}
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <Link
          to="/artisans/find"
          className="inline-flex h-11 items-center rounded-xl border border-hairline bg-paper px-5 text-[13.5px] font-medium text-ink transition hover:bg-mist"
        >
          {t("landing.artisans.browseAll")}
        </Link>
        <Link
          to="/artisans/me"
          className="inline-flex h-11 items-center rounded-xl bg-brand-red px-5 text-[13.5px] font-semibold text-white transition hover:brightness-95"
        >
          {t("landing.artisans.listTrade")}
        </Link>
      </div>
    </div>
  );
}
