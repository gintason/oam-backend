import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, XCircle } from "lucide-react";
import { deliveriesApi } from "../../services/deliveries";
import { Card, DeliveriesShell } from "../../components/deliveries/ui";

/**
 * Flutterwave sends the payer back here (?tx_ref=DLV-XXXX-1&status=…).
 * We find the delivery, ask the server to verify the charge, then open tracking.
 */
export default function DeliveryPaymentReturn() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const ref = params.get("tx_ref") || params.get("reference") || params.get("trxref") || "";
  const cancelled = (params.get("status") || "").toLowerCase() === "cancelled";
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        let id = "";
        if (ref) id = (await deliveriesApi.list({ reference: ref })).results[0]?.id ?? "";
        if (!id) { try { id = sessionStorage.getItem("oam.delivery.pending") || ""; } catch { /* ignore */ } }
        if (!id) throw new Error("We couldn't find that delivery.");
        if (!cancelled) {
          for (let i = 0; i < 4; i++) {
            const d = await deliveriesApi.verifyPayment(id);
            if (d.payment_status !== "unpaid") break;
            await new Promise((r) => setTimeout(r, 2500));
          }
        }
        try { sessionStorage.removeItem("oam.delivery.pending"); } catch { /* ignore */ }
        if (alive) navigate(`/deliveries/${id}`, { replace: true });
      } catch (e) {
        if (alive) setError((e as Error).message || "Couldn't confirm the payment.");
      }
    })();
    return () => { alive = false; };
  }, [ref, cancelled, navigate]);

  return (
    <DeliveriesShell tabs={false}>
      <Card className="mx-auto max-w-md py-10 text-center">
        {error ? (
          <>
            <XCircle size={30} className="mx-auto text-danger" />
            <p className="mt-3 text-[14px] text-ink">{error}</p>
            <Link to="/deliveries" className="mt-4 inline-block text-[13.5px] font-semibold text-brand-green">Go to my deliveries</Link>
          </>
        ) : (
          <>
            <Loader2 size={28} className="mx-auto animate-spin text-brand-green" />
            <p className="mt-3 text-[14px] text-ink">{cancelled ? "Payment cancelled — opening your delivery…" : "Confirming your payment…"}</p>
          </>
        )}
      </Card>
    </DeliveriesShell>
  );
}
