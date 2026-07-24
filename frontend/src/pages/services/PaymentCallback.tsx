import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";
import AppHeader from "../../components/AppHeader";
import { billingApi, cardCheckoutApi, type CardCheckout, type BillOrder } from "../../services/billing";
import TokenCard from "../../components/TokenCard";
import { paymentsApi, type FundVerifyResponse } from "../../services/payments";

/**
 * Single return page for ALL Paystack payments.
 * Paystack sends every payment back to one callback URL, so this page works out
 * which kind it was: first it asks the card-checkout endpoint — a service bought
 * with a card. If that 404s, it treats it as a wallet funding and verifies that.
 */
type Kind = "card" | "fund" | null;

export default function PaymentCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const reference = params.get("reference") || params.get("trxref") || "";

  const [kind, setKind] = useState<Kind>(null);
  const [checkout, setCheckout] = useState<CardCheckout | null>(null);
  const [order, setOrder] = useState<BillOrder | null>(null);
  const [funding, setFunding] = useState<FundVerifyResponse | null>(null);
  const [state, setState] = useState<"working" | "done" | "error">("working");

  useEffect(() => {
    let active = true;
    let tries = 0;

    if (!reference) {
      setState("error");
      return;
    }

    async function resolve() {
      // First: is it a card-paid service?
      try {
        const result = await cardCheckoutApi.status(reference);
        if (!active) return;
        setKind("card");
        setCheckout(result);

        if (result.status === "delivered" || result.status === "failed") {
          // The token lives on the underlying bill order, not the checkout.
          if (result.order_reference) {
            try {
              const o = await billingApi.getOrder(result.order_reference);
              if (active) setOrder(o);
            } catch {
              /* receipt still available in Order history */
            }
          }
          setState("done");
          queryClient.invalidateQueries({ queryKey: ["wallet"] });
          queryClient.invalidateQueries({ queryKey: ["bill-orders"] });
          return;
        }
        if (tries < 5) {
          tries += 1;
          setTimeout(resolve, 2000); // delivery may settle a moment later
          return;
        }
        setState("done");
        queryClient.invalidateQueries({ queryKey: ["wallet"] });
        return;
      } catch {
        // not a card checkout — fall through to wallet funding
      }

      // Otherwise: treat it as wallet funding.
      try {
        const result = await paymentsApi.verifyFunding(reference);
        if (!active) return;
        setKind("fund");
        setFunding(result);
        setState("done");
        queryClient.invalidateQueries({ queryKey: ["wallet"] });
      } catch {
        if (active) setState("error");
      }
    }

    resolve();
    return () => {
      active = false;
    };
  }, [reference, queryClient]);

  const delivered = kind === "card" && checkout?.status === "delivered";
  const pendingDelivery = kind === "card" && checkout?.status === "payment_received";
  const funded = kind === "fund" && funding?.status === "success";

  const success = delivered || funded;
  const warn = pendingDelivery || (kind === "fund" && funding?.status === "pending");

  return (
    <div className="min-h-screen bg-mist">
      <AppHeader />
      <main className="mx-auto max-w-md px-5 py-12">
        <div className="rounded-2xl border border-hairline bg-paper p-8 text-center">
          {state === "working" && (
            <>
              <Loader2 size={44} strokeWidth={1.75} className="mx-auto animate-spin text-brand-green" />
              <h1 className="mt-4 font-display text-xl font-semibold text-ink">Confirming your payment…</h1>
              <p className="mt-1 text-[14px] text-muted">This only takes a moment.</p>
            </>
          )}

          {state === "done" && (
            <>
              {success ? (
                <CheckCircle2 size={48} strokeWidth={1.5} className="mx-auto text-brand-green" />
              ) : warn ? (
                <Clock size={48} strokeWidth={1.5} className="mx-auto text-warn" />
              ) : (
                <XCircle size={48} strokeWidth={1.5} className="mx-auto text-danger" />
              )}

              <h1 className="mt-4 font-display text-xl font-semibold text-ink">
                {delivered
                  ? "Purchase successful!"
                  : funded
                  ? "Wallet funded!"
                  : warn
                  ? "Payment received"
                  : "Payment not completed"}
              </h1>

              <p className="mt-1 text-[14px] text-muted">
                {delivered
                  ? `₦${Number(checkout?.amount ?? 0).toLocaleString()} ${checkout?.category} delivered to ${checkout?.recipient}.`
                  : funded
                  ? `₦${Number(funding?.amount ?? 0).toLocaleString()} has been added to your wallet.`
                  : pendingDelivery
                  ? "Payment confirmed. We're completing delivery now — if it doesn't finish, the money stays in your wallet and you can retry."
                  : checkout?.failure_reason || "If you were charged, the amount is safe in your wallet."}
              </p>

              {order?.token && (
                <div className="mt-5">
                  <TokenCard token={order.token} units={order.units} />
                </div>
              )}

              {!order?.token && checkout?.category === "electricity" && !delivered && (
                <div className="mt-5 rounded-xl border border-warn/30 bg-warn/5 p-4 text-left">
                  <p className="text-[13px] font-semibold text-ink">Where's my token?</p>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
                    Your provider issues the token once delivery completes — usually within
                    a few minutes. It will appear <span className="font-medium text-ink">on this page</span> and
                    in <span className="font-medium text-ink">Order history</span>, both of which
                    refresh on their own. You don't need to buy again.
                  </p>
                  <button
                    onClick={() => navigate("/orders")}
                    className="mt-3 h-10 w-full rounded-lg bg-brand-green text-[13px] font-semibold text-white transition hover:brightness-95"
                  >
                    Open Order history
                  </button>
                </div>
              )}

              {delivered && !order?.token && checkout?.category === "electricity" && (
                <p className="mt-4 rounded-lg border border-warn/30 bg-warn/5 px-3.5 py-2.5 text-[12.5px] text-warn">
                  Your token hasn't arrived from the provider yet. It appears in
                  Order history automatically — usually within a minute.
                </p>
              )}

              {(checkout || funding) && (
                <div className="mt-5 rounded-xl bg-mist p-3 text-left text-[12.5px] text-muted">
                  <div className="flex justify-between">
                    <span>Status</span>
                    <span className="font-medium text-ink">{checkout?.status ?? funding?.status}</span>
                  </div>
                  <div className="mt-1 flex justify-between">
                    <span>Reference</span>
                    <span className="font-mono text-[11px] text-ink">
                      {checkout?.order_reference || checkout?.funding_reference || funding?.internal_reference}
                    </span>
                  </div>
                </div>
              )}
            </>
          )}

          {state === "error" && (
            <>
              <XCircle size={48} strokeWidth={1.5} className="mx-auto text-danger" />
              <h1 className="mt-4 font-display text-xl font-semibold text-ink">Couldn't confirm payment</h1>
              <p className="mt-1 text-[14px] text-muted">
                If you were charged, the amount is safe in your wallet. Check your dashboard in a moment.
              </p>
            </>
          )}

          <div className="mt-6 flex gap-2">
            <button
              onClick={() => navigate("/dashboard")}
              className="h-11 flex-1 rounded-lg border border-hairline bg-paper text-[14px] font-medium text-ink transition hover:bg-mist"
            >
              Dashboard
            </button>
            <button
              onClick={() => navigate(kind === "fund" ? "/wallet/fund" : "/orders")}
              className="h-11 flex-1 rounded-lg bg-brand-green text-[14px] font-medium text-white transition hover:brightness-95"
            >
              {kind === "fund" ? "Fund again" : "View order & token"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
