// src/pages/services/InternationalAirtime.tsx
import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import { useCurrency } from "../../currency/CurrencyContext";
import { walletApi } from "../../services/wallet";
import { naira } from "../../lib/format";
import { apiErrorMessage } from "../../lib/api";
import { useDebounced } from "../../hooks/useDebounced";
import { useTranslation } from "react-i18next";
import { reloadlyApi, intlAirStore, type Operator, type AirtimeTopup } from "../../services/reloadly";

const SYMBOLS: Record<string, string> = { NGN: "₦", USD: "$", GBP: "£", EUR: "€" };

export default function InternationalAirtime() {
  const qc = useQueryClient();
  const { isVerified } = useAuth();
  const { t } = useTranslation();
  const { currency } = useCurrency();          // "NGN" | "USD" | "GBP" | "EUR"

  const [country, setCountry] = useState("");
  const [phone, setPhone] = useState("");
  const [operator, setOperator] = useState<Operator | null>(null);
  const [amount, setAmount] = useState("");
  const [payWith, setPayWith] = useState<"wallet" | "card">("wallet");
  const [topup, setTopup] = useState<AirtimeTopup | null>(null);
  const [error, setError] = useState<string>();
  const [resuming, setResuming] = useState(false);

  const countries = useQuery({
    queryKey: ["intl", "countries"], queryFn: reloadlyApi.countries,
    enabled: isVerified, staleTime: 60 * 60 * 1000,
  });
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

  useEffect(() => {
    const pending = intlAirStore.take();
    if (!pending) return;
    setResuming(true);
    (async () => {
      try {
        let tp = await reloadlyApi.cardVerify(pending.ref).catch(() => reloadlyApi.topup(pending.topupRef));
        for (let i = 0; i < 6 && tp.status !== "success" && tp.status !== "failed"; i++) {
          await new Promise((r) => setTimeout(r, 2000));
          tp = await reloadlyApi.topup(pending.topupRef);
        }
        qc.invalidateQueries({ queryKey: ["wallets"] });
        setTopup(tp);
      } catch {
        setError(t("airtime.intl.errConfirm"));
      } finally {
        setResuming(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const useLocal = operator?.denomination_type === "RANGE" || (operator?.local_fixed_amounts?.length ?? 0) > 0;
  const amounts = useMemo(
    () => (!operator ? [] : useLocal ? operator.local_fixed_amounts : operator.fixed_amounts),
    [operator, useLocal],
  );

  const quote = useQuery({
    queryKey: ["intl", "quote", operator?.operator_id, amount, useLocal],
    queryFn: () => reloadlyApi.quote({
      operator_id: operator!.operator_id, amount: Number(amount), use_local_amount: useLocal,
    }),
    enabled: !!operator && Number(amount) > 0,
  });

  const chargeOptions: Record<string, string> = quote.data?.charge_options ?? {};
  // If the global switcher is on a currency the backend won't collect, fall
  // back to NGN for the charge only — the switcher itself is untouched.
  const effectiveCurrency = chargeOptions[currency.code] ? currency.code : "NGN";

  const buy = useMutation({
    mutationFn: () =>
      reloadlyApi.buy({
        operator_id: operator!.operator_id, amount: Number(amount), use_local_amount: useLocal,
        recipient_number: phone.trim(), recipient_iso2: country, pay_with: payWith,
        // The selected switcher value is sent as-is; the backend resolves it.
        currency: effectiveCurrency,
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
      setError(st === 402 ? t("airtime.intl.errBalance") : apiErrorMessage(err, t("airtime.intl.errFailed")));
    },
  });

  function submit() {
    setError(undefined);
    if (!country) return setError(t("airtime.intl.errCountry"));
    if (phone.trim().length < 6) return setError(t("airtime.intl.errPhone"));
    if (!operator) return setError(t("airtime.intl.errNetwork"));
    if (Number(amount) <= 0) return setError(t("airtime.intl.errAmount"));
    buy.mutate();
  }

  const inputCls = "h-11 w-full rounded-[11px] border border-hairline bg-paper px-3.5 text-[14px] text-ink outline-none transition focus:border-brand-green focus:ring-[3px] focus:ring-brand-green/10";
  const symbol = useLocal ? "" : "$";
  const priceNgn = quote.data ? naira(Number(quote.data.total_ngn)) : "";

  // What the pay button shows. On card, it's the charge currency the user
  // selected via the global switcher; on wallet, always NGN.
  const priceForCharge = (() => {
    if (!quote.data) return "";
    if (payWith !== "card") return priceNgn;
    const v = chargeOptions[effectiveCurrency];
    if (!v) return priceNgn;
    return `${SYMBOLS[effectiveCurrency] ?? ""}${Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  })();

  if (resuming) {
    return <div className="py-16 text-center"><Loader2 size={30} className="mx-auto animate-spin text-brand-green" /><p className="mt-3 text-[14px] text-muted">Confirming your top-up…</p></div>;
  }

  if (topup) {
    const ok = topup.status === "success";
    return (
      <div className="rounded-2xl border border-hairline bg-paper p-6 text-center">
        {ok ? <CheckCircle2 size={44} className="mx-auto text-brand-green" /> : <XCircle size={44} className="mx-auto text-danger" />}
        <h2 className="mt-2 font-display text-lg font-semibold text-ink">{ok ? t("airtime.intl.successTitle") : t("airtime.intl.failedTitle")}</h2>
        <p className="mt-1 text-[14px] text-muted">{ok ? `${topup.operator_name} · ${topup.recipient_number}` : (topup.failure_reason || t("airtime.intl.refunded"))}</p>
        <button onClick={() => { setTopup(null); setAmount(""); }} className="mt-5 h-11 w-full rounded-[11px] bg-brand-green text-[14px] font-semibold text-white">{t("airtime.intl.done")}</button>
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
      <input value={phone} onChange={(e) => { setPhone(e.target.value.replace(/[^\d+]/g, "")); setOperator(null); }} placeholder={t("airtime.intl.phonePlaceholder")} className={`${inputCls} mb-4`} />

      {country && (operators.isLoading ? (
        <Loader2 size={20} className="mb-4 animate-spin text-brand-green" />
      ) : (
        <>
          <label className="mb-1.5 block text-[12.5px] font-semibold text-ink">{t("airtime.intl.network")}</label>
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
          <label className="mb-1.5 block text-[12.5px] font-semibold text-ink">{t("airtime.intl.amount")} {useLocal ? `(${operator.destination_currency})` : "(USD)"}</label>
          {amounts.length > 0 ? (
            <div className="mb-4 flex flex-wrap gap-2">
              {amounts.slice(0, 12).map((a) => (
                <button key={a} onClick={() => setAmount(String(a))} className={`h-10 rounded-[10px] border px-3.5 text-[13px] font-medium transition ${Number(amount) === a ? "border-brand-green bg-brand-green text-white" : "border-hairline bg-paper text-ink hover:bg-mist"}`}>{symbol}{a}</button>
              ))}
            </div>
          ) : (
            <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))} placeholder={`${symbol}0`} className={`${inputCls} mb-4`} />
          )}

          <label className="mb-1.5 block text-[12.5px] font-semibold text-ink">Pay with</label>
          <div className="mb-4 grid grid-cols-2 gap-2">
            {(["wallet", "card"] as const).map((m) => (
              <button key={m} onClick={() => setPayWith(m)} className={`h-11 rounded-[11px] border text-[13.5px] font-medium transition ${payWith === m ? "border-brand-green bg-brand-green/10 text-brand-green" : "border-hairline bg-paper text-ink hover:bg-mist"}`}>{m === "wallet" ? t("airtime.intl.wallet") : t("airtime.intl.card")}</button>
            ))}
          </div>
          {payWith === "wallet" && <p className="mb-3 text-[12px] text-muted">{t("airtime.intl.walletBalance", { balance: naira(balance) })}</p>}
          {payWith === "card" && (
            <p className="mb-3 text-[12px] text-muted">
              You'll be charged in <span className="font-semibold text-ink">{effectiveCurrency}</span>.
              {" "}Change this in the currency switcher at the top of the page.
            </p>
          )}

          {Number(amount) > 0 && (
            <div className="mb-4 flex items-center justify-between rounded-xl bg-mist p-4">
              <div>
                <p className="text-[13px] font-semibold text-ink">You pay</p>
                {payWith === "card" && effectiveCurrency !== "NGN" && (
                  <p className="mt-0.5 text-[11.5px] text-muted">≈ {priceNgn}</p>
                )}
              </div>
              {quote.isLoading ? (
                <Loader2 size={16} className="animate-spin text-brand-green" />
              ) : (
                <span className="text-[16px] font-semibold text-brand-green">{priceForCharge}</span>
              )}
            </div>
          )}

          <button onClick={submit} disabled={buy.isPending} className="flex h-11 w-full items-center justify-center rounded-[11px] bg-brand-red text-[14px] font-semibold text-white shadow-[0_8px_20px_rgba(227,16,18,0.25)] transition hover:brightness-95 disabled:opacity-60">
            {buy.isPending ? <Loader2 size={18} className="animate-spin" /> : (quote.data ? `Pay ${priceForCharge}` : t("airtime.intl.send"))}
          </button>
        </>
      )}

      {(history.data?.length ?? 0) > 0 && (
        <div className="mt-6 border-t border-hairline pt-4">
          <p className="mb-3 text-[12.5px] font-semibold text-ink">Recent top-ups</p>
          <ul className="space-y-2">
            {history.data!.slice(0, 8).map((tp) => (
              <li key={tp.reference} className="flex items-center justify-between gap-3 rounded-xl bg-mist px-3.5 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-ink">{tp.operator_name || tp.country_iso}</p>
                  <p className="truncate text-[11.5px] text-muted">{tp.recipient_number} · {new Date(tp.created_at).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-[13px] font-semibold text-ink">{naira(Number(tp.total_ngn))}</p>
                  <p className={`text-[11px] font-medium ${tp.status === "success" ? "text-brand-green" : tp.status === "failed" ? "text-danger" : "text-muted"}`}>{tp.status}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}