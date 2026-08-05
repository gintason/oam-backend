import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, BadgeCheck, Loader2, Tv } from "lucide-react";
import AppHeader from "../../components/AppHeader";
import { useUserScope } from "../../auth/useUserScope";
import { useAuth } from "../../auth/AuthContext";
import { billingApi, cardCheckoutApi, type Biller, type BillOrder, type Plan } from "../../services/billing";
import RecentBeneficiaries from "../../components/RecentBeneficiaries";
import { useSaveBeneficiary } from "../../hooks/useSaveBeneficiary";
import { apiErrorMessage } from "../../lib/api";
import { walletApi } from "../../services/wallet";
import { naira } from "../../lib/format";
import PaySummary from "../../components/PaySummary";
import { ErrorBox, LowFunds, PayWith, PayNote, VerifyGate, Result } from "./BuyData";
import { useDebounced } from "../../hooks/useDebounced";

/** Cable TV — pick provider + package, verify the smartcard, pay by wallet or card. */
export default function BuyCable() {
  const { t } = useTranslation();
  const scope = useUserScope();
  const { isVerified } = useAuth();
  const saveBeneficiary = useSaveBeneficiary();
  const navigate = useNavigate();

  const [provider, setProvider] = useState("");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [smartcard, setSmartcard] = useState("");
  const [customerName, setCustomerName] = useState<string>();
  const [verificationId, setVerificationId] = useState<string>("");
  const [payWith, setPayWith] = useState<"wallet" | "card">("wallet");
  const [error, setError] = useState<string>();
  const [lowFunds, setLowFunds] = useState(false);
  const [order, setOrder] = useState<BillOrder | null>(null);

  const billersQuery = useQuery({
    queryKey: ["billers", "cable"],
    queryFn: () => billingApi.getBillers("cable"),
    enabled: isVerified,
  });

  const plansQuery = useQuery({
    queryKey: ["tv-plans", provider],
    queryFn: () => billingApi.getTvPlans(provider),
    enabled: isVerified && Boolean(provider),
  });

  const verify = useMutation({
    mutationFn: () =>
      billingApi.verifyCustomer({
        category: "cable",
        code: provider,
        customer_id: smartcard.trim(),
      }),
    onSuccess: (data) => {
      const name = data.customer_name || "";
      if (name && data.verification_id) {
        setCustomerName(name);
        setVerificationId(data.verification_id);
        setError(undefined);
      } else {
        setCustomerName(undefined);
        setVerificationId("");
        setError(data.detail || t("cable.couldntConfirmSmartcard"));
      }
    },
    onError: (err) => {
      setCustomerName(undefined);
      setError(apiErrorMessage(err, t("cable.couldntVerifySmartcard")));
    },
  });

  // AUTO-VERIFY the smartcard once it looks complete.
  const debouncedCard = useDebounced(smartcard, 700);
  useEffect(() => {
    if (provider && debouncedCard.trim().length >= 10 && !customerName && !verify.isPending) {
      verify.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider, debouncedCard]);

  const walletsQuery = useQuery({
    queryKey: ["wallet", scope, "list"],
    queryFn: walletApi.getWallets,
    enabled: isVerified,
  });
  const ngnBalance = walletsQuery.data?.wallets.find((w) => w.currency === "NGN")?.balance;

  const purchase = useMutation({
    mutationFn: () =>
      billingApi.purchase({
        category: "cable",
        code: provider,
        recipient: smartcard.trim(),
        amount: Number(plan?.price ?? 0),
        plan_code: plan?.variation_id,
        variation_id: plan?.variation_id || "",
        verification_id: verificationId,
      }),
    onSuccess: (data) => {
      setOrder(data);
      if (data.status === "success")
        saveBeneficiary({ service_type: "cable", account_identifier: data.recipient, biller_code: provider, biller_name: data.biller_name, customer_name: data.customer_name });
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
        category: "cable",
        code: provider,
        recipient: smartcard.trim(),
        amount: Number(plan?.price ?? 0),
        plan_code: plan?.variation_id,
        variation_id: plan?.variation_id || "",
        verification_id: verificationId,
      }),
    onSuccess: (data) => { window.location.href = data.authorization_url; },
    onError: (err) => setError(apiErrorMessage(err, t("data.cardStartFailed"))),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    setLowFunds(false);
    if (!provider) return setError(t("cable.chooseProvider"));
    if (!plan) return setError(t("cable.choosePackage"));
    if (!verificationId) return setError(t("cable.waitSmartcard"));
    if (smartcard.trim().length < 6) return setError(t("cable.invalidSmartcard"));
    if (payWith === "card") cardPay.mutate();
    else purchase.mutate();
  }

  if (!isVerified) return <VerifyGate onBack={() => navigate("/dashboard")} />;

  if (order) {
    return (
      <Result
        ok={order.status === "success"}
        title={t("cable.successTitle")}
        message={t("cable.successMessage", { plan: plan?.name ?? t("cable.package"), recipient: order.recipient })}
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
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-red/10 text-brand-red">
            <Tv size={22} strokeWidth={1.75} />
          </span>
          <div>
            <h1 className="font-display text-xl font-semibold text-ink">{t("cable.title")}</h1>
            <p className="text-[13px] text-muted">{t("cable.subtitle")}</p>
          </div>
        </div>

        <form onSubmit={submit} className="rounded-2xl border border-hairline bg-paper p-5">
          {error && <ErrorBox message={error} />}
          {lowFunds && <LowFunds onCard={() => setPayWith("card")} />}

          {/* Provider */}
          <label className="mb-1.5 block text-[12.5px] font-semibold text-ink">{t("cable.provider")}</label>
          {billersQuery.isLoading ? (
            <div className="mb-4 grid grid-cols-3 gap-2">
              {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-11 animate-pulse rounded-lg bg-hairline/60" />)}
            </div>
          ) : billersQuery.isError ? (
            <p className="mb-4 text-[13px] text-danger">{t("cable.loadProvidersError")} <button type="button" onClick={() => billersQuery.refetch()} className="underline">{t("bills.retry")}</button></p>
          ) : (
            <div className="mb-4 grid grid-cols-3 gap-2">
              {billersQuery.data?.map((b: Biller) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => { setProvider(b.code); setPlan(null); setCustomerName(undefined); setVerificationId(""); }}
                  className={`h-11 rounded-lg border text-[13px] font-medium transition ${
                    provider === b.code ? "border-brand-green bg-brand-green/10 text-brand-green" : "border-hairline bg-paper text-ink hover:bg-mist"
                  }`}
                >
                  {b.name}
                </button>
              ))}
            </div>
          )}

          {/* Packages */}
          {provider && (
            <>
              <label className="mb-1.5 block text-[12.5px] font-semibold text-ink">{t("cable.package")}</label>
              {plansQuery.isLoading ? (
                <div className="mb-4 space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-14 animate-pulse rounded-[11px] bg-hairline/60" />)}
                </div>
              ) : plansQuery.isError ? (
                <p className="mb-4 text-[13px] text-danger">{t("cable.loadPackagesError")} <button type="button" onClick={() => plansQuery.refetch()} className="underline">{t("bills.retry")}</button></p>
              ) : (plansQuery.data?.length ?? 0) === 0 ? (
                <p className="mb-4 text-[13px] text-muted">{t("cable.noPackages")}</p>
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
                      <span className="min-w-0 truncate text-[13.5px] font-medium text-ink">{p.name}</span>
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
            type="cable"
            enabled={isVerified}
            onPick={(b) => { setProvider(b.biller_code); setSmartcard(b.account_identifier); setCustomerName(undefined); setVerificationId(""); }}
          />
          {/* Smartcard */}
          <label htmlFor="smartcard" className="mb-1.5 block text-[12.5px] font-semibold text-ink">{t("cable.smartcard")}</label>
          <input
            id="smartcard"
            inputMode="numeric"
            value={smartcard}
            onChange={(e) => { setSmartcard(e.target.value.replace(/[^\d]/g, "")); setCustomerName(undefined); setVerificationId(""); setError(undefined); }}
            placeholder={t("cable.smartcardPlaceholder")}
            className="h-12 w-full rounded-[11px] border border-hairline bg-paper px-3.5 text-[15px] text-ink outline-none transition focus:border-brand-green focus:ring-[3px] focus:ring-brand-green/10"
          />
          {verify.isPending && (
            <div className="mt-2 flex items-center gap-1.5 text-[13px] text-muted">
              <Loader2 size={14} className="animate-spin" /> {t("cable.checkingSmartcard")}
            </div>
          )}
          {customerName && (
            <div className="mt-2 mb-2 flex items-center gap-1.5 rounded-lg border border-brand-green/30 bg-brand-green/5 px-3 py-2 text-[13px] text-brand-green">
              <BadgeCheck size={15} strokeWidth={2} />
              {customerName}
            </div>
          )}

          <div className="mt-3" />
          <PayWith value={payWith} onChange={setPayWith} />

          <PaySummary
            amount={Number(plan?.price) || 0}
            payWith={payWith}
            balance={payWith === "wallet" ? ngnBalance : undefined}
            label={t("cable.label")}
          />

          <button
            type="submit"
            disabled={purchase.isPending || cardPay.isPending}
            className="flex h-12 w-full items-center justify-center rounded-[11px] bg-brand-red text-[15px] font-semibold text-white shadow-[0_8px_20px_rgba(227,16,18,0.25)] transition hover:brightness-95 active:scale-[0.99] disabled:opacity-60"
          >
            {purchase.isPending || cardPay.isPending ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            ) : (
              plan ? t("cable.payAmount", { amount: Number(plan.price).toLocaleString() }) : t("cable.subscribe")
            )}
          </button>
          <PayNote payWith={payWith} noun={t("cable.payNoun")} />
        </form>
      </main>
    </div>
  );
}
