import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, Clock, Lock, MapPin, Send, Wrench } from "lucide-react";
import { SEOHead, artisanSchema, breadcrumbSchema, clip } from "../../seo";
import { publicSeoApi } from "../../services/publicSeo";
import { Breadcrumbs, PublicLayout, StartLink } from "./PublicLayout";

/** Public artisan profile with ProfessionalService JSON-LD. Enquiries need sign-in. */
export default function PublicArtisan() {
  const { id = "" } = useParams();
  const q = useQuery({ queryKey: ["public", "artisan", id], queryFn: () => publicSeoApi.artisan(id), retry: false });
  const path = `/artisans/${id}`;

  if (q.isLoading) return <PublicLayout><p className="mx-auto max-w-5xl px-5 py-16 text-muted">Loading…</p></PublicLayout>;
  if (!q.data) {
    return (
      <PublicLayout>
        <SEOHead title="Profile not available | O.A.M" description="This artisan profile isn't available. Find other verified artisans on O.A.M." path={path} robots="noindex,follow" />
        <section className="mx-auto max-w-xl px-5 py-24 text-center">
          <h1 className="font-display text-3xl font-medium text-ink">This profile isn't available</h1>
          <Link to="/artisans" className="mt-8 inline-block h-11 rounded-lg bg-brand-red px-5 text-sm font-medium leading-[44px] text-white">Find an artisan</Link>
        </section>
      </PublicLayout>
    );
  }

  const a = q.data;
  const trade = a.category_name || "Artisan";
  const loc = [a.city, a.state].filter(Boolean).join(", ");
  const inLoc = loc ? ` in ${loc}` : "";
  const crumbs: [string, string][] = [["Home", "/"], ["Artisans", "/artisans"], [a.business_name, path]];

  return (
    <PublicLayout>
      <SEOHead
        title={`${a.business_name} — ${trade}${inLoc} | Hire on O.A.M`}
        description={clip(`Hire ${a.business_name}, ${a.is_verified ? "a verified " : "a "}${trade.toLowerCase()}${inLoc}. ${a.description || ""} Send an enquiry on O.A.M.`)}
        keywords={`hire ${trade.toLowerCase()} ${a.city || "Nigeria"}, ${trade.toLowerCase()} near me, ${a.business_name}`}
        path={path} image={a.profile_photo} type="profile"
        robots={a.is_verified ? "index,follow" : "noindex,follow"}
        jsonLd={[artisanSchema(a, path), breadcrumbSchema(crumbs)]} />

      <article className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <Breadcrumbs items={crumbs} />
        <header className="mt-5 flex gap-4 rounded-2xl bg-[#0a0a0a] p-5 text-white">
          <span className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/10">
            {a.profile_photo ? <img src={a.profile_photo} alt={`${a.business_name}, ${trade.toLowerCase()}${inLoc}`} width={80} height={80} className="h-full w-full object-cover" /> : <Wrench size={28} className="text-white/50" />}
          </span>
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 font-display text-2xl font-medium">{a.business_name}{a.is_verified ? <BadgeCheck size={20} className="text-brand-green" aria-label="Verified by O.A.M" /> : null}</h1>
            <p className="text-white/70">{trade}{inLoc}</p>
            <p className="mt-2 text-[12px] uppercase tracking-wider text-white/60">{a.is_available ? "Available for work" : "Currently busy"}</p>
          </div>
        </header>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div>
            {a.description ? <><h2 className="text-[16px] font-medium text-ink">About</h2><p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-ink/90">{a.description}</p></> : null}
            <dl className="mt-5 grid grid-cols-2 gap-4 text-[14px]">
              <div className="flex gap-2"><MapPin size={16} className="mt-0.5 text-muted" /><div><dt className="text-muted">Based in</dt><dd className="text-ink">{loc || "—"}</dd></div></div>
              <div className="flex gap-2"><Clock size={16} className="mt-0.5 text-muted" /><div><dt className="text-muted">Experience</dt><dd className="text-ink">{a.years_experience ? `${a.years_experience} years` : "—"}</dd></div></div>
            </dl>
            {(a.work_videos ?? []).length ? (
              <section className="mt-8" aria-labelledby="work">
                <h2 id="work" className="text-[16px] font-medium text-ink">Videos of previous work</h2>
                <div className="mt-3 grid gap-4">
                  {(a.work_videos ?? []).map((v) => (
                    <figure key={v.id}>
                      <video controls playsInline preload="metadata" className="aspect-video w-full rounded-2xl bg-black" aria-label={v.caption || `${a.business_name} — previous work`}><source src={v.url} /></video>
                      {v.caption ? <figcaption className="mt-1 text-[13px] text-muted">{v.caption}</figcaption> : null}
                    </figure>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
          <aside className="h-fit rounded-2xl border border-hairline p-5">
            <h2 className="text-[16px] font-medium text-ink">Hire {a.business_name}</h2>
            <p className="mt-1 flex gap-1.5 text-[13px] leading-relaxed text-muted"><Lock size={14} className="mt-0.5 shrink-0" />Describe the job in the app. Contact details are shared once the artisan accepts.</p>
            <StartLink to={path} className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-red text-[15px] font-medium text-white hover:brightness-95">
              <Send size={17} /> Sign in to send an enquiry
            </StartLink>
          </aside>
        </div>
        <p className="mt-10 text-[14px]"><Link to="/artisans" className="text-brand-green hover:underline">← Find more artisans on O.A.M</Link></p>
      </article>
    </PublicLayout>
  );
}
