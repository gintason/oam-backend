import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import { walletApi } from "../../services/wallet";
import { naira } from "../../lib/format";
import { apiErrorMessage } from "../../lib/api";
import { useDebounced } from "../../hooks/useDebounced";
import { reloadlyApi, intlAirStore, type Operator, type AirtimeTopup } from "../../services/reloadly";

/** International airtime (Reloadly). Rendered inside BuyAirtime's "International" tab. */
export default function InternationalAirtime() {
  const qc = useQueryClient();
  const { isVerified } = useAuth();

  const [country, setCountry] = useState("");
  const [phone, setPhone] = useState("");
  const [operator, setOperator] = useState<Operator | null>(null);
  const [amount, setAmount] = useState("");
  const [payWith, setPayWith] = useState<"wallet" | "card">("wallet");
  const [topup, setTopup] = useState<AirtimeTopup | null>(null);
  const [error, setError] = useState<string>();
  const [resuming, setResuming] = useState(false);

  const countries = useQuery({ queryKey: ["intl", "countries"], queryFn: reloadlyApi.countries, enabled: isVerified, staleTime: 60 * 60 * 1000 });
  const walletsQ = useQuery({ queryKey: ["wallets"], queryFn: walletApi.getWallets, enabled: isVerified });
  const balance = Number(walletsQ.data?.wallets.find((w) => w.currency === "NGN")?.balance ?? 0);
  const history = useQuery({ queryKey: ["intl", "history"], queryFn: reloadlyApi.topups, enabled: isVerified });

  const debouncedPhone = useDebounced(phone, 600);
  const operators = useQuery({
    queryKey: ["intl", "operators", country, debouncedPhone],
    queryFn: () => reloadlyApi.operators(country, debouncedPhone.length >= 6 ? debouncedPhone : undefined),
    enabled: isVerified && !!country,
  });

  useEffect(() => {
    const ops = operators.data ?? [];
    if (ops.length === 1) setOperator(ops[0]);
  }, [operators.data]);

  // Resume a card payment on return from Paystack.
  useEffect(() => {
    const pending = intlAirStore.take();
    if (!pending) return;
    setResuming(true);
    (async () => {
      try {
        let t = await reloadlyApi.cardVerify(pending.ref).catch(() => reloadlyApi.topup(pending.topupRef));
        for (let i = 0; i < 6 && t.status !== "success" && t.status !== "failed"; i++) {
          await new Promise((r) => setTimeout(r, 2000));
          t = await reloadlyApi.topup(pending.topupRef);
        }
        qc.invalidateQueries({ queryKey: ["wallets"] });
        setTopup(t);
      } catch {
        setError("Couldn't confirm your top-up. Check your history.");
      } finally {
        setResuming(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const useLocal = operator?.denomination_type === "RANGE" || (operator?.local_fixed_amounts?.length ?? 0) > 0;
  const amounts = useMemo(() => (!operator ? [] : useLocal ? operator.local_fixed_amounts : operator.fixed_amounts), [operator, useLocal]);

  const quote = useQuery({
    queryKey: ["intl", "quote", operator?.operator_id, amount, useLocal],
    queryFn: () => reloadlyApi.quote({ operator_id: operator!.operator_id, amount: Number(amount), use_local_amount: useLocal }),
    enabled: !!operator && Number(amount) > 0,
  });

  const buy = useMutation({
    mutationFn: () =>
      reloadlyApi.buy({
        operator_id: operator!.operator_id, amount: Number(amount), use_local_amount: useLocal,
        recipient_number: phone.trim(), recipient_iso2: country, pay_with: payWith,
      }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["wallets"] });
      if (payWith === "card" && data.authorization_url && data.reference) {
        intlAirStore.set({ ref: data.reference, topupRef: data.topup.reference });
        window.location.href = data.authorization_url;
        return;
      }
      setTopup(data.topup);
    },
    onError: (err) => {
      const st = (err as { response?: { status?: number } })?.response?.status;
      setError(st === 402 ? "Your wallet balance is too low. Add money or pay by card." : apiErrorMessage(err, "Top-up failed."));
    },
  });

  function submit() {
    setError(undefined);
    if (!country) return setError("Choose the recipient's country.");
    if (phone.trim().length < 6) return setError("Enter the recipient's phone number.");
    if (!operator) return setError("Choose a network operator.");
    if (Number(amount) <= 0) return setError("Choose an amount.");
    buy.mutate();
  }

  const inputCls = "h-11 w-full rounded-[11px] border border-hairline bg-paper px-3.5 text-[14px] text-ink outline-none transition focus:border-brand-green focus:ring-[3px] focus:ring-brand-green/10";
  const symbol = useLocal ? "" : "$";
  const priceNgn = quote.data ? naira(Number(quote.data.total_ngn)) : "";

  if (resuming) {
    return <div className="py-16 text-center"><Loader2 size={30} className="mx-auto animate-spin text-brand-green" /><p className="mt-3 text-[14px] text-muted">Confirming your top-up…</p></div>;
  }

  if (topup) {
    const ok = topup.status === "success";
    return (
      <div className="rounded-2xl border border-hairline bg-paper p-6 text-center">
        {ok ? <CheckCircle2 size={44} className="mx-auto text-brand-green" /> : <XCircle size={44} className="mx-auto text-danger" />}
        <h2 className="mt-2 font-display text-lg font-semibold text-ink">{ok ? "Airtime sent!" : "Top-up failed"}</h2>
        <p className="mt-1 text-[14px] text-muted">{ok ? `${topup.operator_name} · ${topup.recipient_number}` : (topup.failure_reason || "If you were charged, it has been refunded.")}</p>
        <button onClick={() => { setTopup(null); setAmount(""); }} className="mt-5 h-11 w-full rounded-[11px] bg-brand-green text-[14px] font-semibold text-white">Done</button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-hairline bg-paper p-5">
      {error && <div className="mb-4 rounded-lg border border-danger/30 bg-danger/5 px-3.5 py-2.5 text-[13px] text-danger">{error}</div>}

      <label className="mb-1.5 block text-[12.5px] font-semibold text-ink">Recipient's country</label>
      <select value={country} onChange={(e) => { setCountry(e.target.value); setOperator(null); }} className={`${inputCls} mb-4`}>
        <option value="">Select country…</option>
        {(countries.data ?? []).map((c) => <option key={c.isoName} value={c.isoName}>{c.name}</option>)}
      </select>

      <label className="mb-1.5 block text-[12.5px] font-semibold text-ink">Recipient phone (local format)</label>
      <input value={phone} onChange={(e) => { setPhone(e.target.value.replace(/[^\d+]/g, "")); setOperator(null); }} placeholder="e.g. 233501234567" className={`${inputCls} mb-4`} />

      {country && (operators.isLoading ? (
        <Loader2 size={20} className="mb-4 animate-spin text-brand-green" />
      ) : (
        <>
          <label className="mb-1.5 block text-[12.5px] font-semibold text-ink">Network</label>
          <div className="mb-4 flex flex-wrap gap-2">
            {(operators.data ?? []).map((op) => (
              <button key={op.operator_id} onClick={() => { setOperator(op); setAmount(""); }} className={`h-10 rounded-[10px] border px-3.5 text-[13px] font-medium transition ${operator?.operator_id === op.operator_id ? "border-brand-green bg-brand-green/10 text-brand-green" : "border-hairline bg-paper text-ink hover:bg-mist"}`}>{op.name}</button>
            ))}
            {(operators.data ?? []).length === 0 && <p className="text-[13px] text-muted">No networks found — check the country and number.</p>}
          </div>
        </>
      ))}

      {operator && (
        <>
          <label className="mb-1.5 block text-[12.5px] font-semibold text-ink">Amount {useLocal ? `(${operator.destination_currency})` : "(USD)"}</label>
          {amounts.length > 0 ? (
            <div className="mb-4 flex flex-wrap gap-2">
              {amounts.slice(0, 12).map((a) => (
                <button key={a} onClick={() => setAmount(String(a))} className={`h-10 rounded-[10px] border px-3.5 text-[13px] font-medium transition ${Number(amount) === a ? "border-brand-green bg-brand-green text-white" : "border-hairline bg-paper text-ink hover:bg-mist"}`}>{symbol}{a}</button>
              ))}
            </div>
          ) : (
            <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))} placeholder={`${symbol}0`} className={`${inputCls} mb-4`} />
          )}

          {Number(amount) > 0 && (
            <div className="mb-4 flex items-center justify-between rounded-xl bg-mist p-4">
              <span className="text-[13px] font-semibold text-ink">You pay</span>
              {quote.isLoading ? <Loader2 size={16} className="animate-spin text-brand-green" /> : <span className="text-[16px] font-semibold text-brand-green">{priceNgn}</span>}
            </div>
          )}

          <label className="mb-1.5 block text-[12.5px] font-semibold text-ink">Pay with</label>
          <div className="mb-4 grid grid-cols-2 gap-2">
            {(["wallet", "card"] as const).map((m) => (
              <button key={m} onClick={() => setPayWith(m)} className={`h-11 rounded-[11px] border text-[13.5px] font-medium transition ${payWith === m ? "border-brand-green bg-brand-green/10 text-brand-green" : "border-hairline bg-paper text-ink hover:bg-mist"}`}>{m === "wallet" ? "Wallet" : "Card"}</button>
            ))}
          </div>
          {payWith === "wallet" && <p className="mb-3 text-[12px] text-muted">Wallet balance: {naira(balance)}</p>}

          <button onClick={submit} disabled={buy.isPending} className="flex h-11 w-full items-center justify-center rounded-[11px] bg-brand-red text-[14px] font-semibold text-white shadow-[0_8px_20px_rgba(227,16,18,0.25)] transition hover:brightness-95 disabled:opacity-60">
            {buy.isPending ? <Loader2 size={18} className="animate-spin" /> : (quote.data ? `Send ${priceNgn}` : "Send airtime")}
          </button>
        </>
      )}

      {(history.data?.length ?? 0) > 0 && (
        <div className="mt-6 border-t border-hairline pt-4">
          <p className="mb-3 text-[12.5px] font-semibold text-ink">Recent top-ups</p>
          <ul className="space-y-2">
            {history.data!.slice(0, 8).map((t) => (
              <li key={t.reference} className="flex items-center justify-between gap-3 rounded-xl bg-mist px-3.5 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-ink">{t.operator_name || t.country_iso}</p>
                  <p className="truncate text-[11.5px] text-muted">{t.recipient_number} · {new Date(t.created_at).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-[13px] font-semibold text-ink">{naira(Number(t.total_ngn))}</p>
                  <p className={`text-[11px] font-medium ${t.status === "success" ? "text-brand-green" : t.status === "failed" ? "text-danger" : "text-muted"}`}>{t.status}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
