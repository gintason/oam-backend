import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import AppHeader from "../../components/AppHeader";
import { paymentsApi, type FundVerifyResponse } from "../../services/payments";

/**
 * Paystack redirects here after payment. We read the reference from the URL
 * (Paystack appends ?reference= or ?trxref=), verify it, and refresh the wallet.
 * Note: the backend webhook also credits the wallet server-side, so funds settle
 * even if the user closes this page — this screen is the friendly confirmation.
 */
export default function FundCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const reference = params.get("reference") || params.get("trxref") || "";

  const [state, setState] = useState<"verifying" | "done" | "error">("verifying");
  const [txn, setTxn] = useState<FundVerifyResponse | null>(null);

  useEffect(() => {
    let active = true;
    if (!reference) {
      setState("error");
      return;
    }
    (async () => {
      try {
        const result = await paymentsApi.verifyFunding(reference);
        if (!active) return;
        setTxn(result);
        setState("done");
        // refresh wallet balance + transactions on the dashboard
        queryClient.invalidateQueries({ queryKey: ["wallet"] });
      } catch {
        if (active) setState("error");
      }
    })();
    return () => {
      active = false;
    };
  }, [reference, queryClient]);

  const success = txn?.status === "success";

  return (
    <div className="min-h-screen bg-mist">
      <AppHeader />
      <main className="mx-auto max-w-md px-5 py-12">
        <div className="rounded-2xl border border-hairline bg-paper p-8 text-center">
          {state === "verifying" && (
            <>
              <Loader2 size={44} strokeWidth={1.75} className="mx-auto animate-spin text-brand-green" />
              <h1 className="mt-4 font-display text-xl font-semibold text-ink">Confirming your payment…</h1>
              <p className="mt-1 text-[14px] text-muted">Just a moment.</p>
            </>
          )}

          {state === "done" && (
            <>
              {success ? (
                <CheckCircle2 size={48} strokeWidth={1.5} className="mx-auto text-brand-green" />
              ) : (
                <XCircle size={48} strokeWidth={1.5} className="mx-auto text-warn" />
              )}
              <h1 className="mt-4 font-display text-xl font-semibold text-ink">
                {success ? "Wallet funded!" : "Payment pending"}
              </h1>
              <p className="mt-1 text-[14px] text-muted">
                {success
                  ? `₦${Number(txn?.amount ?? 0).toLocaleString()} has been added to your wallet.`
                  : "We haven't confirmed this payment yet. If you were charged, it'll reflect shortly."}
              </p>
            </>
          )}

          {state === "error" && (
            <>
              <XCircle size={48} strokeWidth={1.5} className="mx-auto text-danger" />
              <h1 className="mt-4 font-display text-xl font-semibold text-ink">Couldn't confirm payment</h1>
              <p className="mt-1 text-[14px] text-muted">
                If you completed payment, your wallet will still be credited automatically. Check your balance in a moment.
              </p>
            </>
          )}

          <div className="mt-6 flex gap-2">
            <button
              onClick={() => navigate("/wallet/fund")}
              className="h-11 flex-1 rounded-lg border border-hairline bg-paper text-[14px] font-medium text-ink transition hover:bg-mist"
            >
              Fund again
            </button>
            <button
              onClick={() => navigate("/dashboard")}
              className="h-11 flex-1 rounded-lg bg-brand-green text-[14px] font-medium text-white transition hover:brightness-95"
            >
              Go to dashboard
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
