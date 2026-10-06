import { Link, useLocation } from "react-router-dom";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { SEOHead, breadcrumbSchema, faqSchema, serviceSchema } from "../../seo";
import { LANDING_BY_PATH, type Landing } from "./landings";
import { Breadcrumbs, PublicLayout, StartLink } from "./PublicLayout";

/** Public, keyword-focused page for one service (/bills, /services/*, /travel/*, /send-package, /jobs). */
export default function ServiceLanding({ landing }: { landing?: Landing }) {
  const { pathname } = useLocation();
  const l = landing ?? LANDING_BY_PATH[pathname.replace(/\/+$/, "")];
  if (!l) return null;
  const crumbs: [string, string][] = l.path.startsWith("/travel/")
    ? [["Home", "/"], ["Travel", "/travel"], [l.h1, l.path]]
    : l.path.startsWith("/services/") ? [["Home", "/"], ["Pay bills", "/bills"], [l.h1, l.path]] : [["Home", "/"], [l.h1, l.path]];

  return (
    <PublicLayout>
      <SEOHead title={l.title} description={l.description} keywords={l.keywords} path={l.path}
        jsonLd={[serviceSchema(l.h1, l.description, l.path, l.serviceType), faqSchema(l.faqs), breadcrumbSchema(crumbs)]} />

      <section className="bg-[#0B3D22]">
        <div className="mx-auto max-w-6xl px-5 py-14 sm:px-6 sm:py-20">
          <div className="[&_*]:!text-white/70"><Breadcrumbs items={crumbs} /></div>
          <h1 className="mt-4 max-w-3xl font-display text-3xl font-medium leading-tight text-white sm:text-5xl">{l.h1}</h1>
          <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-white/75">{l.intro}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <StartLink to={l.appPath}>{l.cta} <ArrowRight size={18} strokeWidth={1.75} /></StartLink>
            <Link to="/sign-up" className="inline-flex h-12 items-center rounded-lg border border-white/35 px-6 text-[15px] font-medium text-white hover:bg-white/5">Create a free account</Link>
          </div>
        </div>
      </section>

      <section aria-labelledby="why" className="mx-auto max-w-6xl px-5 py-14 sm:px-6">
        <h2 id="why" className="font-display text-2xl font-medium text-ink sm:text-3xl">Why use O.A.M</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {l.benefits.map((b) => (
            <div key={b.title} className="rounded-2xl border border-hairline p-5">
              <CheckCircle2 size={20} className="text-brand-green" />
              <h3 className="mt-3 text-[16px] font-medium text-ink">{b.title}</h3>
              <p className="mt-1 text-[14px] leading-relaxed text-muted">{b.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="how" className="bg-mist">
        <div className="mx-auto max-w-6xl px-5 py-14 sm:px-6">
          <h2 id="how" className="font-display text-2xl font-medium text-ink sm:text-3xl">How it works</h2>
          <ol className="mt-6 grid gap-4 sm:grid-cols-3">
            {l.steps.map((s, i) => (
              <li key={s} className="rounded-2xl bg-paper p-5">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-red text-[14px] font-semibold text-white">{i + 1}</span>
                <p className="mt-3 text-[15px] text-ink">{s}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="faq" className="mx-auto max-w-3xl px-5 py-14 sm:px-6">
        <h2 id="faq" className="font-display text-2xl font-medium text-ink sm:text-3xl">Frequently asked questions</h2>
        <div className="mt-6 divide-y divide-hairline rounded-2xl border border-hairline">
          {l.faqs.map((f) => (
            <details key={f.q} className="group p-5" open>
              <summary className="cursor-pointer list-none text-[16px] font-medium text-ink">{f.q}</summary>
              <p className="mt-2 text-[15px] leading-relaxed text-muted">{f.a}</p>
            </details>
          ))}
        </div>
        <nav aria-label="Related services" className="mt-10">
          <h2 className="text-[13px] font-medium uppercase tracking-wider text-muted">Related</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {l.related.map((r) => (
              <li key={r.to}><Link to={r.to} className="inline-block rounded-full border border-hairline px-4 py-2 text-[14px] text-ink hover:border-brand-green/50">{r.label}</Link></li>
            ))}
          </ul>
        </nav>
      </section>
    </PublicLayout>
  );
}
