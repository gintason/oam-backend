import { useEffect, useState } from "react";
import { CheckCircle2, Clock, Copy, Loader2, XCircle } from "lucide-react";
import { tradeApi, TRADE_STATUS_LABEL, type TradeOrder } from "../../services/trade";

/** One trade: keeps checking while it's open, shows codes / payout / reason. */
export function TradeResult({ order: initial, onClose }: { order: TradeOrder; onClose: () => void }) {
  const [order, setOrder] = useState(initial);
  const open = order.status === "pending" || order.status === "processing";
  const needCodes = order.kind === "giftcard_buy" && order.status === "success" && !(order.codes?.length);
  useEffect(() => {
    if (!open && !needCodes) return;
    let alive = true;
    const t = setInterval(async () => {
      try { const o = await tradeApi.order(order.reference); if (alive) setOrder(o); } catch { /* keep trying */ }
    }, order.kind === "giftcard_sell" ? 15000 : 3000);
    return () => { alive = false; clearInterval(t); };
  }, [open, needCodes, order.reference, order.kind]);

  const icon = order.status === "success" ? <CheckCircle2 size={42} className="mx-auto text-brand-green" />
    : order.status === "failed" || order.status === "cancelled" ? <XCircle size={42} className="mx-auto text-danger" />
    : order.kind === "giftcard_sell" ? <Clock size={42} className="mx-auto text-warn" />
    : <Loader2 size={40} className="mx-auto animate-spin text-brand-green" />;
  const sell = order.kind === "giftcard_sell";
  return (
    <div className="rounded-2xl border border-hairline bg-paper p-6 text-center">
      {icon}
      <h2 className="mt-3 font-display text-lg font-semibold text-ink">{order.title}</h2>
      <p className="mt-1 text-[13.5px] text-muted">
        {TRADE_STATUS_LABEL[order.status]} · {sell ? "You get" : "You paid"} ₦{Number(order.amount).toLocaleString()}
      </p>
      {sell && order.status === "pending" && (
        <p className="mt-2 text-[12.5px] text-muted">Our partner is checking your card. This can take a few minutes to a few hours — we'll notify you and credit your wallet once it's approved.</p>
      )}
      {order.failure_reason && <p className="mt-2 text-[12.5px] text-danger">{order.failure_reason}</p>}
      {(order.codes?.length ?? 0) > 0 && (
        <div className="mt-4 space-y-2 text-left">
          {order.codes.map((c, i) => (
            <div key={i} className="rounded-xl border border-hairline bg-mist p-3 text-[13px]">
              {Object.entries(c).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-2">
                  <span className="text-muted">{k.replace(/_/g, " ")}</span>
                  <span className="flex items-center gap-2 font-mono font-semibold text-ink">{String(v)}
                    <button type="button" onClick={() => { try { void navigator.clipboard.writeText(String(v)); } catch { /* */ } }} className="text-brand-green"><Copy size={13} /></button>
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
      <button onClick={onClose} className="mt-5 h-11 w-full rounded-[11px] bg-brand-red text-[14px] font-semibold text-white">Done</button>
      <p className="mt-3 text-[11.5px] text-muted">Reference: <span className="font-mono">{order.reference}</span></p>
    </div>
  );
}

export function TradeHistory({ kind, onOpen }: { kind?: string; onOpen: (o: TradeOrder) => void }) {
  const [rows, setRows] = useState<TradeOrder[] | null>(null);
  useEffect(() => { tradeApi.orders(kind).then(setRows).catch(() => setRows([])); }, [kind]);
  if (rows === null) return <div className="h-16 animate-pulse rounded-xl bg-hairline/60" />;
  if (!rows.length) return <p className="text-[13px] text-muted">No trades yet.</p>;
  return (
    <div className="divide-y divide-hairline rounded-2xl border border-hairline bg-paper">
      {rows.map((o) => (
        <button key={o.id} onClick={() => onOpen(o)} className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-mist">
          <span className="min-w-0"><span className="block truncate text-[13.5px] font-medium text-ink">{o.title}</span>
            <span className="text-[12px] text-muted">{new Date(o.created_at).toLocaleString()}</span></span>
          <span className="ml-3 shrink-0 text-right"><span className="block text-[13.5px] font-semibold text-ink">₦{Number(o.amount).toLocaleString()}</span>
            <span className="text-[11.5px] text-muted">{TRADE_STATUS_LABEL[o.status]}</span></span>
        </button>
      ))}
    </div>
  );
}

export const CURRENCY_BY_COUNTRY: Record<string, string> = {
  US: "USD", GB: "GBP", EU: "EUR", DE: "EUR", FR: "EUR", IT: "EUR", ES: "EUR", NL: "EUR", BE: "EUR", AT: "EUR", IE: "EUR",
  FI: "EUR", PT: "EUR", GR: "EUR", CA: "CAD", AU: "AUD", NZ: "NZD", CH: "CHF", SE: "SEK", NO: "NOK", DK: "DKK",
  PL: "PLN", JP: "JPY", SG: "SGD", MY: "MYR", BR: "BRL", TR: "TRY",
};
