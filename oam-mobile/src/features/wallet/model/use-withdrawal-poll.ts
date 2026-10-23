import { useEffect, useRef } from "react";
import { payoutsApi, type Withdrawal } from "../api/payouts-api";

const FINAL = ["success", "failed", "reversed", "cancelled"];

/**
 * After a bank transfer comes back "processing", check it every few seconds
 * (the backend re-asks the payout provider) and report once it settles, so the
 * receipt is only shown once the bank has confirmed. Gives up after ~1 minute
 * (onTimeout); the wallet history catches up later either way.
 */
export function useWithdrawalPoll(id: string | null, onFinal: (w: Withdrawal) => void,
                                  onTimeout?: () => void, everyMs = 2000, tries = 30) {
  const cb = useRef(onFinal);
  cb.current = onFinal;
  const late = useRef(onTimeout);
  late.current = onTimeout;

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
      if (n >= tries && !stopped) {
        stopped = true;
        clearInterval(timer);
        late.current?.();
      }
    }, everyMs);
    return () => { stopped = true; clearInterval(timer); };
  }, [id, everyMs, tries]);
}
