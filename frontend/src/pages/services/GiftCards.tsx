import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Clapperboard, CreditCard, ExternalLink, Gamepad2, Gift, Globe2, Music, Search, ShieldCheck, ShoppingBag, Smartphone, TriangleAlert, Zap } from "lucide-react";
import AppHeader from "../../components/AppHeader";
import { G2A_LINK } from "../../services/affiliates";

const CATEGORIES = [
  { icon: <Gamepad2 size={19} strokeWidth={1.75} />, title: "Gaming", text: "Steam, PlayStation, Xbox, Nintendo credit and game keys." },
  { icon: <Clapperboard size={19} strokeWidth={1.75} />, title: "Streaming", text: "Subscription credit for major film and TV services." },
  { icon: <Music size={19} strokeWidth={1.75} />, title: "Music", text: "Top up streaming accounts without a local card." },
  { icon: <ShoppingBag size={19} strokeWidth={1.75} />, title: "Retail", text: "Store credit for global online marketplaces." },
  { icon: <Smartphone size={19} strokeWidth={1.75} />, title: "App stores", text: "Credit for mobile app and in-app purchases." },
  { icon: <CreditCard size={19} strokeWidth={1.75} />, title: "Prepaid", text: "Prepaid codes usable across many online services." },
];

const REGIONS = [
  { region: "United States", note: "The widest catalogue. US-region codes usually need a US account." },
  { region: "United Kingdom", note: "GBP-denominated codes for UK accounts and stores." },
  { region: "Europe", note: "EUR codes, often region-locked to specific countries." },
  { region: "Global", note: "Codes that work regardless of account region — the safest choice if unsure." },
];

/**
 * Gift cards — international marketplace via our G2A partnership.
 * Digital codes are genuinely fraud-prone, so this page leads with how to buy
 * safely (region locking, refund rules, scam warnings) rather than just a link.
 */
