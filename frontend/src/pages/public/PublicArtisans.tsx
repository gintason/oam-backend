import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, MapPin, Search, Wrench } from "lucide-react";
import { SEOHead, breadcrumbSchema, itemListSchema } from "../../seo";
import { publicSeoApi } from "../../services/publicSeo";
import { publicArtisansApi } from "../../services/publicArtisans";
import { Breadcrumbs, PublicLayout, StartLink } from "./PublicLayout";

/** Public artisan directory — verified professionals first. Crawlable, no sign-in needed. */
export default function PublicArtisans() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const category = params.get("category") ?? "";
  const city = params.get("city") ?? "";
  const page = Math.max(1, Number(params.get("page") ?? 1) || 1);
  const [text, setText] = useState(q);

  const trades = useQuery({ queryKey: ["public", "trades"], queryFn: publicArtisansApi.categories, staleTime: 3600_000 });
  const list = useQuery({ queryKey: ["public", "artisans", q, category, city, page], queryFn: () => publicSeoApi.artisans({ q, category, city, page }) });
  const trade = trades.data?.find((c) => c.slug === category)?.name;
  const rows = list.data?.results ?? [];
  const pages = list.data ? Math.ceil(list.data.count / list.data.page_size) : 1;

  const where = city ? ` in ${city}` : " near you";
  const h1 = trade ? `Hire a ${trade.toLowerCase()}${where}` : `Hire verified artisans${where}`;
  const title = trade
    ? `Hire a ${trade} ${city ? `in ${city}` : "in Nigeria"} — Verified Professionals | O.A.M`
    : "Hire Verified Artisans — Plumbers, Electricians, Mechanics | O.A.M";
  const description = trade
    ? `Find verified ${trade.toLowerCase()}s${where} on O.A.M. ID-checked professionals with photos and videos of real work. Send an enquiry in minutes.`
    : "Find and hire verified plumbers, electricians, mechanics, cleaners and other artisans near you. ID-checked professionals with photos and videos of real work.";
  const canonical = "/artisans" + (category || city ? `?${new URLSearchParams({ ...(category ? { category } : {}), ...(city ? { city } : {}) })}` : "");

  function submit(e: FormEvent) {
    e.preventDefault();
    const next = new URLSearchParams(params);
    if (text.trim()) next.set("q", text.trim()); else next.delete("q");
    next.delete("page");
    setParams(next);
  }
  function setTrade(slug: string) {
    const next = new URLSearchParams(params);
    if (slug) next.set("category", slug); else next.delete("category");
    next.delete("page");
    setParams(next);
  }

  return (
    <PublicLayout>
      <SEOHead title={title} description={description} path={canonical}
        keywords={`hire ${trade?.toLowerCase() ?? "artisan"} ${city || "Lagos"}, ${trade?.toLowerCase() ?? "plumber"} near me, hire electrician Lagos, plumber Abuja, mechanic near me, verified artisans Nigeria`}
        robots={q || page > 1 ? "noindex,follow" : "index,follow"}
        jsonLd={[breadcrumbSchema([["Home", "/"], ["Artisans", "/artisans"]]),
          itemListSchema(trade ? `${trade}s on O.A.M` : "Artisans on O.A.M", rows.map((a) => ({ name: a.business_name, path: `/artisans/${a.id}` })))]} />

      <section className="mx-auto max-w-7xl px-4 pb-6 pt-8 sm:px-6">
        <Breadcrumbs items={[["Home", "/"], ["Artisans", "/artisans"]]} />
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-medium text-ink sm:text-4xl">{h1}</h1>
            <p className="mt-2 max-w-2xl text-[15px] text-muted">Plumbers, electricians, mechanics, cleaners and more. Verified artisans have had their ID, work photos and a video checked by the O.A.M team.</p>
          </div>
          <StartLink to="/artisans/me">List your business</StartLink>
        </div>
        <form onSubmit={submit} role="search" className="mt-6 flex gap-2">
          <label htmlFor="art-q" className="sr-only">Search artisans</label>
          <div className="flex h-12 flex-1 items-center gap-2 rounded-xl border border-hairline bg-mist px-3">
            <Search size={18} className="text-muted" aria-hidden="true" />
            <input id="art-q" value={text} onChange={(e) => setText(e.target.value)} placeholder="Plumber, electrician, Lagos…" className="h-full flex-1 bg-transparent text-[15px] outline-none" />
          </div>
          <button className="h-12 rounded-xl bg-ink px-5 text-[15px] font-medium text-white">Search</button>
        </form>
        <nav aria-label="Trades" className="mt-4 flex flex-wrap gap-2">
          <button onClick={() => setTrade("")} className={`rounded-full border px-3.5 py-1.5 text-[13px] ${!category ? "border-ink bg-ink text-white" : "border-hairline text-ink"}`}>All trades</button>
          {(trades.data ?? []).map((c) => (
            <a key={c.slug} href={`/artisans?category=${c.slug}`} onClick={(e) => { e.preventDefault(); setTrade(c.slug); }}
              className={`rounded-full border px-3.5 py-1.5 text-[13px] ${category === c.slug ? "border-ink bg-ink text-white" : "border-hairline text-ink"}`}>{c.name}</a>
          ))}
        </nav>
      </section>

      <section aria-label="Artisans" className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        {list.isLoading ? <p className="text-muted">Loading artisans…</p> : rows.length === 0 ? (
          <p className="rounded-2xl bg-mist p-8 text-center text-muted">No artisans found yet. Try another trade or city.</p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((a) => {
              const loc = [a.city, a.state].filter(Boolean).join(", ");
              return (
                <li key={a.id}>
                  <Link to={`/artisans/${a.id}`} className="flex gap-3 rounded-2xl border border-hairline p-4 hover:border-brand-green/40">
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-mist">
                      {a.profile_photo ? <img src={a.profile_photo} alt={`${a.business_name}, ${a.category_name?.toLowerCase() ?? "artisan"}${loc ? ` in ${loc}` : ""}`} loading="lazy" width={56} height={56} className="h-full w-full object-cover" /> : <Wrench size={20} className="text-muted" />}
                    </span>
                    <div className="min-w-0">
                      <h2 className="flex items-center gap-1 text-[15px] font-medium text-ink"><span className="truncate">{a.business_name}</span>{a.is_verified ? <BadgeCheck size={16} className="shrink-0 text-brand-green" aria-label="Verified" /> : null}</h2>
                      <p className="text-[13px] text-muted">{a.category_name}</p>
                      {loc ? <p className="mt-1 flex items-center gap-1 text-[12px] text-muted"><MapPin size={12} />{loc}</p> : null}
                    </div>
                  </Link>
                </li>
              );
            })}
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
