import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Search, Star } from "lucide-react";
import { SEOHead, breadcrumbSchema, itemListSchema } from "../../seo";
import { publicSeoApi } from "../../services/publicSeo";
import { money } from "../../lib/format";
import { Breadcrumbs, PublicLayout, StartLink } from "./PublicLayout";

/** Public marketplace: search, categories and live listings — crawlable, no sign-in needed. */
export default function PublicMarketplace() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const category = params.get("category") ?? "";
  const page = Math.max(1, Number(params.get("page") ?? 1) || 1);
  const [text, setText] = useState(q);

  const cats = useQuery({ queryKey: ["public", "mkt-cats"], queryFn: publicSeoApi.categories, staleTime: 3600_000 });
  const list = useQuery({ queryKey: ["public", "listings", q, category, page], queryFn: () => publicSeoApi.listings({ q, category, page }) });
  const catName = cats.data?.find((c) => c.slug === category)?.name;

  const title = q ? `“${q}” for sale in Nigeria | O.A.M Marketplace`
    : catName ? `${catName} for Sale in Nigeria — Buy & Sell | O.A.M Marketplace`
      : "Marketplace — Buy & Sell Phones, Cars, Fashion in Nigeria | O.A.M";
  const description = catName
    ? `Browse ${catName.toLowerCase()} for sale near you on the O.A.M marketplace. Chat with sellers safely in the app — phone numbers are never published.`
    : "Browse items for sale near you on the O.A.M marketplace: phones, cars, electronics, fashion and more. Chat with sellers safely in the app — no numbers published.";
  const canonical = category ? `/marketplace?category=${encodeURIComponent(category)}` : "/marketplace";
  const rows = list.data?.results ?? [];
  const pages = list.data ? Math.ceil(list.data.count / list.data.page_size) : 1;

  function submit(e: FormEvent) {
    e.preventDefault();
    const next = new URLSearchParams(params);
    if (text.trim()) next.set("q", text.trim()); else next.delete("q");
    next.delete("page");
    setParams(next);
  }
  function setCat(slug: string) {
    const next = new URLSearchParams(params);
    if (slug) next.set("category", slug); else next.delete("category");
    next.delete("page");
    setParams(next);
  }

  return (
    <PublicLayout>
      <SEOHead title={title} description={description} path={canonical}
        keywords={`buy and sell Nigeria, ${catName ? catName.toLowerCase() + " for sale, " : ""}OAM marketplace, used phones for sale, cars for sale Nigeria, online marketplace Lagos`}
        robots={q || page > 1 ? "noindex,follow" : "index,follow"}
        jsonLd={[breadcrumbSchema([["Home", "/"], ["Marketplace", "/marketplace"]]),
          itemListSchema(catName ? `${catName} for sale` : "Items for sale on O.A.M", rows.map((r) => ({ name: r.title, path: `/marketplace/${r.id}` })))]} />

      <section className="mx-auto max-w-7xl px-4 pb-6 pt-8 sm:px-6">
        <Breadcrumbs items={[["Home", "/"], ["Marketplace", "/marketplace"]]} />
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-medium text-ink sm:text-4xl">{catName ? `${catName} for sale` : "Buy and sell on the O.A.M marketplace"}</h1>
            <p className="mt-2 max-w-2xl text-[15px] text-muted">Phones, cars, electronics, fashion and more from sellers across Nigeria. Message sellers safely in the app — phone numbers are never published.</p>
          </div>
          <StartLink to="/marketplace/post">Sell an item</StartLink>
        </div>
        <form onSubmit={submit} role="search" className="mt-6 flex gap-2">
          <label htmlFor="mkt-q" className="sr-only">Search the marketplace</label>
          <div className="flex h-12 flex-1 items-center gap-2 rounded-xl border border-hairline bg-mist px-3">
            <Search size={18} className="text-muted" aria-hidden="true" />
            <input id="mkt-q" value={text} onChange={(e) => setText(e.target.value)} placeholder="Search phones, cars, laptops…" className="h-full flex-1 bg-transparent text-[15px] outline-none" />
          </div>
          <button className="h-12 rounded-xl bg-ink px-5 text-[15px] font-medium text-white">Search</button>
        </form>
        <nav aria-label="Categories" className="mt-4 flex flex-wrap gap-2">
          <button onClick={() => setCat("")} className={`rounded-full border px-3.5 py-1.5 text-[13px] ${!category ? "border-ink bg-ink text-white" : "border-hairline text-ink"}`}>All</button>
          {(cats.data ?? []).map((c) => (
            <a key={c.slug} href={`/marketplace?category=${c.slug}`} onClick={(e) => { e.preventDefault(); setCat(c.slug); }}
              className={`rounded-full border px-3.5 py-1.5 text-[13px] ${category === c.slug ? "border-ink bg-ink text-white" : "border-hairline text-ink"}`}>{c.name}</a>
          ))}
        </nav>
      </section>

      <section aria-label="Listings" className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        {list.isLoading ? <p className="text-muted">Loading items…</p> : rows.length === 0 ? (
          <p className="rounded-2xl bg-mist p-8 text-center text-muted">No items found. Try another search or category.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {rows.map((l) => (
              <li key={l.id}>
                <Link to={`/marketplace/${l.id}`} className="group block overflow-hidden rounded-2xl border border-hairline bg-paper hover:border-brand-green/40">
                  <div className="relative aspect-[4/3] bg-mist">
                    {l.primary_image ? <img src={l.primary_image} alt={`${l.title} for sale${l.location ? ` in ${l.location}` : ""}`} loading="lazy" width={400} height={300} className="h-full w-full object-cover" /> : null}
                    {l.is_featured ? <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-md bg-brand-red/90 px-2 py-0.5 text-[11px] text-white"><Star size={10} fill="#fff" /> Featured</span> : null}
                  </div>
                  <div className="p-3">
                    <h2 className="line-clamp-1 text-[14px] font-medium text-ink">{l.title}</h2>
                    <p className="mt-0.5 text-[15px] font-semibold text-brand-red">{money(l.price, l.currency)}</p>
                    {l.location ? <p className="mt-1 flex items-center gap-1 text-[12px] text-muted"><MapPin size={12} />{l.location}</p> : null}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {pages > 1 ? (
          <nav aria-label="Pages" className="mt-8 flex justify-center gap-2">
            {page > 1 ? <Link to={`?${new URLSearchParams({ ...Object.fromEntries(params), page: String(page - 1) })}`} rel="prev" className="rounded-lg border border-hairline px-4 py-2 text-sm">Previous</Link> : null}
            <span className="px-3 py-2 text-sm text-muted">Page {page} of {pages}</span>
            {page < pages ? <Link to={`?${new URLSearchParams({ ...Object.fromEntries(params), page: String(page + 1) })}`} rel="next" className="rounded-lg border border-hairline px-4 py-2 text-sm">Next</Link> : null}
          </nav>
        ) : null}
      </section>
    </PublicLayout>
  );
}
