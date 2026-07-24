import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";
import AppHeader from "../../components/AppHeader";
import { cardCheckoutApi, type CardCheckout } from "../../services/billing";

/**
 * Paystack returns here after a CARD service payment. We verify the payment and
 * the backend delivers the service automatically. Polls briefly, because the
 * webhook may deliver a moment after the redirect.
 */
export default function ServiceCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const reference = params.get("reference") || params.get("trxref") || "";

  const [checkout, setCheckout] = useState<CardCheckout | null>(null);
  const [state, setState] = useState<"working" | "done" | "error">("working");

  useEffect(() => {
    let active = true;
    let tries = 0;

    if (!reference) {
      setState("error");
      return;
    }

    async function poll() {
      try {
        const result = await cardCheckoutApi.status(reference);
        if (!active) return;
        setCheckout(result);

        // delivered, or clearly finished -> stop
        if (result.status === "delivered" || result.status === "failed") {
          setState("done");
          queryClient.invalidateQueries({ queryKey: ["wallet"] });
          return;
        }
        // payment landed but delivery still settling -> poll a few times
        if (tries < 5) {
          tries += 1;
          setTimeout(poll, 2000);
        } else {
          setState("done");
          queryClient.invalidateQueries({ queryKey: ["wallet"] });
        }
      } catch {
        if (active) setState("error");
      }
    }
    poll();

    return () => {
      active = false;
    };
  }, [reference, queryClient]);

  const delivered = checkout?.status === "delivered";
  const pendingDelivery = checkout?.status === "payment_received";

  return (
    <div className="min-h-screen bg-mist">
      <AppHeader />
      <main className="mx-auto max-w-md px-5 py-12">
        <div className="rounded-2xl border border-hairline bg-paper p-8 text-center">
          {state === "working" && (
            <>
              <Loader2 size={44} strokeWidth={1.75} className="mx-auto animate-spin text-brand-green" />
              <h1 className="mt-4 font-display text-xl font-semibold text-ink">Completing your purchase…</h1>
              <p className="mt-1 text-[14px] text-muted">Confirming payment and delivering your service.</p>
            </>
          )}

          {state === "done" && (
            <>
              {delivered ? (
                <CheckCircle2 size={48} strokeWidth={1.5} className="mx-auto text-brand-green" />
              ) : pendingDelivery ? (
                <Clock size={48} strokeWidth={1.5} className="mx-auto text-warn" />
              ) : (
                <XCircle size={48} strokeWidth={1.5} className="mx-auto text-danger" />
              )}
              <h1 className="mt-4 font-display text-xl font-semibold text-ink">
                {delivered ? "Purchase successful!" : pendingDelivery ? "Payment received" : "Purchase failed"}
              </h1>
              <p className="mt-1 text-[14px] text-muted">
                {delivered
                  ? `₦${Number(checkout?.amount ?? 0).toLocaleString()} ${checkout?.category} delivered to ${checkout?.recipient}.`
                  : pendingDelivery
                  ? "We've received your payment and are still confirming delivery. The amount is safe in your wallet if it doesn't complete."
                  : checkout?.failure_reason || "Your payment could not be completed."}
              </p>

              {checkout && (
                <div className="mt-5 rounded-xl bg-mist p-3 text-left text-[12.5px] text-muted">
                  <div className="flex justify-between"><span>Status</span><span className="font-medium text-ink">{checkout.status}</span></div>
                  <div className="mt-1 flex justify-between">
                    <span>Reference</span>
                    <span className="font-mono text-[11px] text-ink">{checkout.order_reference || checkout.funding_reference}</span>
                  </div>
                </div>
              )}
            </>
          )}

          {state === "error" && (
            <>
              <XCircle size={48} strokeWidth={1.5} className="mx-auto text-danger" />
              <h1 className="mt-4 font-display text-xl font-semibold text-ink">Couldn't confirm</h1>
              <p className="mt-1 text-[14px] text-muted">
                If you were charged, the amount is safe in your wallet. Check your dashboard.
              </p>
            </>
          )}

          <div className="mt-6 flex gap-2">
            <button
              onClick={() => navigate("/services/airtime")}
              className="h-11 flex-1 rounded-lg border border-hairline bg-paper text-[14px] font-medium text-ink transition hover:bg-mist"
            >
              Buy again
            </button>
            <button
              onClick={() => navigate("/dashboard")}
              className="h-11 flex-1 rounded-lg bg-brand-green text-[14px] font-medium text-white transition hover:brightness-95"
            >
              Dashboard
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
