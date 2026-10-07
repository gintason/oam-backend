import { useEffect, useState, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";
import AppHeader from "../../components/AppHeader";
import { BackToDashboard } from "../../components/jobs/ui";
import { jobsApi, type JobPayment } from "../../services/jobs";
import { useTranslation } from "react-i18next";

/**
 * Where Paystack/Flutterwave send the browser back after a jobs payment.
 *
 * Both gateways return every payment to ONE URL each (the existing
 * /payment/callback and /payment/flutterwave-callback pages). Rather than edit
 * those, `JobsPaymentGate` wraps them: if the reference starts with JOB- this
 * page takes over, otherwise the original page renders untouched.
 */
export function JobsPaymentGate({ fallback }: { fallback: ReactNode }) {
  const [params] = useSearchParams();
  const ref = params.get("tx_ref") || params.get("reference") || params.get("trxref") || "";
  if (ref.startsWith("DLV-")) {  // oam-deliveries: delivery card payments
    window.location.replace(`/deliveries/payment-return?${params.toString()}`);
    return null;
  }
  return ref.startsWith("JOB-") ? <JobsPaymentReturn /> : <>{fallback}</>;
}

type Phase = "working" | "success" | "pending" | "failed" | "error";

export default function JobsPaymentReturn() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const reference = params.get("tx_ref") || params.get("reference") || params.get("trxref") || "";
  const cancelled = (params.get("status") || "").toLowerCase() === "cancelled";
  const [phase, setPhase] = useState<Phase>("working");
  const [payment, setPayment] = useState<JobPayment | null>(null);

  useEffect(() => {
    let active = true;
    let tries = 0;
    async function run() {
      if (!reference) return setPhase("error");
      if (cancelled) return setPhase("failed");
      try {
        const p = await jobsApi.verifyPayment(reference);
        if (!active) return;
        setPayment(p);
        qc.invalidateQueries({ queryKey: ["jobs"] });
        if (p.status === "paid") setPhase("success");
        else if (p.status === "failed") setPhase("failed");
        else if (++tries < 5) window.setTimeout(run, 3000);   // gateway still settling
        else setPhase("pending");
      } catch {
        if (active) setPhase("error");
      }
    }
    run();
    return () => { active = false; };
  }, [reference, cancelled, qc]);

  const what = payment?.purpose === "plan"
    ? t("jobs.jobsPaymentReturn.yourPlanPlanIsActive", { plan: payment.plan })
    : payment?.purpose === "job_credit"
    ? t("jobs.jobsPaymentReturn.creditsAdded", { count: payment.quantity })
    : payment?.purpose === "boost"
    ? t("jobs.jobsPaymentReturn.boosted", { job: payment.job_title, days: payment.days })
    : "";

  return (
    <div className="min-h-screen bg-mist">
      <AppHeader />
      <main className="mx-auto max-w-md px-5 pb-12 pt-4">
        <div className="mb-4"><BackToDashboard /></div>
        <div className="rounded-2xl border border-hairline bg-paper p-8 text-center">
          {phase === "working" ? (
            <>
              <Loader2 size={44} className="mx-auto animate-spin text-brand-green" />
              <h1 className="mt-4 font-display text-xl font-semibold text-ink">{t("jobs.jobsPaymentReturn.confirmingYourPayment")}</h1>
            </>
          ) : (
            <>
              {phase === "success" ? <CheckCircle2 size={48} strokeWidth={1.5} className="mx-auto text-brand-green" />
                : phase === "pending" ? <Clock size={48} strokeWidth={1.5} className="mx-auto text-warn" />
                : <XCircle size={48} strokeWidth={1.5} className="mx-auto text-danger" />}
              <h1 className="mt-4 font-display text-xl font-semibold text-ink">
                {phase === "success" ? t("jobs.jobsPaymentReturn.paymentSuccessful") : phase === "pending" ? t("jobs.jobsPaymentReturn.paymentReceived")
                  : phase === "failed" ? t("jobs.jobsPaymentReturn.paymentNotCompleted") : t("jobs.jobsPaymentReturn.couldnTConfirmPayment")}
              </h1>
              <p className="mt-1 text-[14px] text-muted">
                {phase === "success" ? what
                  : phase === "pending" ? t("jobs.jobsPaymentReturn.itSStillConfirmingYour")
                  : phase === "failed" ? t("jobs.jobsPaymentReturn.youHaveNotBeenCharged")
                  : t("jobs.jobsPaymentReturn.ifYouWereChargedIt")}
              </p>
              <p className="mt-4 font-mono text-[11px] text-muted">{reference}</p>
            </>
          )}
          <button onClick={() => navigate("/jobs/employer")}
                  className="mt-6 h-11 w-full rounded-lg bg-brand-green text-[14px] font-medium text-white hover:brightness-95">
            {t("jobs.jobsPaymentReturn.backToHiringDashboard")}
          </button>
        </div>
      </main>
    </div>
  );
}
