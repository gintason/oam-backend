import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ExternalLink, ShoppingCart, ShieldCheck, Clock } from "lucide-react";
import { partnerBySlug, partnerMonogram } from "../../services/ecommerce";

export default function EcommerceCompany() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const p = partnerBySlug(slug);

  if (!p) {
    return (
      <div className="min-h-screen bg-mist">
        <main className="mx-auto max-w-3xl px-5 py-10 text-center">
          <p className="rounded-xl border border-hairline bg-paper p-6 text-[14px] text-muted">Store not found.</p>
        </main>
      </div>
    );
  }

  const pending = !p.link;
  const open = () => { if (p.link) window.open(p.link, "_blank", "noopener,noreferrer"); };

  return (
    <div className="min-h-screen bg-mist">
      <main className="mx-auto max-w-3xl px-5 py-8 sm:px-6">
        <button
          onClick={() => navigate("/ecommerce")}
          className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted transition hover:text-ink"
        >
          <ArrowLeft size={15} strokeWidth={1.75} /> All stores
        </button>

        {/* Hero */}
        <div className="overflow-hidden rounded-2xl border border-hairline bg-paper">
          <div className="h-1.5" style={{ backgroundColor: p.accent }} />
          <div className="p-6">
            <div className="flex items-center gap-4">
              <span className="flex h-20 w-28 items-center justify-center rounded-xl border border-hairline bg-white p-3">
                {p.logo ? (
                  <img src={p.logo} alt={p.name} className="max-h-full max-w-full object-contain" />
                ) : (
                  <span
                    className="flex h-14 w-14 items-center justify-center rounded-xl text-[18px] font-bold text-white"
                    style={{ backgroundColor: p.accent }}
                  >
                    {partnerMonogram(p.name)}
                  </span>
                )}
              </span>
              <div>
                <h1 className="font-display text-2xl font-semibold text-ink">{p.name}</h1>
                <p className="text-[13.5px] text-muted">{p.tagline}</p>
              </div>
            </div>
            <p className="mt-4 text-[14px] leading-relaxed text-ink">{p.blurb}</p>

            {pending ? (
              <div className="mt-5 flex items-center gap-2 rounded-xl border border-warn/30 bg-warn/5 px-4 py-3 text-[13px] text-ink">
                <Clock size={16} strokeWidth={1.75} className="text-warn" />
                Our {p.name} partnership is being finalised — shopping opens here shortly.
              </div>
            ) : (
              <button
                onClick={open}
                className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-red text-[14px] font-semibold text-white transition hover:brightness-95 sm:w-auto sm:px-8"
              >
                <ShoppingCart size={17} strokeWidth={1.75} /> Shop on {p.name}
                <ExternalLink size={14} className="opacity-70" />
              </button>
            )}
          </div>
        </div>

        {/* Categories */}
        <h2 className="mb-3 mt-8 font-display text-[16px] font-semibold text-ink">Popular categories</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {p.categories.map((c) => (
            <button
              key={c}
              onClick={open}
              disabled={pending}
              className="flex items-center justify-between rounded-xl border border-hairline bg-paper px-4 py-3.5 text-left text-[13.5px] font-medium text-ink transition hover:border-ink/15 hover:shadow-sm disabled:opacity-50"
            >
              {c}
              <ExternalLink size={14} className="text-muted" />
            </button>
          ))}
        </div>

        <div className="mt-6 flex items-start gap-2 rounded-xl border border-hairline bg-paper p-4">
          <ShieldCheck size={16} strokeWidth={1.75} className="mt-0.5 shrink-0 text-brand-green" />
          <p className="text-[12.5px] leading-relaxed text-muted">
            You'll complete your purchase securely on {p.name}'s own website. OAM may earn a commission
            at no extra cost to you. Check the store's delivery and returns terms before you buy.
          </p>
        </div>
      </main>
    </div>
  );
}
