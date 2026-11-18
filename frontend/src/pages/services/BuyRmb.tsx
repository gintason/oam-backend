import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ImagePlus, JapaneseYen } from "lucide-react";
import AppHeader from "../../components/AppHeader";
import { useAuth } from "../../auth/AuthContext";
import { apiErrorMessage } from "../../lib/api";
import { useDebounced } from "../../hooks/useDebounced";
import { tradeApi, type TradeOrder } from "../../services/trade";
import { ErrorBox, VerifyGate } from "./BuyData";
import { TradeHistory, TradeResult } from "./TradeShared";

const input = "h-12 w-full rounded-[11px] border border-hairline bg-paper px-3.5 text-[15px] text-ink outline-none focus:border-brand-green";
const label = "mb-1.5 block text-[12.5px] font-semibold text-ink";
const chip = (on: boolean) => `h-11 rounded-lg border px-3 text-[13px] font-medium transition disabled:opacity-40 ${on ? "border-brand-green bg-brand-green/10 text-brand-green" : "border-hairline bg-paper text-ink hover:bg-mist"}`;

/** Buy RMB — pay a supplier in China via Alipay, WeChat Pay or a Chinese bank account. */
export default function BuyRmb() {
  const { isVerified } = useAuth();
  const navigate = useNavigate();
  const status = useQuery({ queryKey: ["trade-status"], queryFn: tradeApi.status, enabled: isVerified });
  const on = Boolean(status.data?.rmb);
  const rates = useQuery({ queryKey: ["rmb-rates"], queryFn: tradeApi.rmbRates, enabled: isVerified && on, refetchInterval: 120_000 });
  const [channel, setChannel] = useState<"alipay" | "wechat" | "bank">("alipay");
  const [acct, setAcct] = useState("nigerian");
  const [rmb, setRmb] = useState("");
  const [name, setName] = useState("");
  const [ident, setIdent] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAcct, setBankAcct] = useState("");
  const [note, setNote] = useState("");
  const [qr, setQr] = useState<File | null>(null);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<TradeOrder | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const amount = useDebounced(Number(rmb) || 0, 500);
  const quote = useQuery({ queryKey: ["rmb-quote", channel, acct, amount], queryFn: () => tradeApi.rmbQuote(channel, channel === "bank" ? undefined : acct, amount),
                           enabled: on && amount > 0, retry: false });
  const ch = rates.data?.channels.find((c) => c.channel === channel);

  async function submit() {
    setError(undefined);
    if (!Number(rmb)) return setError("Enter the amount in ¥.");
    if (!name.trim()) return setError("Enter the recipient's full name.");
    if (channel !== "bank" && !qr) return setError("Upload the recipient's receive QR code.");
    if (channel === "bank" && (!bankName.trim() || !bankAcct.trim())) return setError("Enter the bank name and account number.");
    const f = new FormData();
    const fields: Record<string, string> = { channel, rmb_amount: rmb, recipient_name: name.trim(), recipient_identifier: channel === "bank" ? bankAcct.trim() : ident.trim(),
      recipient_bank_name: channel === "bank" ? bankName.trim() : "", recipient_bank_account_number: channel === "bank" ? bankAcct.trim() : "", description: note.trim() };
    if (channel === "alipay") fields.alipay_account_type = acct;
    if (channel === "wechat") fields.wechat_account_type = acct;
    Object.entries(fields).forEach(([k, v]) => v && f.append(k, v));
    if (qr && channel !== "bank") f.append("qr_code", qr);
    setBusy(true);
    try { setResult(await tradeApi.rmbBuy(f)); } catch (err) { setError(apiErrorMessage(err, "Couldn't place the order.")); } finally { setBusy(false); }
  }

  if (!isVerified) return <VerifyGate onBack={() => navigate("/dashboard")} />;
  return (
    <div className="min-h-screen bg-mist">
      <AppHeader />
      <main className="mx-auto max-w-md px-5 py-8 sm:py-10">
        <button onClick={() => navigate("/dashboard")} className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink"><ArrowLeft size={15} /> Back</button>
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-green/10 text-brand-green"><JapaneseYen size={22} strokeWidth={1.75} /></span>
          <div><h1 className="font-display text-xl font-semibold text-ink">Pay suppliers in China</h1>
            <p className="text-[13px] text-muted">Send RMB to Alipay, WeChat Pay or a Chinese bank account.</p></div>
        </div>
        {status.data && !on ? (
          <div className="rounded-2xl border border-hairline bg-paper p-6 text-center text-[14px] text-muted">This service is coming soon.</div>
        ) : result ? (
          <TradeResult order={result} onClose={() => { setResult(null); setShowHistory(true); }} />
        ) : showHistory ? (
          <><TradeHistory kind="rmb_buy" onOpen={setResult} />
            <button onClick={() => setShowHistory(false)} className="mt-4 text-[13px] font-medium text-brand-green">New payment</button></>
        ) : (
          <div className="rounded-2xl border border-hairline bg-paper p-5">
            {error && <ErrorBox message={error} />}
            <label className={label}>Pay with</label>
            <div className="mb-4 grid grid-cols-3 gap-2">
              {(["alipay", "wechat", "bank"] as const).map((c) => {
                const avail = rates.data?.channels.find((x) => x.channel === c)?.is_available ?? true;
                return <button key={c} disabled={!avail} onClick={() => setChannel(c)} className={chip(channel === c)}>{c === "alipay" ? "Alipay" : c === "wechat" ? "WeChat" : "Bank"}</button>;
              })}
            </div>
            {channel !== "bank" && (
              <><label className={label}>Recipient's account is</label>
                <div className="mb-4 grid grid-cols-2 gap-2">
                  {(ch?.account_types?.length ? ch.account_types : [{ type: "nigerian", name: "Nigerian", is_available: true }, { type: "chinese", name: "Chinese", is_available: true }]).map((t) => (
                    <button key={t.type} disabled={!t.is_available} onClick={() => setAcct(t.type)} className={chip(acct === t.type)}>{t.name}</button>
                  ))}
                </div></>
            )}
            <label className={label}>Amount (¥)</label>
            <input inputMode="decimal" value={rmb} onChange={(e) => setRmb(e.target.value.replace(/[^\d.]/g, ""))}
                   placeholder={rates.data ? `${rates.data.limits.min_rmb} – ${rates.data.limits.max_rmb}` : "e.g. 500"} className={`${input} mb-2`} />
            <p className="mb-4 text-[13px] text-muted">{quote.isFetching ? "Getting rate…" : quote.data ? <>You pay <b className="text-ink">₦{Number(quote.data.price).toLocaleString()}</b></> :
              quote.error ? <span className="text-danger">{apiErrorMessage(quote.error, "Couldn't get a rate.")}</span> : " "}</p>
            <label className={label}>Recipient's full name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Zhang Wei" className={`${input} mb-4`} />
            {channel === "bank" ? (
              <><label className={label}>Bank name</label><input value={bankName} onChange={(e) => setBankName(e.target.value)} className={`${input} mb-4`} placeholder="e.g. ICBC" />
                <label className={label}>Account number</label><input value={bankAcct} onChange={(e) => setBankAcct(e.target.value)} className={`${input} mb-4`} /></>
            ) : (
              <><label className={label}>{channel === "alipay" ? "Alipay ID / email / phone" : "WeChat ID"} (optional)</label>
                <input value={ident} onChange={(e) => setIdent(e.target.value)} className={`${input} mb-4`} />
                <label className="mb-4 flex cursor-pointer items-center gap-2 rounded-[11px] border border-dashed border-hairline p-4 text-[13px] text-muted">
                  <ImagePlus size={18} /> {qr ? qr.name : "Upload the recipient's receive QR code (JPG/PNG, max 2 MB)"}
                  <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={(e) => setQr(e.target.files?.[0] ?? null)} />
                </label></>
            )}
            <label className={label}>Note (optional)</label>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Invoice #2045" className={`${input} mb-4`} />
            <button onClick={submit} disabled={busy || !quote.data} className="flex h-12 w-full items-center justify-center rounded-[11px] bg-brand-red text-[15px] font-semibold text-white disabled:opacity-60">
              {busy ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : quote.data ? `Pay ₦${Number(quote.data.price).toLocaleString()}` : "Pay"}
            </button>
            <p className="mt-3 text-center text-[12px] text-muted">Paid from your O.A.M wallet. If the payment can't be completed, your money is refunded automatically.</p>
            <button onClick={() => setShowHistory(true)} className="mt-3 w-full text-center text-[13px] font-medium text-brand-green">My RMB payments</button>
          </div>
        )}
      </main>
    </div>
  );
}
