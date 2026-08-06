import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, CheckCircle2, CreditCard, Loader2, RefreshCw, Wallet, Wifi, XCircle } from "lucide-react";
import AppHeader from "../../components/AppHeader";
import TokenCard from "../../components/TokenCard";
import { useUserScope } from "../../auth/useUserScope";
import { useAuth } from "../../auth/AuthContext";
import { billingApi, cardCheckoutApi, type Biller, type BillOrder, type Plan } from "../../services/billing";
import RecentBeneficiaries from "../../components/RecentBeneficiaries";
import { useSaveBeneficiary } from "../../hooks/useSaveBeneficiary";
import { apiErrorMessage } from "../../lib/api";
import { walletApi } from "../../services/wallet";
import { naira } from "../../lib/format";
import PaySummary from "../../components/PaySummary";

/** Buy Data — pick a network, choose a live bundle, pay by wallet or card. */
export default function BuyData() {
  const { t } = useTranslation();
  const scope = useUserScope();
  const { isVerified } = useAuth();
  const saveBeneficiary = useSaveBeneficiary();
  const navigate = useNavigate();

  const [network, setNetwork] = useState("");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [phone, setPhone] = useState("");
  const [payWith, setPayWith] = useState<"wallet" | "card">("wallet");
  const [error, setError] = useState<string>();
  const [lowFunds, setLowFunds] = useState(false);
  const [order, setOrder] = useState<BillOrder | null>(null);

  const billersQuery = useQuery({
    queryKey: ["billers", "data"],
    queryFn: () => billingApi.getBillers("data"),
    enabled: isVerified,
  });

  const plansQuery = useQuery({
    queryKey: ["data-plans", network],
    queryFn: () => billingApi.getDataPlans(network),
    enabled: isVerified && Boolean(network),
  });

  const walletsQuery = useQuery({
    queryKey: ["wallet", scope, "list"],
    queryFn: walletApi.getWallets,
    enabled: isVerified,
  });
  const ngnBalance = walletsQuery.data?.wallets.find((w) => w.currency === "NGN")?.balance;

  const purchase = useMutation({
    mutationFn: () =>
      billingApi.purchase({
        category: "data",
        code: network,
        recipient: phone.trim(),
        amount: Number(plan?.price ?? 0),
        plan_code: plan?.variation_id,
      }),
    onSuccess: (data) => {
      setOrder(data);
      if (data.recipient)
        saveBeneficiary({ service_type: "data", account_identifier: data.recipient, biller_code: network, biller_name: data.biller_name });
    },
    onError: (err) => {
      const msg = apiErrorMessage(err, t("data.purchaseFailed"));
      const st = (err as { response?: { status?: number } })?.response?.status;
      setLowFunds(st === 402 || /insufficient|balance|fund/i.test(msg));
      setError(msg);
    },
  });

  const cardPay = useMutation({
    mutationFn: () =>
      cardCheckoutApi.start({
        category: "data",
        code: network,
        recipient: phone.trim(),
        amount: Number(plan?.price ?? 0),
        plan_code: plan?.variation_id,
      }),
    onSuccess: (data) => { window.location.href = data.authorization_url; },
    onError: (err) => setError(apiErrorMessage(err, t("data.cardStartFailed"))),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    setLowFunds(false);
    if (!network) return setError(t("data.chooseNetwork"));
    if (!plan) return setError(t("data.choosePlan"));
    if (phone.trim().length < 10) return setError(t("data.invalidPhone"));
    if (payWith === "card") cardPay.mutate();
    else purchase.mutate();
  }

  if (!isVerified) return <VerifyGate onBack={() => navigate("/dashboard")} />;

  if (order) {
    const ok = order.status === "success" || order.status === "pending";
    return (
      <Result
        ok={order.status === "success"}
        title={ok ? t("data.successTitle") : t("data.failedTitle")}
        message={t("data.successMessage", { plan: plan?.name ?? t("data.title"), recipient: order.recipient })}
        order={order}
        onAgain={() => { setOrder(null); setPlan(null); }}
        onDone={() => navigate("/dashboard")}
      />
    );
  }

  return (
    <div className="min-h-screen bg-mist">
      <AppHeader />
      <main className="mx-auto max-w-md px-5 py-8 sm:py-10">
        <button onClick={() => navigate("/dashboard")} className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted transition hover:text-ink">
          <ArrowLeft size={15} /> {t("bills.back")}
        </button>

        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-green/10 text-brand-green">
            <Wifi size={22} strokeWidth={1.75} />
          </span>
          <div>
            <h1 className="font-display text-xl font-semibold text-ink">{t("data.title")}</h1>
            <p className="text-[13px] text-muted">{t("data.subtitle")}</p>
          </div>
        </div>

        <form onSubmit={submit} className="rounded-2xl border border-hairline bg-paper p-5">
          {error && <ErrorBox message={error} />}
          {lowFunds && <LowFunds onCard={() => setPayWith("card")} />}

          {/* Network */}
          <label className="mb-1.5 block text-[12.5px] font-semibold text-ink">{t("data.network")}</label>
          {billersQuery.isLoading ? (
            <div className="mb-4 grid grid-cols-4 gap-2">
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-11 animate-pulse rounded-lg bg-hairline/60" />)}
            </div>
          ) : billersQuery.isError ? (
            <p className="mb-4 text-[13px] text-danger">{t("data.loadNetworksError")} <button type="button" onClick={() => billersQuery.refetch()} className="underline">{t("bills.retry")}</button></p>
          ) : (
            <div className="mb-4 grid grid-cols-4 gap-2">
              {billersQuery.data?.map((b: Biller) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => { setNetwork(b.code); setPlan(null); }}
                  className={`h-11 rounded-lg border text-[13px] font-medium transition ${
                    network === b.code ? "border-brand-green bg-brand-green/10 text-brand-green" : "border-hairline bg-paper text-ink hover:bg-mist"
                  }`}
                >
                  {b.name}
                </button>
              ))}
            </div>
          )}

          {/* Plans */}
          {network && (
            <>
              <label className="mb-1.5 block text-[12.5px] font-semibold text-ink">{t("data.dataPlan")}</label>
              {plansQuery.isLoading ? (
                <div className="mb-4 space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-14 animate-pulse rounded-[11px] bg-hairline/60" />)}
                </div>
              ) : plansQuery.isError ? (
                <p className="mb-4 text-[13px] text-danger">{t("data.loadPlansError")} <button type="button" onClick={() => plansQuery.refetch()} className="underline">{t("bills.retry")}</button></p>
              ) : (plansQuery.data?.length ?? 0) === 0 ? (
                <p className="mb-4 text-[13px] text-muted">{t("data.noPlans")}</p>
              ) : (
                <div className="scrollbar-hide mb-4 max-h-64 space-y-2 overflow-y-auto pr-1">
                  {plansQuery.data?.map((p) => (
                    <button
                      key={p.variation_id}
                      type="button"
                      onClick={() => setPlan(p)}
                      className={`flex w-full items-center justify-between rounded-[11px] border px-3.5 py-3 text-left transition ${
                        plan?.variation_id === p.variation_id ? "border-brand-green bg-brand-green/5" : "border-hairline bg-paper hover:bg-mist"
                      }`}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-[13.5px] font-medium text-ink">{p.name}</span>
                        {p.validity && <span className="block text-[11.5px] text-muted">{p.validity}</span>}
                      </span>
                      <span className="ml-3 shrink-0 tabular text-[14px] font-semibold text-brand-green">
                        ₦{Number(p.price).toLocaleString()}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          <RecentBeneficiaries
            type="data"
            enabled={isVerified}
            onPick={(b) => { setPhone(b.account_identifier); if (b.biller_code) setNetwork(b.biller_code); }}
          />
          {/* Phone */}
          <label htmlFor="phone" className="mb-1.5 block text-[12.5px] font-semibold text-ink">{t("data.phoneNumber")}</label>
          <input
            id="phone"
            inputMode="numeric"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/[^\d]/g, ""))}
            placeholder={t("data.phonePlaceholder")}
            maxLength={11}
            className="mb-5 h-12 w-full rounded-[11px] border border-hairline bg-paper px-3.5 text-[15px] text-ink outline-none transition focus:border-brand-green focus:ring-[3px] focus:ring-brand-green/10"
          />

          <PayWith value={payWith} onChange={setPayWith} />

          <PaySummary
            amount={Number(plan?.price) || 0}
            payWith={payWith}
            balance={payWith === "wallet" ? ngnBalance : undefined}
            label={t("data.bundleLabel")}
          />

          <button
            type="submit"
            disabled={purchase.isPending || cardPay.isPending}
            className="flex h-12 w-full items-center justify-center rounded-[11px] bg-brand-red text-[15px] font-semibold text-white shadow-[0_8px_20px_rgba(227,16,18,0.25)] transition hover:brightness-95 active:scale-[0.99] disabled:opacity-60"
          >
            {purchase.isPending || cardPay.isPending ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            ) : (
              plan ? t("data.payAmount", { amount: Number(plan.price).toLocaleString() }) : t("data.buyData")
            )}
          </button>
          <PayNote payWith={payWith} noun={t("data.payNoun")} />
        </form>
      </main>
    </div>
  );
}

