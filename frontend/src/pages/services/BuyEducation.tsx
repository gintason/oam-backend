import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BadgeCheck, GraduationCap, Loader2, Minus, Plus } from "lucide-react";
import AppHeader from "../../components/AppHeader";
import { useUserScope } from "../../auth/useUserScope";
import { useAuth } from "../../auth/AuthContext";
import { billingApi, type Biller, type BillOrder, type Plan } from "../../services/billing";
import { apiErrorMessage } from "../../lib/api";
import { walletApi } from "../../services/wallet";
import PaySummary from "../../components/PaySummary";
import { ErrorBox, LowFunds, VerifyGate } from "./BuyData";
import BillPins from "./BillPins";
import { useDebounced } from "../../hooks/useDebounced";

/** Education — WAEC result checker / registration and JAMB PINs. Wallet payment. */
export default function BuyEducation() {
  const scope = useUserScope();
  const { isVerified } = useAuth();
  const navigate = useNavigate();

  const [exam, setExam] = useState("");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [qty, setQty] = useState(1);
  const [profileId, setProfileId] = useState("");
  const [customerName, setCustomerName] = useState<string>();
  const [verificationId, setVerificationId] = useState("");
  const [error, setError] = useState<string>();
  const [lowFunds, setLowFunds] = useState(false);
  const [order, setOrder] = useState<BillOrder | null>(null);
  const isJamb = exam.toLowerCase() === "jamb";

  const billers = useQuery({ queryKey: ["billers", "education"], queryFn: () => billingApi.getBillers("education"), enabled: isVerified });
  const plans = useQuery({ queryKey: ["education-plans", exam], queryFn: () => billingApi.getEducationPlans(exam), enabled: isVerified && Boolean(exam) });
  const wallets = useQuery({ queryKey: ["wallet", scope, "list"], queryFn: walletApi.getWallets, enabled: isVerified });
  const balance = wallets.data?.wallets.find((w) => w.currency === "NGN")?.balance;
  const fee = Number(billers.data?.find((b) => b.code === exam)?.service_fee ?? 0);

  const verify = useMutation({
    mutationFn: () => billingApi.verifyCustomer({ category: "education", code: exam, customer_id: profileId.trim(), variation: plan?.variation_id }),
    onSuccess: (d) => {
      if (d.customer_name && d.verification_id) { setCustomerName(d.customer_name); setVerificationId(d.verification_id); setError(undefined); }
      else { setCustomerName(undefined); setVerificationId(""); setError(d.detail || "Couldn't confirm that JAMB profile."); }
    },
    onError: (err) => { setCustomerName(undefined); setError(apiErrorMessage(err, "Couldn't verify that JAMB profile ID.")); },
  });
  const debouncedProfile = useDebounced(profileId, 700);
  useEffect(() => {
    if (isJamb && plan && debouncedProfile.trim().length >= 10 && !customerName && !verify.isPending) verify.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isJamb, plan, debouncedProfile]);

  const purchase = useMutation({
    mutationFn: () => billingApi.purchase({
      category: "education", code: exam, recipient: isJamb ? profileId.trim() : "self",
      amount: Number(plan?.price ?? 0) * qty, variation_id: plan?.variation_id, plan_code: plan?.variation_id,
      quantity: isJamb ? 1 : qty, verification_id: verificationId || undefined,
    }),
    onSuccess: (d) => setOrder(d),
    onError: (err) => {
      const msg = apiErrorMessage(err, "Purchase failed. Try again.");
      setLowFunds(/insufficient|balance|fund/i.test(msg));
      setError(msg);
    },
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined); setLowFunds(false);
    if (!exam) return setError("Choose an exam.");
    if (!plan) return setError("Choose what you want to buy.");
    if (isJamb && !verificationId) return setError("Enter the JAMB profile ID and wait for it to be confirmed.");
    purchase.mutate();
  }

  if (!isVerified) return <VerifyGate onBack={() => navigate("/dashboard")} />;
  if (order) {
    return <BillPins order={order} title="Your exam PIN is ready" onAgain={() => { setOrder(null); setPlan(null); }} onDone={() => navigate("/dashboard")} />;
  }

  const total = (Number(plan?.price) || 0) * (isJamb ? 1 : qty);
  return (
    <div className="min-h-screen bg-mist">
      <AppHeader />
      <main className="mx-auto max-w-md px-5 py-8 sm:py-10">
        <button onClick={() => navigate("/dashboard")} className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted transition hover:text-ink">
          <ArrowLeft size={15} /> Back
        </button>
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-green/10 text-brand-green"><GraduationCap size={22} strokeWidth={1.75} /></span>
          <div>
            <h1 className="font-display text-xl font-semibold text-ink">Education</h1>
            <p className="text-[13px] text-muted">WAEC result checker, WAEC registration and JAMB PINs.</p>
          </div>
        </div>

        <form onSubmit={submit} className="rounded-2xl border border-hairline bg-paper p-5">
          {error && <ErrorBox message={error} />}
          {lowFunds && <LowFunds onCard={() => navigate("/wallet/fund")} />}

          <label className="mb-1.5 block text-[12.5px] font-semibold text-ink">Exam</label>
          <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {billers.data?.map((b: Biller) => (
              <button key={b.id} type="button"
                      onClick={() => { setExam(b.code); setPlan(null); setCustomerName(undefined); setVerificationId(""); }}
                      className={`h-11 rounded-lg border text-[13px] font-medium transition ${exam === b.code ? "border-brand-green bg-brand-green/10 text-brand-green" : "border-hairline bg-paper text-ink hover:bg-mist"}`}>
                {b.name}
              </button>
            ))}
          </div>

          {exam && (
            <>
              <label className="mb-1.5 block text-[12.5px] font-semibold text-ink">Type</label>
              {plans.isLoading ? (
                <div className="mb-4 h-14 animate-pulse rounded-[11px] bg-hairline/60" />
              ) : (plans.data?.length ?? 0) === 0 ? (
                <p className="mb-4 text-[13px] text-muted">Not available right now. Please try again later.</p>
              ) : (
                <div className="mb-4 space-y-2">
                  {plans.data!.map((p) => (
                    <button key={p.variation_id} type="button" onClick={() => { setPlan(p); setCustomerName(undefined); setVerificationId(""); }}
                            className={`flex w-full items-center justify-between rounded-[11px] border px-3.5 py-3 text-left transition ${plan?.variation_id === p.variation_id ? "border-brand-green bg-brand-green/5" : "border-hairline bg-paper hover:bg-mist"}`}>
                      <span className="min-w-0 truncate text-[13.5px] font-medium text-ink">{p.name}</span>
                      <span className="ml-3 shrink-0 tabular text-[14px] font-semibold text-brand-green">₦{Number(p.price).toLocaleString()}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {plan && isJamb && (
            <>
              <label htmlFor="profile" className="mb-1.5 block text-[12.5px] font-semibold text-ink">JAMB profile ID</label>
              <input id="profile" inputMode="numeric" value={profileId}
                     onChange={(e) => { setProfileId(e.target.value.replace(/[^\d]/g, "")); setCustomerName(undefined); setVerificationId(""); }}
                     placeholder="Enter the candidate's profile ID"
                     className="h-12 w-full rounded-[11px] border border-hairline bg-paper px-3.5 text-[15px] text-ink outline-none focus:border-brand-green" />
              {verify.isPending && <div className="mt-2 flex items-center gap-1.5 text-[13px] text-muted"><Loader2 size={14} className="animate-spin" /> Checking profile…</div>}
              {customerName && <div className="mt-2 flex items-center gap-1.5 rounded-lg border border-brand-green/30 bg-brand-green/5 px-3 py-2 text-[13px] text-brand-green"><BadgeCheck size={15} /> {customerName}</div>}
              <div className="mb-3" />
            </>
          )}

          {plan && !isJamb && (
            <div className="mb-4 flex items-center justify-between">
              <span className="text-[12.5px] font-semibold text-ink">How many?</span>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setQty(Math.max(1, qty - 1))} className="flex h-9 w-9 items-center justify-center rounded-lg border border-hairline"><Minus size={15} /></button>
                <span className="w-5 text-center text-[15px] font-semibold tabular">{qty}</span>
                <button type="button" onClick={() => setQty(Math.min(5, qty + 1))} className="flex h-9 w-9 items-center justify-center rounded-lg border border-hairline"><Plus size={15} /></button>
              </div>
            </div>
          )}

          <PaySummary fee={fee} amount={total} payWith="wallet" balance={balance} label="Exam PIN" />
          <button type="submit" disabled={purchase.isPending}
                  className="flex h-12 w-full items-center justify-center rounded-[11px] bg-brand-red text-[15px] font-semibold text-white disabled:opacity-60">
            {purchase.isPending ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : plan ? `Pay ₦${(total + fee).toLocaleString()}` : "Buy PIN"}
          </button>
          <p className="mt-3 text-center text-[12px] text-muted">Paid from your O.A.M wallet. Your PIN appears here and in your order history.</p>
        </form>
      </main>
    </div>
  );
}
