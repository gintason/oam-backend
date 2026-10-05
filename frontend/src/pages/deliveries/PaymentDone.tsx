import { CheckCircle2, XCircle } from "lucide-react";
import { useSearchParams } from "react-router-dom";

/**
 * /pay/done — public page Flutterwave returns to after a pay-on-delivery link
 * opened at the door (the payer may not have an OAM account). The rider's app
 * confirms the payment with the server; this page just closes the loop.
 */
export default function PaymentDone() {
  const [params] = useSearchParams();
  const cancelled = (params.get("status") || "").toLowerCase() === "cancelled";
  return (
    <div className="flex min-h-screen items-center justify-center bg-mist px-4">
      <div className="w-full max-w-sm rounded-2xl border border-hairline bg-paper p-8 text-center">
        {cancelled ? <XCircle size={40} className="mx-auto text-danger" /> : <CheckCircle2 size={40} className="mx-auto text-brand-green" />}
        <h1 className="mt-3 font-display text-xl font-semibold text-ink">{cancelled ? "Payment cancelled" : "Thank you!"}</h1>
        <p className="mt-2 text-[14px] text-muted">
          {cancelled ? "No money was taken. You can try again or pay the rider another way."
            : "Your payment is being confirmed. Show this screen to the rider — you can close this page."}
        </p>
        <p className="mt-4 font-mono text-[12px] text-muted">{params.get("tx_ref") || params.get("reference") || ""}</p>
      </div>
    </div>
  );
}
