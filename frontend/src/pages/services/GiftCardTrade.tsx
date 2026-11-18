import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Gift, ImagePlus, Search } from "lucide-react";
import AppHeader from "../../components/AppHeader";
import { useAuth } from "../../auth/AuthContext";
import { apiErrorMessage } from "../../lib/api";
import { useDebounced } from "../../hooks/useDebounced";
import { tradeApi, type GcProduct, type SellCard, type TradeOrder } from "../../services/trade";
import { ErrorBox, VerifyGate } from "./BuyData";
import { CURRENCY_BY_COUNTRY, TradeHistory, TradeResult } from "./TradeShared";

const input = "h-12 w-full rounded-[11px] border border-hairline bg-paper px-3.5 text-[15px] text-ink outline-none focus:border-brand-green";
const label = "mb-1.5 block text-[12.5px] font-semibold text-ink";
const chip = (on: boolean) => `h-11 rounded-lg border px-3 text-[13px] font-medium transition ${on ? "border-brand-green bg-brand-green/10 text-brand-green" : "border-hairline bg-paper text-ink hover:bg-mist"}`;

/** Gift cards — buy (codes delivered), sell (wallet credited on approval), and history. */
export default function GiftCardTrade() {
  const { isVerified } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"buy" | "sell" | "history">("buy");
  const [result, setResult] = useState<TradeOrder | null>(null);
  const status = useQuery({ queryKey: ["trade-status"], queryFn: tradeApi.status, enabled: isVerified });

  if (!isVerified) return <VerifyGate onBack={() => navigate("/dashboard")} />;
  return (
    <div className="min-h-screen bg-mist">
      <AppHeader />
      <main className="mx-auto max-w-md px-5 py-8 sm:py-10">
        <button onClick={() => navigate("/dashboard")} className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink"><ArrowLeft size={15} /> Back</button>
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-green/10 text-brand-green"><Gift size={22} strokeWidth={1.75} /></span>
          <div><h1 className="font-display text-xl font-semibold text-ink">Gift cards</h1>
            <p className="text-[13px] text-muted">Buy gift cards or sell yours for naira.</p></div>
        </div>
        {status.data && !status.data.giftcards ? (
          <div className="rounded-2xl border border-hairline bg-paper p-6 text-center text-[14px] text-muted">Gift cards are coming soon.</div>
        ) : result ? (
          <TradeResult order={result} onClose={() => { setResult(null); setTab("history"); }} />
        ) : (
          <>
            <div className="mb-4 grid grid-cols-3 gap-2">
              {(["buy", "sell", "history"] as const).map((t) => (
                <button key={t} onClick={() => setTab(t)} className={chip(tab === t)}>{t === "buy" ? "Buy" : t === "sell" ? "Sell" : "My trades"}</button>
              ))}
            </div>
            {tab === "buy" && <BuyTab onDone={setResult} />}
            {tab === "sell" && <SellTab onDone={setResult} />}
            {tab === "history" && <TradeHistory onOpen={setResult} />}
          </>
        )}
      </main>
    </div>
  );
}

