import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, BadgeCheck, CreditCard, Loader2, Wallet, Zap } from "lucide-react";
import AppHeader from "../../components/AppHeader";
import { useUserScope } from "../../auth/useUserScope";
import { useAuth } from "../../auth/AuthContext";
import {
  billingApi, cardCheckoutApi, type Biller, type BillOrder, type CustomerDetails,
} from "../../services/billing";
import RecentBeneficiaries from "../../components/RecentBeneficiaries";
import { useSaveBeneficiary } from "../../hooks/useSaveBeneficiary";
import { Result } from "./BuyData";
import { apiErrorMessage } from "../../lib/api";
import { walletApi } from "../../services/wallet";
import { naira } from "../../lib/format";
import PaySummary from "../../components/PaySummary";
import { useDebounced } from "../../hooks/useDebounced";

const QUICK_AMOUNTS = [1000, 2000, 5000, 10000];

/**
 * Buy Electricity (meter units). Verifies the meter owner's name first, then
 * charges either the wallet or a card via Paystack.
 */
export default function BuyElectricity() {
  const { t } = useTranslation();
  const scope = useUserScope();
  const { isVerified } = useAuth();
  const saveBeneficiary = useSaveBeneficiary();
  const navigate = useNavigate();

  const [disco, setDisco] = useState("");
  const [meterType, setMeterType] = useState<"prepaid" | "postpaid">("prepaid");
  const [meter, setMeter] = useState("");
  const [amount, setAmount] = useState("");
  const [payWith, setPayWith] = useState<"wallet" | "card">("wallet");
  const [customerName, setCustomerName] = useState<string>();
  const [customerInfo, setCustomerInfo] = useState<CustomerDetails | null>(null);
  const [verificationId, setVerificationId] = useState<string>("");
  const [error, setError] = useState<string>();
  const [lowFunds, setLowFunds] = useState(false);
  const [order, setOrder] = useState<BillOrder | null>(null);

  const billersQuery = useQuery({
    queryKey: ["billers", "electricity"],
    queryFn: () => billingApi.getBillers("electricity"),
    enabled: isVerified,
  });

  const verify = useMutation({
    mutationFn: () =>
      billingApi.verifyCustomer({
        category: "electricity",
        code: disco,
        customer_id: meter.trim(),
        meter_type: meterType,
      }),
    onSuccess: (data) => {
      const name = data.customer_name || "";
      if (name && data.verification_id) {
        setCustomerName(name);
        setCustomerInfo((data.details ?? {}) as CustomerDetails);
        setVerificationId(data.verification_id);
        setError(undefined);
      } else {
        setCustomerName(undefined);
        setCustomerInfo(null);
        setVerificationId("");
        setError(data.detail || t("electricity.couldntConfirmMeter"));
      }
    },
    onError: (err) => {
      setCustomerName(undefined);
      setCustomerInfo(null);
      setError(apiErrorMessage(err, t("electricity.couldntVerifyMeter")));
    },
  });

  const debouncedMeter = useDebounced(meter, 700);
  useEffect(() => {
    if (disco && debouncedMeter.trim().length >= 11 && !customerName && !verify.isPending) {
      verify.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disco, debouncedMeter, meterType]);

  const walletsQuery = useQuery({
    queryKey: ["wallet", scope, "list"],
    queryFn: walletApi.getWallets,
    enabled: isVerified,
  });
  const ngnBalance = walletsQuery.data?.wallets.find((w) => w.currency === "NGN")?.balance;

  const purchase = useMutation({
    mutationFn: () =>
      billingApi.purchase({
        category: "electricity",
        code: disco,
        recipient: meter.trim(),
        amount: Number(amount),
        meter_type: meterType,
        verification_id: verificationId,
      }),
    onSuccess: (data) => {
      setOrder(data);
      if (data.status !== "failed")
        saveBeneficiary({ service_type: "electricity", account_identifier: data.recipient, biller_code: disco, biller_name: data.biller_name, customer_name: data.customer_name });
    },
    onError: (err) => {
      const msg = apiErrorMessage(err, t("data.purchaseFailed"));
      const status = (err as { response?: { status?: number } })?.response?.status;
      setLowFunds(status === 402 || /insufficient|balance|fund/i.test(msg));
      setError(msg);
    },
  });

  const cardPay = useMutation({
    mutationFn: () =>
      cardCheckoutApi.start({
        category: "electricity",
        code: disco,
        recipient: meter.trim(),
        amount: Number(amount),
        meter_type: meterType,
        verification_id: verificationId,
      }),
    onSuccess: (data) => {
      window.location.href = data.authorization_url;
    },
    onError: (err) => setError(apiErrorMessage(err, t("data.cardStartFailed"))),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    setLowFunds(false);
    if (!disco) return setError(t("electricity.chooseProvider"));
    if (meter.trim().length < 6) return setError(t("electricity.invalidMeter"));
    if (!amount || Number(amount) < 100) return setError(t("electricity.minAmount"));
    if (payWith === "card") cardPay.mutate();
    else purchase.mutate();
  }

  if (!isVerified) {
    return (
      <div className="min-h-screen bg-mist">
        <AppHeader />
        <main className="mx-auto max-w-md px-5 py-16 text-center">
          <h1 className="font-display text-xl font-semibold text-ink">{t("bills.verifyGate.title")}</h1>
          <p className="mt-2 text-[14px] text-muted">{t("bills.verifyGate.body")}</p>
          <button onClick={() => navigate("/dashboard")} className="mt-5 rounded-lg bg-brand-green px-5 py-2.5 text-[14px] font-medium text-white">
            {t("bills.verifyGate.back")}
          </button>
        </main>
      </div>
    );
  }

  if (order) {
    return (
      <Result
        ok={order.status === "success"}
        title={t("electricity.successTitle")}
        message={t("electricity.successMessage", { amount: Number(order.amount).toLocaleString(), recipient: order.recipient })}
        order={order}
        onAgain={() => { setOrder(null); setAmount(""); }}
        onDone={() => navigate(order.status === "success" ? "/dashboard" : "/orders")}
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
            <Zap size={22} strokeWidth={1.75} />
          </span>
          <div>
            <h1 className="font-display text-xl font-semibold text-ink">{t("electricity.title")}</h1>
            <p className="text-[13px] text-muted">{t("electricity.subtitle")}</p>
          </div>
        </div>

        <form onSubmit={submit} className="rounded-2xl border border-hairline bg-paper p-5">
          {error && (
            <div className="mb-4 rounded-lg border border-danger/30 bg-danger/5 px-3.5 py-2.5 text-[13px] text-danger">
              {error}
            </div>
          )}

          {lowFunds && (
            <div className="mb-4 rounded-lg border border-brand-green/30 bg-brand-green/5 p-3.5">
              <p className="text-[13px] text-ink">{t("bills.lowFunds")}</p>
              <button type="button" onClick={() => setPayWith("card")} className="mt-2 inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-green px-4 text-[13px] font-medium text-white transition hover:brightness-95">
                <CreditCard size={15} strokeWidth={2} /> {t("bills.switchToCard")}
              </button>
            </div>
          )}

          {/* Provider */}
          <label className="mb-1.5 block text-[12.5px] font-semibold text-ink">{t("electricity.provider")}</label>
          {billersQuery.isLoading ? (
            <div className="mb-4 h-12 animate-pulse rounded-[11px] bg-hairline/60" />
          ) : billersQuery.isError ? (
            <p className="mb-4 text-[13px] text-danger">
              {t("electricity.loadProvidersError")} <button type="button" onClick={() => billersQuery.refetch()} className="underline">{t("bills.retry")}</button>
            </p>
          ) : (
            <select
              value={disco}
              onChange={(e) => { setDisco(e.target.value); setCustomerName(undefined); setCustomerInfo(null); setVerificationId(""); }}
              className="mb-4 h-12 w-full rounded-[11px] border border-hairline bg-paper px-3 text-[14px] text-ink outline-none transition focus:border-brand-green focus:ring-[3px] focus:ring-brand-green/10"
            >
              <option value="">{t("electricity.selectDisco")}</option>
              {billersQuery.data?.map((b: Biller) => (
                <option key={b.id} value={b.code}>{b.name}</option>
              ))}
            </select>
          )}

          {/* Meter type */}
          <label className="mb-1.5 block text-[12.5px] font-semibold text-ink">{t("electricity.meterType")}</label>
          <div className="mb-4 grid grid-cols-2 gap-2">
            {([["prepaid", t("electricity.prepaid")], ["postpaid", t("electricity.postpaid")]] as const).map(([value, labelText]) => (
              <button
                key={value}
                type="button"
                onClick={() => { setMeterType(value); setCustomerName(undefined); setCustomerInfo(null); setVerificationId(""); }}
                className={`h-11 rounded-[11px] border text-[13.5px] font-medium transition ${
                  meterType === value ? "border-brand-green bg-brand-green/10 text-brand-green" : "border-hairline bg-paper text-ink hover:bg-mist"
                }`}
              >
                {labelText}
              </button>
            ))}
          </div>

          <RecentBeneficiaries
            type="electricity"
            enabled={isVerified}
            onPick={(b) => { setDisco(b.biller_code); setMeter(b.account_identifier); setCustomerName(undefined); setVerificationId(""); }}
          />
          {/* Meter number */}
          <label htmlFor="meter" className="mb-1.5 block text-[12.5px] font-semibold text-ink">{t("electricity.meterNumber")}</label>
          <input
            id="meter"
            inputMode="numeric"
            value={meter}
            onChange={(e) => { setMeter(e.target.value.replace(/[^\d]/g, "")); setCustomerName(undefined); setCustomerInfo(null); setVerificationId(""); setError(undefined); }}
            placeholder={t("electricity.meterPlaceholder")}
            onBlur={() => {
              if (disco && meter.trim().length >= 8 && !customerName && !verify.isPending) verify.mutate();
            }}
            className="h-12 w-full rounded-[11px] border border-hairline bg-paper px-3.5 text-[15px] text-ink outline-none transition focus:border-brand-green focus:ring-[3px] focus:ring-brand-green/10"
          />
          {verify.isPending && (
            <div className="mt-2 flex items-center gap-1.5 text-[13px] text-muted">
              <Loader2 size={14} className="animate-spin" /> {t("electricity.checkingMeter")}
            </div>
          )}
          {customerName && (
            <div className="mt-2 mb-2 rounded-lg border border-brand-green/30 bg-brand-green/5 px-3 py-2.5">
              <div className="flex items-center gap-1.5 text-[13.5px] font-medium text-brand-green">
                <BadgeCheck size={15} strokeWidth={2} />
                {customerName}
              </div>
              <CustomerExtras info={customerInfo} />
            </div>
          )}
          {!customerName && !verify.isPending && disco && meter.length > 0 && meter.length < 11 && (
            <p className="mt-2 text-[12.5px] text-muted">
              {t("electricity.keepTyping", { count: meter.length })}
            </p>
          )}
          {!customerName && !verify.isPending && disco && meter.length >= 8 && verify.isError && (
            <p className="mt-2 text-[12.5px] text-muted">
              {t("electricity.couldntConfirmMeter")}{" "}
              <button type="button" onClick={() => verify.mutate()} className="underline text-ink">
                {t("electricity.checkAgain")}
              </button>
            </p>
          )}
          {!disco && meter.length > 0 && (
            <p className="mt-2 text-[12.5px] text-muted">{t("electricity.chooseProviderFirst")}</p>
          )}

          {/* Amount */}
          <label htmlFor="amount" className="mb-1.5 mt-2 block text-[12.5px] font-semibold text-ink">{t("electricity.amountLabel")}</label>
          <input
            id="amount"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
            placeholder={t("electricity.amountPlaceholder")}
            className="h-12 w-full rounded-[11px] border border-hairline bg-paper px-3.5 text-[15px] text-ink outline-none transition focus:border-brand-green focus:ring-[3px] focus:ring-brand-green/10"
          />
          <div className="mt-2 mb-5 flex flex-wrap gap-2">
            {QUICK_AMOUNTS.map((a) => (
              <button key={a} type="button" onClick={() => setAmount(String(a))} className="rounded-lg border border-hairline bg-paper px-3 py-1.5 text-[13px] font-medium text-ink transition hover:bg-mist">
                ₦{a.toLocaleString()}
              </button>
            ))}
          </div>

          {/* Payment method */}
          <label className="mb-1.5 block text-[12.5px] font-semibold text-ink">{t("bills.payWith")}</label>
          <div className="mb-5 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setPayWith("wallet")} className={`flex h-12 items-center justify-center gap-2 rounded-[11px] border text-[13.5px] font-medium transition ${payWith === "wallet" ? "border-brand-green bg-brand-green/10 text-brand-green" : "border-hairline bg-paper text-ink hover:bg-mist"}`}>
              <Wallet size={16} strokeWidth={1.75} /> {t("bills.wallet")}
            </button>
            <button type="button" onClick={() => setPayWith("card")} className={`flex h-12 items-center justify-center gap-2 rounded-[11px] border text-[13.5px] font-medium transition ${payWith === "card" ? "border-brand-green bg-brand-green/10 text-brand-green" : "border-hairline bg-paper text-ink hover:bg-mist"}`}>
              <CreditCard size={16} strokeWidth={1.75} /> {t("bills.card")}
            </button>
          </div>

          <PaySummary
            amount={Number(amount) || 0}
            payWith={payWith}
            balance={payWith === "wallet" ? ngnBalance : undefined}
            label={t("electricity.label")}
          />

          <button
            type="submit"
            disabled={purchase.isPending || cardPay.isPending}
            className="flex h-12 w-full items-center justify-center rounded-[11px] bg-brand-red text-[15px] font-semibold text-white shadow-[0_8px_20px_rgba(227,16,18,0.25)] transition hover:brightness-95 active:scale-[0.99] disabled:opacity-60"
          >
            {purchase.isPending || cardPay.isPending ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            ) : (
              amount ? t("electricity.payAmount", { amount: Number(amount).toLocaleString() }) : t("electricity.buyUnits")
            )}
          </button>
          <p className="mt-3 text-center text-[12px] text-muted">
            {payWith === "card" ? t("bills.payNoteCard", { noun: t("electricity.payNoun") }) : t("bills.payNoteWallet")}
          </p>
        </form>
      </main>
    </div>
  );
}

/**
 * Shows whatever extra detail the provider actually returned about the meter.
 * Providers differ in the keys they send; this checks common spellings for
 * address and arrears, then lists any other useful values it finds.
 */
function CustomerExtras({ info }: { info: CustomerDetails | null }) {
  const { t } = useTranslation();
  if (!info) return null;

  const pick = (...keys: string[]) => {
    for (const k of keys) {
      const v = (info as Record<string, unknown>)[k];
      if (v !== undefined && v !== null && String(v).trim() !== "" && String(v) !== "null") {
        return String(v);
      }
    }
    return "";
  };

  const address = pick("customer_address", "address", "customerAddress", "customer_addr", "Address");
  const arrears = pick("customer_arrears", "arrears", "outstanding", "customer_outstanding", "debt");
  const minAmount = pick("minimum_amount", "min_amount", "minimum_purchase", "min_purchase_amount");
  const district = pick("customer_district", "district", "business_unit", "customer_business_unit");

  const shown = new Set([
    "customer_name", "name", "customerName",
    "customer_address", "address", "customerAddress", "customer_addr", "Address",
    "customer_arrears", "arrears", "outstanding", "customer_outstanding", "debt",
    "minimum_amount", "min_amount", "minimum_purchase", "min_purchase_amount",
    "customer_district", "district", "business_unit", "customer_business_unit",
    "detail", "code", "message", "status",
  ]);
  const others = Object.entries(info as Record<string, unknown>)
    .filter(([k, v]) =>
      !shown.has(k) &&
      v !== null && v !== undefined && String(v).trim() !== "" && String(v) !== "null" &&
      (typeof v === "string" || typeof v === "number")
    )
    .slice(0, 4);

  const nothingExtra = !address && !arrears && !minAmount && !district && others.length === 0;

  return (
    <div className="mt-1.5 space-y-1 pl-[21px]">
      {address && <p className="text-[12.5px] leading-snug text-muted">{address}</p>}
      {district && <p className="text-[12px] text-muted">{t("electricity.districtLine", { value: district })}</p>}
      {arrears && Number(arrears) > 0 && (
        <p className="text-[12.5px] font-medium text-warn">
          {t("electricity.arrearsLine", { value: Number(arrears).toLocaleString() })}
        </p>
      )}
      {minAmount && Number(minAmount) > 0 && (
        <p className="text-[12px] text-muted">{t("electricity.minPurchaseLine", { value: Number(minAmount).toLocaleString() })}</p>
      )}
      {others.map(([k, v]) => (
        <p key={k} className="text-[12px] text-muted">
          {k.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase())}: {String(v)}
        </p>
      ))}
      {nothingExtra && (
        <p className="text-[12px] text-muted">
          {t("electricity.onlyName")}
        </p>
      )}
    </div>
  );
}