/* ---------- small shared bits (also used by Cable & Electricity) ---------- */
export function ErrorBox({ message }: { message: string }) {
  return <div className="mb-4 rounded-lg border border-danger/30 bg-danger/5 px-3.5 py-2.5 text-[13px] text-danger">{message}</div>;
}

export function LowFunds({ onCard }: { onCard: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="mb-4 rounded-lg border border-brand-green/30 bg-brand-green/5 p-3.5">
      <p className="text-[13px] text-ink">{t("bills.lowFunds")}</p>
      <button type="button" onClick={onCard} className="mt-2 inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-green px-4 text-[13px] font-medium text-white transition hover:brightness-95">
        <CreditCard size={15} strokeWidth={2} /> {t("bills.switchToCard")}
      </button>
    </div>
  );
}

export function PayWith({ value, onChange }: { value: "wallet" | "card"; onChange: (v: "wallet" | "card") => void }) {
  const { t } = useTranslation();
  return (
    <>
      <label className="mb-1.5 block text-[12.5px] font-semibold text-ink">{t("bills.payWith")}</label>
      <div className="mb-5 grid grid-cols-2 gap-2">
        <button type="button" onClick={() => onChange("wallet")} className={`flex h-12 items-center justify-center gap-2 rounded-[11px] border text-[13.5px] font-medium transition ${value === "wallet" ? "border-brand-green bg-brand-green/10 text-brand-green" : "border-hairline bg-paper text-ink hover:bg-mist"}`}>
          <Wallet size={16} strokeWidth={1.75} /> {t("bills.wallet")}
        </button>
        <button type="button" onClick={() => onChange("card")} className={`flex h-12 items-center justify-center gap-2 rounded-[11px] border text-[13.5px] font-medium transition ${value === "card" ? "border-brand-green bg-brand-green/10 text-brand-green" : "border-hairline bg-paper text-ink hover:bg-mist"}`}>
          <CreditCard size={16} strokeWidth={1.75} /> {t("bills.card")}
        </button>
      </div>
    </>
  );
}