function BuyTab({ onDone }: { onDone: (o: TradeOrder) => void }) {
  const [country, setCountry] = useState("US");
  const [q, setQ] = useState("");
  const [product, setProduct] = useState<GcProduct | null>(null);
  const [amount, setAmount] = useState("");
  const [qty, setQty] = useState(1);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const countries = useQuery({ queryKey: ["gc-countries"], queryFn: tradeApi.countries });
  const products = useQuery({ queryKey: ["gc-products", country], queryFn: () => tradeApi.products(country) });
  const list = useMemo(() => (products.data ?? []).filter((p) => p.product_name.toLowerCase().includes(q.toLowerCase())).slice(0, 60), [products.data, q]);
  const amt = Number(amount) || 0;
  const dAmt = useDebounced(amt, 500);
  const dQty = useDebounced(qty, 500);
  const quote = useQuery({ queryKey: ["gc-quote", product?.product_id, dAmt, dQty], queryFn: () => tradeApi.quote(product!.product_id, dAmt, dQty),
                           enabled: Boolean(product && dAmt > 0), staleTime: 90_000, retry: false });
  useEffect(() => { setAmount(""); }, [product]);

  async function pay() {
    if (!product || !amt) return setError("Choose a card and an amount.");
    setBusy(true); setError(undefined);
    try {
      onDone(await tradeApi.buy({ product_id: product.product_id, amount: amt, quantity: qty, title: `${product.product_name} ${product.currency_code} ${amt}${qty > 1 ? ` x${qty}` : ""}` }));
    } catch (err) { setError(apiErrorMessage(err, "Purchase failed. Try again.")); } finally { setBusy(false); }
  }

  return (
    <div className="rounded-2xl border border-hairline bg-paper p-5">
      {error && <ErrorBox message={error} />}
      <label className={label}>Country</label>
      <select value={country} onChange={(e) => { setCountry(e.target.value); setProduct(null); }} className={`${input} mb-4`}>
        {(countries.data ?? [{ country_code: "US", country_name: "United States" } as never]).map((c: { country_code: string; country_name: string }) => (
          <option key={c.country_code} value={c.country_code}>{c.country_name}</option>
        ))}
      </select>
      {!product ? (
        <>
          <div className="relative mb-3"><Search size={15} className="absolute left-3 top-4 text-muted" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search Amazon, Apple, Steam…" className={`${input} pl-9`} /></div>
          {products.isLoading ? <div className="h-24 animate-pulse rounded-xl bg-hairline/60" /> :
            <div className="max-h-80 space-y-2 overflow-y-auto">
              {list.map((p) => (
                <button key={p.product_id} onClick={() => setProduct(p)} className="flex w-full items-center justify-between rounded-[11px] border border-hairline px-3.5 py-3 text-left hover:bg-mist">
                  <span className="truncate text-[13.5px] font-medium text-ink">{p.product_name}</span><span className="ml-3 text-[12px] text-muted">{p.currency_code}</span>
                </button>
              ))}
              {!list.length && <p className="text-[13px] text-muted">No gift cards found.</p>}
            </div>}
        </>
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between rounded-[11px] border border-brand-green bg-brand-green/5 px-3.5 py-3">
            <span className="text-[13.5px] font-medium text-ink">{product.product_name}</span>
            <button onClick={() => setProduct(null)} className="text-[12.5px] text-brand-green">Change</button>
          </div>
          <label className={label}>Card value ({product.currency_code})</label>
          {product.denomination_type === "FIXED" && product.fixed_recipient_denominations?.length ? (
            <div className="mb-4 flex flex-wrap gap-2">
              {product.fixed_recipient_denominations.map((d) => <button key={d} onClick={() => setAmount(String(d))} className={chip(amount === String(d))}>{d}</button>)}
            </div>
          ) : (
            <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
                   placeholder={`${product.min_recipient_denomination ?? ""} – ${product.max_recipient_denomination ?? ""}`} className={`${input} mb-4`} />
          )}
          <label className={label}>How many?</label>
          <input type="number" min={1} max={10} value={qty} onChange={(e) => setQty(Math.max(1, Math.min(10, Number(e.target.value) || 1)))} className={`${input} mb-4`} />
          <div className="mb-4 rounded-xl bg-mist p-3 text-[13.5px]">
            {quote.isFetching ? "Getting price…" : quote.data ? <>You pay <b>₦{Number(quote.data.price).toLocaleString()}</b> from your wallet</> :
              quote.error ? <span className="text-danger">{apiErrorMessage(quote.error, "Couldn't price this card.")}</span> : "Enter a value to see the price."}
          </div>
          <button onClick={pay} disabled={busy || !quote.data} className="flex h-12 w-full items-center justify-center rounded-[11px] bg-brand-red text-[15px] font-semibold text-white disabled:opacity-60">
            {busy ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : quote.data ? `Pay ₦${Number(quote.data.price).toLocaleString()}` : "Buy gift card"}
          </button>
        </>
      )}
    </div>
  );
}

