import { useNavigate } from "react-router-dom";
import { ArrowLeft, ShoppingBag, ExternalLink, Info } from "lucide-react";
import { ECOMMERCE_PARTNERS } from "../../services/ecommerce";

/**
 * E-commerce hub — a directory of our affiliate shopping partners. Each opens
 * that store's screen, from which the user shops on the partner site.
 */
export default function Ecommerce() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-mist">
      <main className="mx-auto max-w-4xl px-5 py-8 sm:px-6">
        <button
          onClick={() => navigate("/dashboard")}
          className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted transition hover:text-ink"
        >
          <ArrowLeft size={15} strokeWidth={1.75} /> Dashboard
        </button>

        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-red/10 text-brand-red">
            <ShoppingBag size={22} strokeWidth={1.75} />
          </span>
          <div>
            <h1 className="font-display text-xl font-semibold text-ink">E-commerce</h1>
            <p className="text-[13px] text-muted">Shop the world's biggest stores through OAM.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {ECOMMERCE_PARTNERS.map((p) => {
            const pending = !p.link;
            return (
              <button
                key={p.slug}
                onClick={() => navigate(`/ecommerce/${p.slug}`)}
                className="group relative flex flex-col items-center gap-3 rounded-2xl border border-hairline bg-paper p-5 text-center transition hover:-translate-y-0.5 hover:border-ink/15 hover:shadow-sm"
              >
                {pending && (
                  <span className="absolute right-2 top-2 rounded-md bg-warn/10 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-warn">
                    Soon
                  </span>
                )}
                <span className="flex h-16 w-full items-center justify-center">
                  <img src={p.logo} alt={p.name} className="max-h-12 max-w-[75%] object-contain" loading="lazy" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[14px] font-semibold text-ink">{p.name}</span>
                  <span className="block truncate text-[11.5px] text-muted">{p.tagline}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-6 flex items-start gap-2 rounded-xl bg-paper border border-hairline p-4">
          <Info size={16} strokeWidth={1.75} className="mt-0.5 shrink-0 text-muted" />
          <p className="text-[12.5px] leading-relaxed text-muted">
            These are independent partner stores. You shop and pay on the partner's own website —
            OAM may earn a small commission at no extra cost to you. Prices, availability and delivery
            are set by each store. <ExternalLink size={11} className="inline align-[-1px]" /> links open in a new tab.
          </p>
        </div>
      </main>
    </div>
  );
}
