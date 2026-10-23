import { useEffect, useRef } from "react";
import { payoutsApi, type Withdrawal } from "../services/payouts";

const FINAL = ["success", "failed", "reversed", "cancelled"];

/**
 * After a bank transfer comes back "processing", check it every few seconds
 * (the backend re-asks the payout provider) and report once it settles, so the
 * receipt can flip from "Transfer Processing" to "Successful Transaction".
 * Stops after ~1 minute; the wallet history catches up later either way.
 */
export function useWithdrawalPoll(id: string | null, onFinal: (w: Withdrawal) => void, everyMs = 3000, tries = 20) {
  const cb = useRef(onFinal);
  cb.current = onFinal;

  useEffect(() => {
    if (!id) return;
    let n = 0;
    let stopped = false;
    const timer = setInterval(async () => {
      n += 1;
      try {
        const w = await payoutsApi.get(id);
        if (!stopped && FINAL.includes(String(w.status))) {
          stopped = true;
          clearInterval(timer);
          cb.current(w);
          return;
        }
      } catch {
        /* keep trying */
      }
      if (n >= tries) clearInterval(timer);
    }, everyMs);
    return () => { stopped = true; clearInterval(timer); };
  }, [id, everyMs, tries]);
}