export default function GiftCards() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"buy" | "sell">("buy");

  function open() {
    window.open(G2A_LINK, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="min-h-screen bg-mist">
      <AppHeader />
      <main className="mx-auto max-w-4xl px-5 py-8 sm:px-6 sm:py-10">
        <button onClick={() => navigate("/dashboard")} className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted transition hover:text-ink">
          <ArrowLeft size={15} /> Dashboard
        </button>

        {/* Hero */}
        <section className="relative overflow-hidden rounded-2xl bg-[#0a0a0a] p-7 text-white sm:p-9">
          <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: "linear-gradient(90deg,#111 33%,#E31012 33%,#E31012 66%,#0B7327 66%)" }} aria-hidden="true" />
          <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(circle at 85% 15%, rgba(227,16,18,0.22), transparent 55%), radial-gradient(circle at 10% 90%, rgba(11,115,39,0.32), transparent 50%)" }} aria-hidden="true" />
          <div className="relative max-w-xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.08] px-3 py-1 text-[11.5px] font-medium text-white/80">
              <Globe2 size={13} strokeWidth={2} /> Global digital marketplace
            </span>
            <h1 className="mt-4 font-display text-[28px] font-semibold leading-tight sm:text-[34px]">
              Gift cards & digital codes
            </h1>
            <p className="mt-2.5 text-[14.5px] leading-relaxed text-white/70">
              Buy gaming credit, streaming subscriptions, app store top-ups and retail
              gift cards from sellers worldwide — delivered as a code, usually within minutes.
            </p>
            <button
              onClick={open}
              className="mt-6 inline-flex h-12 items-center gap-2 rounded-[11px] bg-brand-red px-6 text-[15px] font-semibold text-white shadow-[0_8px_24px_rgba(227,16,18,0.3)] transition hover:brightness-95 active:scale-[0.99]"
            >
              <Search size={17} strokeWidth={2} /> Browse gift cards
              <ExternalLink size={14} strokeWidth={2} className="opacity-70" />
            </button>
            <p className="mt-3 text-[12px] text-white/45">
              Opens with G2A, our marketplace partner. Purchase and delivery happen there.
            </p>
          </div>
        </section>

        {/* Buy / Sell */}
        <div className="mt-6 flex gap-2 rounded-xl border border-hairline bg-paper p-1.5">
          <button
            onClick={() => setTab("buy")}
            className={`h-10 flex-1 rounded-lg text-[13.5px] font-medium transition ${tab === "buy" ? "bg-brand-green/10 text-brand-green" : "text-muted hover:text-ink"}`}
          >
            Buying
          </button>
          <button
            onClick={() => setTab("sell")}
            className={`h-10 flex-1 rounded-lg text-[13.5px] font-medium transition ${tab === "sell" ? "bg-brand-green/10 text-brand-green" : "text-muted hover:text-ink"}`}
          >
            Selling
          </button>
        </div>

        {tab === "buy" ? (
          <>
            <section className="mt-6">
              <h2 className="mb-3 text-[15px] font-semibold text-ink">What you can buy</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.title}
                    onClick={open}
                    className="group rounded-xl border border-hairline bg-paper p-4 text-left transition hover:-translate-y-0.5 hover:border-ink/15 hover:shadow-sm"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-green/10 text-brand-green">{c.icon}</span>
                    <h3 className="mt-2.5 text-[13.5px] font-semibold text-ink">{c.title}</h3>
                    <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted">{c.text}</p>
                  </button>
                ))}
              </div>
            </section>

            <section className="mt-8 rounded-2xl border border-hairline bg-paper p-5">
              <h2 className="flex items-center gap-2 text-[15px] font-semibold text-ink">
                <Globe2 size={16} strokeWidth={1.75} className="text-brand-green" /> Understanding regions
              </h2>
              <p className="mt-2 text-[13px] leading-relaxed text-muted">
                This is the single most common reason a code fails to redeem. Most gift cards are
                tied to a country — a US code generally won't work on a UK account.
              </p>
              <ul className="mt-3 space-y-2.5">
                {REGIONS.map((r) => (
                  <li key={r.region} className="flex gap-2.5 text-[13px]">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-green" />
                    <span><span className="font-medium text-ink">{r.region}</span> — <span className="text-muted">{r.note}</span></span>
                  </li>
                ))}
              </ul>
            </section>
          </>
        ) : (
          <section className="mt-6 rounded-2xl border border-hairline bg-paper p-5">
            <h2 className="text-[15px] font-semibold text-ink">Selling digital codes</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-muted">
              The same marketplace lets verified sellers list codes to a global audience. If you
              trade gift cards, a few things are worth knowing before you start:
            </p>
            <ul className="mt-3 space-y-2.5 text-[13px] leading-relaxed text-muted">
              <li><span className="font-medium text-ink">Verification comes first.</span> Marketplaces require identity checks before payouts — expect this to take time.</li>
              <li><span className="font-medium text-ink">Keep every receipt.</span> Proof of legitimate purchase is what protects you in a dispute.</li>
              <li><span className="font-medium text-ink">Understand the fees.</span> Listing fees, commission and withdrawal charges all affect your real margin.</li>
              <li><span className="font-medium text-ink">Price against live rates.</span> Card values move; stale pricing is how sellers lose money.</li>
              <li><span className="font-medium text-ink">Never sell a card you didn't buy yourself.</span> Handling cards obtained by others is how people end up implicated in fraud.</li>
            </ul>
            <button
              onClick={open}
              className="mt-5 inline-flex h-11 items-center gap-2 rounded-[11px] bg-brand-green px-5 text-[14px] font-semibold text-white transition hover:brightness-95"
            >
              Visit the marketplace <ExternalLink size={14} strokeWidth={2} className="opacity-80" />
            </button>
          </section>
        )}

        {/* Safety — deliberately prominent */}
        <section className="mt-8 rounded-2xl border border-warn/30 bg-warn/[0.04] p-5">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold text-ink">
            <TriangleAlert size={16} strokeWidth={2} className="text-warn" /> Stay safe with gift cards
          </h2>
          <ul className="mt-3 space-y-2.5 text-[13px] leading-relaxed text-muted">
            <li><span className="font-medium text-ink">No legitimate organisation asks to be paid in gift cards.</span> Not tax authorities, not the police, not a bank, not an employer. Any such request is a scam.</li>
            <li><span className="font-medium text-ink">Never share a code before you're paid.</span> Once the digits are seen, the value can be redeemed instantly and is gone.</li>
            <li><span className="font-medium text-ink">Redeem promptly</span> and keep the purchase receipt until you have.</li>
            <li><span className="font-medium text-ink">Check the region before paying</span> — region-locked codes are rarely refundable once revealed.</li>
            <li><span className="font-medium text-ink">Buy from sellers with a long, high-volume rating history</span> rather than the cheapest listing.</li>
          </ul>
        </section>

        <section className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            { icon: <Zap size={18} strokeWidth={1.75} />, title: "Instant delivery", text: "Most codes arrive within minutes of payment." },
            { icon: <Globe2 size={18} strokeWidth={1.75} />, title: "Worldwide sellers", text: "A global marketplace, often below retail price." },
            { icon: <ShieldCheck size={18} strokeWidth={1.75} />, title: "Buyer protection", text: "Marketplace protection applies — read its terms." },
          ].map((v) => (
            <div key={v.title} className="rounded-xl border border-hairline bg-paper p-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-green/10 text-brand-green">{v.icon}</span>
              <h3 className="mt-2.5 text-[13.5px] font-semibold text-ink">{v.title}</h3>
              <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted">{v.text}</p>
            </div>
          ))}
        </section>

        <div className="mt-8 rounded-2xl border border-hairline bg-paper p-6 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-red/10 text-brand-red">
            <Gift size={22} strokeWidth={1.75} />
          </span>
          <h2 className="mt-3 font-display text-[19px] font-semibold text-ink">Browse thousands of digital codes</h2>
          <p className="mx-auto mt-1.5 max-w-md text-[13.5px] leading-relaxed text-muted">
            Gaming, streaming, retail and prepaid credit from sellers around the world.
          </p>
          <button
            onClick={open}
            className="mt-5 inline-flex h-12 items-center gap-2 rounded-[11px] bg-brand-green px-7 text-[15px] font-semibold text-white transition hover:brightness-95 active:scale-[0.99]"
          >
            Open marketplace <ExternalLink size={15} strokeWidth={2} className="opacity-80" />
          </button>
        </div>
      </main>
    </div>
  );
}
