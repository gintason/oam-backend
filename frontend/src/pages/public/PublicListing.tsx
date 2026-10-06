import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Lock, MapPin, MessageCircle, ShieldCheck, Tag } from "lucide-react";
import { SEOHead, breadcrumbSchema, clip, priceText, productSchema } from "../../seo";
import { publicSeoApi } from "../../services/publicSeo";
import { money } from "../../lib/format";
import { Breadcrumbs, PublicLayout, StartLink } from "./PublicLayout";

const CONDITION: Record<string, string> = { new: "Brand new", used: "Used", refurbished: "Refurbished" };

/** Public listing page: photos, video, price, details and Product JSON-LD. Contact needs sign-in. */
export default function PublicListing() {
  const { id = "" } = useParams();
  const [active, setActive] = useState(0);
  const q = useQuery({ queryKey: ["public", "listing", id], queryFn: () => publicSeoApi.listing(id), retry: false });
  const path = `/marketplace/${id}`;

  if (q.isLoading) return <PublicLayout><p className="mx-auto max-w-6xl px-5 py-16 text-muted">Loading…</p></PublicLayout>;
  if (!q.data) {
    return (
      <PublicLayout>
        <SEOHead title="Item no longer available | O.A.M Marketplace" description="This item has been sold or removed. Browse similar items on the O.A.M marketplace." path={path} robots="noindex,follow" />
        <section className="mx-auto max-w-xl px-5 py-24 text-center">
          <h1 className="font-display text-3xl font-medium text-ink">This item is no longer available</h1>
          <p className="mt-3 text-muted">It may have been sold or removed by the seller.</p>
          <Link to="/marketplace" className="mt-8 inline-block h-11 rounded-lg bg-brand-red px-5 text-sm font-medium leading-[44px] text-white">Browse the marketplace</Link>
        </section>
      </PublicLayout>
    );
  }

  const l = q.data;
  const price = money(l.price, l.currency);
  const shortPrice = priceText(l.price, l.currency);
  const where = l.location ? ` in ${l.location}` : "";
  const images = l.images ?? [];
  const primary = images.find((i) => i.is_primary)?.url ?? images[0]?.url ?? null;
  const crumbs: [string, string][] = [["Home", "/"], ["Marketplace", "/marketplace"], [l.title, path]];

  return (
    <PublicLayout>
      <SEOHead
        title={`${l.title} — ${shortPrice}${where} | O.A.M Marketplace`}
        description={clip(`${l.title} for sale${where} at ${shortPrice}. ${l.description || ""} Chat with the seller safely on O.A.M.`)}
        keywords={`${l.title}, buy ${l.category_name?.toLowerCase() ?? ""} ${l.location || "Nigeria"}, ${l.category_name?.toLowerCase() ?? "items"} for sale, O.A.M marketplace`}
        path={path} image={primary} type="product"
        jsonLd={[productSchema(l, path), breadcrumbSchema(crumbs)]} />

      <article className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Breadcrumbs items={crumbs} />
        <div className="mt-5 grid gap-8 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <div className="overflow-hidden rounded-2xl border border-hairline bg-mist">
              {images.length ? (
                <img src={images[active]?.url} alt={`${l.title} for sale${where} — photo ${active + 1}`} width={800} height={600} className="aspect-[4/3] w-full object-cover" />
              ) : <div className="aspect-[4/3]" />}
            </div>
            {images.length > 1 ? (
              <div className="mt-3 flex gap-2 overflow-x-auto">
                {images.map((img, i) => (
                  <button key={img.id} onClick={() => setActive(i)} aria-label={`Show photo ${i + 1}`}
                    className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 ${i === active ? "border-brand-green" : "border-transparent opacity-70"}`}>
                    <img src={img.url} alt={`${l.title} — photo ${i + 1}`} loading="lazy" width={64} height={64} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            ) : null}
            {(l.videos ?? []).map((v) => (
              <video key={v.id} controls playsInline preload="metadata" className="mt-4 aspect-video w-full rounded-2xl bg-black"
                poster={v.thumbnail_url || undefined} aria-label={`Video of ${l.title}`}>
                <source src={v.url} />
              </video>
            ))}
          </div>

          <div>
            <h1 className="font-display text-2xl font-medium text-ink sm:text-3xl">{l.title}</h1>
            <p className="mt-2 text-3xl font-semibold text-brand-red">{price}{l.negotiable ? <span className="ml-2 text-[14px] font-normal text-muted">Negotiable</span> : null}</p>
            <ul className="mt-4 flex flex-wrap gap-2 text-[13px] text-muted">
              {l.category_name ? <li className="inline-flex items-center gap-1 rounded-md bg-mist px-2 py-1"><Tag size={12} />{l.category_name}</li> : null}
              {CONDITION[l.condition] ? <li className="rounded-md bg-mist px-2 py-1">{CONDITION[l.condition]}</li> : null}
              {l.location ? <li className="inline-flex items-center gap-1 rounded-md bg-mist px-2 py-1"><MapPin size={12} />{l.location}</li> : null}
            </ul>
            {l.description ? <><h2 className="mt-6 text-[15px] font-medium text-ink">Description</h2><p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-ink/90">{l.description}</p></> : null}
            <p className="mt-4 text-[13px] text-muted">Listed by {l.seller_name}</p>

            <div className="mt-6 rounded-2xl border border-hairline p-5">
              <h2 className="text-[16px] font-medium text-ink">Interested? Message the seller</h2>
              <p className="mt-1 flex gap-1.5 text-[13px] leading-relaxed text-muted"><Lock size={14} className="mt-0.5 shrink-0" />Chat in the app. Phone numbers are shared only when the seller accepts.</p>
              <StartLink to={path} className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-red text-[15px] font-medium text-white hover:brightness-95">
                <MessageCircle size={18} /> Sign in to message the seller
              </StartLink>
              <p className="mt-3 flex gap-1.5 text-[12.5px] text-muted"><ShieldCheck size={14} className="mt-0.5 shrink-0 text-brand-green" />Meet in public, inspect before paying, never pay in advance.</p>
            </div>
          </div>
        </div>
        <p className="mt-10 text-[14px]"><Link to="/marketplace" className="text-brand-green hover:underline">← More items for sale on the O.A.M marketplace</Link></p>
      </article>
    </PublicLayout>
  );
}
