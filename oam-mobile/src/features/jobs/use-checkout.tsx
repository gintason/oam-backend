import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiErrorMessage } from "@/shared/api";
import { jobsApi, type JobPayment } from "./api";
import { JobsCheckoutModal } from "./ui/CheckoutModal";

export type CheckoutOutcome =
  | { kind: "success"; payment: JobPayment; message: string }
  | { kind: "pending" | "failed" | "error"; message: string };

type Body = Parameters<typeof jobsApi.checkout>[0];

function describe(p: JobPayment): string {
  if (p.purpose === "plan") return `Your ${p.plan} plan is active.`;
  if (p.purpose === "job_credit") return `${p.quantity} job credit${p.quantity > 1 ? "s" : ""} added — publish a job to use ${p.quantity > 1 ? "them" : "it"}.`;
  return `“${p.job_title ?? "Your job"}” is boosted for ${p.days} days.`;
}

/**
 * Runs a jobs payment end to end: create the Flutterwave checkout, show it in
 * the in-app WebView, then verify with the backend (polling briefly while the
 * gateway settles). Render `modal` somewhere in the screen.
 */
export function useJobsCheckout() {
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
      setOutcome({ kind: "error", message: apiErrorMessage(err, "Couldn't start the payment.") });
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
          setOutcome({ kind: "failed", message: "Payment not completed. You have not been charged." });
          return;
        }
        await new Promise((r) => setTimeout(r, 3000));
      }
      setOutcome({ kind: "pending", message: "Payment received — it will apply in a few minutes." });
    } catch {
      setOutcome({ kind: "pending", message: "We couldn't confirm just yet. If you were charged, it will apply shortly." });
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
      setOutcome({ kind: "failed", message: "Payment cancelled. You have not been charged." });
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