function SellTab({ onDone }: { onDone: (o: TradeOrder) => void }) {
  const catalog = useQuery({ queryKey: ["gc-sell-catalog"], queryFn: tradeApi.sellCatalog });
  const [card, setCard] = useState<SellCard | null>(null);
  const [country, setCountry] = useState("");
  const [type, setType] = useState<"ecode" | "physical">("ecode");
  const [subType, setSubType] = useState("");
  const [amount, setAmount] = useState("");
  const [code, setCode] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const currency = CURRENCY_BY_COUNTRY[country] ?? "USD";

  async function submit() {
    if (!card || !country || !amount) return setError("Choose the card, country and value.");
    if (type === "ecode" && !code.trim()) return setError("Enter the card code.");
    if (type === "physical" && !files.length) return setError("Add at least one clear photo of the card.");
    const f = new FormData();
    Object.entries({ slug: card.slug, card_country: country, card_type: type, sub_type: subType, card_currency: currency,
                     card_amount: amount, additional_info: type === "ecode" ? code.trim() : "", title: `${card.name} ${currency} ${amount}` })
      .forEach(([k, v]) => v && f.append(k, v));
    files.forEach((file) => f.append("images", file));
    setBusy(true); setError(undefined);
    try { onDone(await tradeApi.sell(f)); } catch (err) { setError(apiErrorMessage(err, "Couldn't submit your card.")); } finally { setBusy(false); }
  }

  return (
    <div className="rounded-2xl border border-hairline bg-paper p-5">
      {error && <ErrorBox message={error} />}
      <label className={label}>Gift card</label>
      <select value={card?.slug ?? ""} onChange={(e) => { const c = catalog.data?.find((x) => x.slug === e.target.value) ?? null; setCard(c); setCountry(c?.countries?.[0] ?? ""); setSubType(""); }} className={`${input} mb-4`}>
        <option value="">Choose a card…</option>
        {(catalog.data ?? []).map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
      </select>
      {card && (
        <>
          <label className={label}>Country of the card</label>
          <select value={country} onChange={(e) => setCountry(e.target.value)} className={`${input} mb-4`}>
            {card.countries.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <label className={label}>Type</label>
          <div className="mb-4 grid grid-cols-2 gap-2">
            {(card.card_types?.length ? card.card_types : ["ecode", "physical"]).map((t) => (
              <button key={t} onClick={() => setType(t as "ecode" | "physical")} className={chip(type === t)}>{t === "ecode" ? "E-code" : "Physical card"}</button>
            ))}
          </div>
          {type === "physical" && card.sub_types?.length > 0 && (
            <><label className={label}>Receipt type</label>
              <select value={subType} onChange={(e) => setSubType(e.target.value)} className={`${input} mb-4`}>
                <option value="">Choose…</option>{card.sub_types.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
              </select></>
          )}
          <label className={label}>Card value ({currency})</label>
          <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))} placeholder={`${card.min_amount} – ${card.max_amount}`} className={`${input} mb-4`} />
          {type === "ecode" ? (
            <><label className={label}>Card code</label>
              <textarea value={code} onChange={(e) => setCode(e.target.value)} rows={2} className="mb-4 w-full rounded-[11px] border border-hairline p-3 text-[15px] outline-none focus:border-brand-green" placeholder="Paste the redemption code" /></>
          ) : (
            <label className="mb-4 flex cursor-pointer items-center gap-2 rounded-[11px] border border-dashed border-hairline p-4 text-[13px] text-muted">
              <ImagePlus size={18} /> {files.length ? `${files.length} photo(s) selected` : "Add 1–5 clear photos of the card (and receipt)"}
              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 5))} />
            </label>
          )}
          <p className="mb-4 text-[12px] text-muted">Our partner reviews every card. Once approved, the naira value is added to your O.A.M wallet. Never share a card code with anyone else.</p>
          <button onClick={submit} disabled={busy} className="flex h-12 w-full items-center justify-center rounded-[11px] bg-brand-red text-[15px] font-semibold text-white disabled:opacity-60">
            {busy ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : "Submit card"}
          </button>
        </>
      )}
    </div>
  );
}
