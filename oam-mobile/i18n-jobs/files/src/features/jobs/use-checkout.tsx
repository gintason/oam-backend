import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiErrorMessage } from "@/shared/api";
import { jobsApi, type JobPayment } from "./api";
import { JobsCheckoutModal } from "./ui/CheckoutModal";
import { useTranslation } from "react-i18next";
import { planLabel } from "@/features/jobs/i18n";
import i18n from "i18next";

export type CheckoutOutcome =
  | { kind: "success"; payment: JobPayment; message: string }
  | { kind: "pending" | "failed" | "error"; message: string };

type Body = Parameters<typeof jobsApi.checkout>[0];

function describe(p: JobPayment): string {
  if (p.purpose === "plan") return i18n.t("jobs.useCheckout.planActive", { plan: planLabel(p.plan) });
  if (p.purpose === "job_credit") return i18n.t("jobs.useCheckout.creditsAdded", { count: p.quantity });
  return i18n.t("jobs.useCheckout.boosted", { job: p.job_title ?? i18n.t("jobs.useCheckout.yourJob"), days: p.days });
}

/**
 * Runs a jobs payment end to end: create the Flutterwave checkout, show it in
 * the in-app WebView, then verify with the backend (polling briefly while the
 * gateway settles). Render `modal` somewhere in the screen.
 */
export function useJobsCheckout() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);   // which button is loading
  const [verifying, setVerifying] = useState(false);
  const [outcome, setOutcome] = useState<CheckoutOutcome | null>(null);
  const refRef = useRef<string | null>(null);
  const doneRef = useRef(false);

  async function start(body: Body, key: string = body.purpose) {
    setOutcome(null);
    setBusy(key);
    try {
      const p = await jobsApi.checkout(body);
      refRef.current = p.reference;
      doneRef.current = false;
      setUrl(p.authorization_url);
    } catch (err) {
      setOutcome({ kind: "error", message: apiErrorMessage(err, t("jobs.useCheckout.couldnTStartThePayment")) });
    } finally {
      setBusy(null);
    }
  }

  async function verify(reference: string) {
    setVerifying(true);
    try {
      for (let i = 0; i < 5; i++) {
        const p = await jobsApi.verifyPayment(reference);
        if (p.status === "paid") {
          qc.invalidateQueries({ queryKey: ["jobs"] });
          setOutcome({ kind: "success", payment: p, message: describe(p) });
          return;
        }
        if (p.status === "failed") {
          setOutcome({ kind: "failed", message: t("jobs.useCheckout.paymentNotCompletedYouHave") });
          return;
        }
        await new Promise((r) => setTimeout(r, 3000));
      }
      setOutcome({ kind: "pending", message: t("jobs.useCheckout.paymentReceivedItWillApply") });
    } catch {
      setOutcome({ kind: "pending", message: t("jobs.useCheckout.weCouldnTConfirmJust") });
    } finally {
      setVerifying(false);
    }
  }

  function onComplete(returnUrl: string) {
    if (doneRef.current) return;          // WebView can report the return twice
    doneRef.current = true;
    setUrl(null);
    const status = /[?&]status=([^&]+)/.exec(returnUrl)?.[1]?.toLowerCase();
    if (status === "cancelled") {
      setOutcome({ kind: "failed", message: t("jobs.useCheckout.paymentCancelledYouHaveNot") });
      return;
    }
    if (refRef.current) verify(refRef.current);
  }

  const modal = (
    <JobsCheckoutModal
      url={url}
      onComplete={onComplete}
      onCancel={() => {
        setUrl(null);
        if (refRef.current && !doneRef.current) {
          doneRef.current = true;
          verify(refRef.current);        // they may have paid before closing
        }
      }}
    />
  );

  return { start, busy, verifying, outcome, clear: () => setOutcome(null), modal };
}