export function PayNote({ payWith, noun }: { payWith: "wallet" | "card"; noun: string }) {
  const { t } = useTranslation();
  return (
    <p className="mt-3 text-center text-[12px] text-muted">
      {payWith === "card" ? t("bills.payNoteCard", { noun }) : t("bills.payNoteWallet")}
    </p>
  );
}

export function VerifyGate({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-mist">
      <AppHeader />
      <main className="mx-auto max-w-md px-5 py-16 text-center">
        <h1 className="font-display text-xl font-semibold text-ink">{t("bills.verifyGate.title")}</h1>
        <p className="mt-2 text-[14px] text-muted">{t("bills.verifyGate.body")}</p>
        <button onClick={onBack} className="mt-5 rounded-lg bg-brand-green px-5 py-2.5 text-[14px] font-medium text-white">{t("bills.verifyGate.back")}</button>
      </main>
    </div>
  );
}

/**
 * Purchase result. THREE states, not two — a pending/processing order has
 * already taken the money and been accepted; calling it "failed" would be
 * wrong and dangerous. Pending orders poll until they resolve.
 */
export function Result({ ok, title, message, order, onAgain, onDone }: {
  ok: boolean; title: string; message: string; order: BillOrder; onAgain: () => void; onDone: () => void;
}) {
  const { t } = useTranslation();
  const [live, setLive] = useState<BillOrder>(order);
  const [checking, setChecking] = useState(false);

  const pending = ["pending", "processing"].includes(String(live.status).toLowerCase());
  const awaitingToken =
    String(live.status).toLowerCase() === "success" &&
    live.category === "electricity" &&
    live.meter_type !== "postpaid" &&
    !live.token;
  const success = String(live.status).toLowerCase() === "success";
  const failed = !pending && !success;

  useEffect(() => {
    if (!pending && !awaitingToken) return;
    let alive = true;
    const timer = setInterval(async () => {
      try {
        const fresh = await billingApi.refreshOrder(live.reference);
        if (alive) setLive(fresh);
      } catch {
        try {
          const fallback = await billingApi.getOrder(live.reference);
          if (alive) setLive(fallback);
        } catch { /* keep trying */ }
      }
    }, 8000);
    return () => { alive = false; clearInterval(timer); };
  }, [pending, awaitingToken, live.reference]);

  async function recheck() {
    setChecking(true);
    try {
      setLive(await billingApi.refreshOrder(live.reference));
    } catch {
      try { setLive(await billingApi.getOrder(live.reference)); } catch { /* ignore */ }
    } finally {
      setChecking(false);
    }
  }

  const heading = pending ? t("bills.result.inProgress")
    : awaitingToken ? t("bills.result.issuingToken")
    : success ? title
    : t("bills.result.failed");
  const body = pending
    ? t("bills.result.bodyPending")
    : awaitingToken
    ? t("bills.result.bodyToken")
    : success ? message
    : t("bills.result.bodyFailed");

  return (
    <div className="min-h-screen bg-mist">
      <AppHeader />
      <main className="mx-auto max-w-md px-5 py-12">
        <div className="rounded-2xl border border-hairline bg-paper p-8 text-center">
          {pending || awaitingToken ? <Loader2 size={44} strokeWidth={1.5} className="mx-auto animate-spin text-warn" />
            : success ? <CheckCircle2 size={48} strokeWidth={1.5} className="mx-auto text-brand-green" />
            : <XCircle size={48} strokeWidth={1.5} className="mx-auto text-danger" />}

          <h1 className="mt-4 font-display text-xl font-semibold text-ink">{heading}</h1>
          <p className="mt-1 text-[14px] leading-relaxed text-muted">{body}</p>

          {(pending || awaitingToken) && (
            <p className="mt-3 rounded-lg border border-warn/30 bg-warn/5 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-warn">
              {t("bills.result.dontBuyAgain")}
            </p>
          )}

          {live.token && (
            <div className="mt-5">
              <TokenCard token={live.token} units={live.units} />
            </div>
          )}

          <div className="mt-5 rounded-xl bg-mist p-3 text-left text-[12.5px] text-muted">
            {live.customer_name && (
              <div className="mb-1 flex justify-between"><span>{t("bills.result.customer")}</span><span className="font-medium text-ink">{live.customer_name}</span></div>
            )}
            <div className="flex justify-between"><span>{t("bills.result.status")}</span><span className="font-medium text-ink">{live.status}</span></div>
            <div className="mt-1 flex justify-between"><span>{t("bills.result.reference")}</span><span className="font-mono text-[11px] text-ink">{live.reference}</span></div>
          </div>

          {(pending || awaitingToken) && (
            <button
              onClick={recheck}
              disabled={checking}
              className="mt-4 inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-hairline bg-paper px-4 text-[13px] font-medium text-ink transition hover:bg-mist disabled:opacity-60"
            >
              <RefreshCw size={14} strokeWidth={1.75} className={checking ? "animate-spin" : ""} />
              {checking ? t("bills.result.checking") : t("bills.result.checkStatus")}
            </button>
          )}

          <div className="mt-6 flex gap-2">
            {!pending && (
              <button onClick={onAgain} className="h-11 flex-1 rounded-lg border border-hairline bg-paper text-[14px] font-medium text-ink transition hover:bg-mist">
                {failed ? t("bills.result.tryAgain") : t("bills.result.buyAgain")}
              </button>
            )}
            <button onClick={onDone} className="h-11 flex-1 rounded-lg bg-brand-green text-[14px] font-medium text-white transition hover:brightness-95">
              {pending ? t("bills.result.viewInOrders") : t("bills.result.done")}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
