import { useEffect, useState } from "react";
import { CheckCircle2, Copy, Download, Loader2, XCircle } from "lucide-react";
import { billingApi, type BillOrder } from "../../services/billing";

/**
 * Result screen for Education (exam PINs) and ePIN (recharge-card packs).
 * Keeps checking a "processing" order until VTU.ng confirms, then shows the
 * PINs / card images. Wallet money is refunded automatically if it fails.
 */
export default function BillPins({ order: initial, title, onAgain, onDone }: {
  order: BillOrder; title: string; onAgain: () => void; onDone: () => void;
}) {
  const [order, setOrder] = useState<BillOrder>(initial);
  const status = String(order.status).toLowerCase();
  const pending = status === "pending" || status === "processing";
  const ok = status === "success";
  const waitingForPins = ok && order.category === "education" && !(order.pins?.length);

  useEffect(() => {
    if (!pending && !waitingForPins) return;
    let alive = true;
    let n = 0;
    const t = setInterval(async () => {
      n += 1;
      try {
        const fresh = await billingApi.refreshOrder(order.reference);
        if (alive) setOrder(fresh);
      } catch { /* keep trying */ }
      if (n >= 40) clearInterval(t);
    }, 2500);
    return () => { alive = false; clearInterval(t); };
  }, [pending, waitingForPins, order.reference]);

  const copy = (text: string) => { try { void navigator.clipboard.writeText(text); } catch { /* ignore */ } };

  return (
    <div className="min-h-screen bg-mist">
      <main className="mx-auto max-w-md px-5 py-10">
        <div className="rounded-2xl border border-hairline bg-paper p-6 text-center">
          {pending || waitingForPins ? (
            <Loader2 size={40} className="mx-auto animate-spin text-brand-green" />
          ) : ok ? (
            <CheckCircle2 size={44} className="mx-auto text-brand-green" />
          ) : (
            <XCircle size={44} className="mx-auto text-danger" />
          )}
          <h1 className="mt-3 font-display text-xl font-semibold text-ink">
            {pending || waitingForPins ? "Purchase in progress" : ok ? title : "Purchase failed"}
          </h1>
          <p className="mt-1 text-[13.5px] text-muted">
            {pending || waitingForPins
              ? "Hold on — this usually takes a few seconds."
              : ok
              ? `₦${Number(order.amount).toLocaleString()} · ${order.biller_name}${order.plan_name ? ` · ${order.plan_name}` : ""}`
              : "Your money is back in your O.A.M wallet."}
          </p>

          {ok && (order.pins?.length ?? 0) > 0 && (
            <div className="mt-5 space-y-2 text-left">
              {order.pins!.map((p, i) => (
                <div key={i} className="rounded-xl border border-hairline bg-mist p-3">
                  {p.serial && <p className="text-[12px] text-muted">Serial: <span className="font-mono text-ink">{p.serial}</span></p>}
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <p className="font-mono text-[16px] font-semibold tracking-wide text-ink">{p.pin}</p>
                    <button type="button" onClick={() => copy(p.pin)} className="inline-flex items-center gap-1 text-[12.5px] font-medium text-brand-green">
                      <Copy size={14} /> Copy
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {ok && (order.epin_cards?.length ?? 0) > 0 && (
            <div className="mt-5 space-y-3 text-left">
              {order.epin_cards!.map((c, i) => (
                <div key={c.id || i} className="rounded-xl border border-hairline bg-mist p-3">
                  <p className="mb-2 text-[13px] font-semibold text-ink">
                    {c.network} ₦{Number(c.denomination).toLocaleString()} × {c.pieces_count} cards
                  </p>
                  {c.image_url ? (
                    <>
                      <img src={c.image_url} alt={`${c.network} recharge cards`} className="w-full rounded-lg border border-hairline bg-white" />
                      <a href={c.image_url} download={`oam-epin-${c.network}-${c.denomination}-${i + 1}.webp`}
                         className="mt-2 inline-flex items-center gap-1 text-[13px] font-medium text-brand-green">
                        <Download size={14} /> Download / print
                      </a>
                    </>
                  ) : (
                    <p className="text-[12.5px] text-muted">Open this order from your order history to view the cards.</p>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 flex gap-3">
            <button onClick={onAgain} className="h-11 flex-1 rounded-[11px] border border-hairline bg-paper text-[14px] font-medium text-ink">Buy again</button>
            <button onClick={onDone} className="h-11 flex-1 rounded-[11px] bg-brand-red text-[14px] font-semibold text-white">Done</button>
          </div>
          <p className="mt-4 text-[11.5px] text-muted">Reference: <span className="font-mono">{order.reference}</span></p>
        </div>
      </main>
    </div>
  );
}
