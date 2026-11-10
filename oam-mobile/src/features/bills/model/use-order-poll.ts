import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { BillOrder } from "@/entities/billing";
import { billsApi } from "../api/bills-api";

const WAITING = ["pending", "processing"];

/**
 * While a bill order is still "processing", ask the server to re-check it every
 * 2 seconds (for up to a minute) and update the screen, so the customer sees
 * "Successful" (and the electricity token) as soon as the provider confirms.
 */
export function useOrderPoll(order: BillOrder | null, setOrder: (o: BillOrder) => void, everyMs = 2000, tries = 30) {
  const qc = useQueryClient();
  const set = useRef(setOrder);
  set.current = setOrder;
  const ref = order?.reference;
  const waiting = Boolean(order && WAITING.includes(String(order.status).toLowerCase()));
  const needsToken = Boolean(order && String(order.status).toLowerCase() === "success" &&
    order.category === "electricity" && String(order.meter_type ?? "").toLowerCase() !== "postpaid" && !order.token);

  useEffect(() => {
    if (!ref || !(waiting || needsToken)) return;
    let n = 0;
    let stopped = false;
    const timer = setInterval(async () => {
      n += 1;
      try {
        const fresh = await billsApi.refreshOrder(ref);
        if (stopped) return;
        set.current(fresh);
        const s = String(fresh.status).toLowerCase();
        const done = !WAITING.includes(s) &&
          !(s === "success" && fresh.category === "electricity" &&
            String(fresh.meter_type ?? "").toLowerCase() !== "postpaid" && !fresh.token);
        if (done) {
          stopped = true;
          clearInterval(timer);
          qc.invalidateQueries({ queryKey: ["wallets"] });
          qc.invalidateQueries({ queryKey: ["transactions"] });
        }
      } catch { /* keep trying */ }
      if (n >= tries && !stopped) { stopped = true; clearInterval(timer); }
    }, everyMs);
    return () => { stopped = true; clearInterval(timer); };
  }, [ref, waiting, needsToken, everyMs, tries, qc]);
}
