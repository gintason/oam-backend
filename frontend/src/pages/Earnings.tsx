import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ArrowDownToLine, CheckCircle2, Lock, RefreshCw, TrendingUp } from "lucide-react";
import AppHeader from "../components/AppHeader";
import { useUserScope } from "../auth/useUserScope";
import { revenueApi, type RevenueRow } from "../services/billing";
import { apiErrorMessage } from "../lib/api";

const SYMBOLS: Record<string, string> = { NGN: "₦", USD: "$", GBP: "£", EUR: "€" };
const money = (v: string | number, cur: string) =>
  `${SYMBOLS[cur.toUpperCase()] ?? ""}${Number(v).toLocaleString(undefined, {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  })}`;

/**
 * OAM platform earnings (admin only). Shows the margin earned on bill payments
 * per currency, and lets you sweep it into your own wallet.
 */
export default function Earnings() {
  const scope = useUserScope();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [sweepCur, setSweepCur] = useState<string>("NGN");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string>();
  const [done, setDone] = useState<string>();

  const revenueQuery = useQuery({
    queryKey: ["revenue"],
    queryFn: revenueApi.get,
    retry: false,
  });

  const sweep = useMutation({
    mutationFn: () => revenueApi.sweep({ currency: sweepCur, amount: Number(amount) }),
    onSuccess: (data) => {
      setError(undefined);
      setDone(`Swept to your ${data.currency} wallet. New balance: ${money(data.wallet_balance, data.currency)}`);
      setAmount("");
      queryClient.invalidateQueries({ queryKey: ["revenue"] });
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
    },
    onError: (err) => {
      setDone(undefined);
      setError(apiErrorMessage(err, "Couldn't sweep revenue."));
    },
  });

  const status = (revenueQuery.error as { response?: { status?: number } })?.response?.status;
  const forbidden = status === 403 || status === 401;

  if (forbidden) {
    return (
      <div className="min-h-screen bg-mist">
        <AppHeader />
        <main className="mx-auto max-w-md px-5 py-16 text-center">
          <Lock size={40} strokeWidth={1.5} className="mx-auto text-muted" />
          <h1 className="mt-4 font-display text-xl font-semibold text-ink">Administrators only</h1>
          <p className="mt-2 text-[14px] text-muted">
            Platform earnings are only visible to admin accounts.
          </p>
          <button onClick={() => navigate("/dashboard")} className="mt-5 rounded-lg bg-brand-green px-5 py-2.5 text-[14px] font-medium text-white">
            Back to dashboard
          </button>
        </main>
      </div>
    );
  }

  const rows = revenueQuery.data ?? [];

  return (
    <div className="min-h-screen bg-mist">
      <AppHeader />
      <main className="mx-auto max-w-4xl px-5 py-8 sm:px-6 sm:py-10">
        <div className="mb-1 flex items-center justify-between">
          <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">Earnings</h1>
          <button
            onClick={() => revenueQuery.refetch()}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-hairline bg-paper px-3 text-[13px] font-medium text-ink transition hover:bg-mist"
          >
            <RefreshCw size={14} strokeWidth={1.75} className={revenueQuery.isFetching ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
        <p className="mb-6 text-[14px] text-muted">
          Your margin on every bill payment — platform profit, kept separate from customer wallets.
          <span className="mt-1 block text-[13px]">
            <strong className="font-medium text-ink">Lifetime earned</strong> never decreases. Once you sweep,
            that money moves into your wallet, so <strong className="font-medium text-ink">available</strong> drops to zero
            until you earn more.
          </span>
        </p>

        {revenueQuery.isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-36 animate-pulse rounded-2xl bg-hairline/50" />
            ))}
          </div>
        ) : revenueQuery.isError ? (
          <div className="rounded-2xl border border-danger/20 bg-danger/[0.03] p-8 text-center">
            <p className="text-[14px] text-ink">Couldn't load earnings.</p>
            <button onClick={() => revenueQuery.refetch()} className="mt-3 rounded-lg bg-brand-green px-4 py-2 text-[13px] font-medium text-white">
              Try again
            </button>
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-hairline bg-paper p-10 text-center">
            <TrendingUp size={26} strokeWidth={1.5} className="mx-auto text-muted" />
            <h2 className="mt-3 text-[15px] font-semibold text-ink">No earnings yet</h2>
            <p className="mt-1 text-[13px] text-muted">
              Margin appears here as customers pay bills through OAM.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {rows.map((r: RevenueRow) => (
              <div key={r.currency} className="relative overflow-hidden rounded-2xl bg-[#0a0a0a] p-6 text-white">
                <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: "linear-gradient(90deg,#111 33%,#E31012 33%,#E31012 66%,#0B7327 66%)" }} aria-hidden="true" />
                <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(circle at 20% 20%, rgba(11,115,39,0.32), transparent 55%)" }} aria-hidden="true" />
                <div className="relative">
                  <span className="text-[13px] text-white/60">{r.currency} lifetime earned</span>
                  <div className="tabular mt-1 text-[30px] font-bold tracking-tight">
                    {money(r.total_earned, r.currency)}
                  </div>
                  <div className="mt-4 space-y-2.5 border-t border-white/10 pt-3">
                    <div className="flex items-baseline justify-between">
                      <span className="text-[12.5px] text-white/60">Available to move to your wallet</span>
                      <span className="tabular text-[17px] font-semibold text-[#4ade80]">
                        {money(r.available_to_sweep, r.currency)}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-[12.5px] text-white/45">Already moved to your wallet</span>
                      <span className="tabular text-[14px] font-medium text-white/70">
                        {money(
                          Math.max(Number(r.total_earned) - Number(r.available_to_sweep), 0),
                          r.currency
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Sweep */}
        {rows.length > 0 && (
          <div className="mt-8 rounded-2xl border border-hairline bg-paper p-5">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold text-ink">
              <ArrowDownToLine size={17} strokeWidth={1.75} className="text-brand-green" />
              Move earnings to your wallet
            </h2>
            <p className="mt-1 text-[13px] text-muted">
              Sweeping transfers profit into your own OAM wallet, where you can withdraw it to your bank.
            </p>

            {error && <div className="mt-4 rounded-lg border border-danger/30 bg-danger/5 px-3.5 py-2.5 text-[13px] text-danger">{error}</div>}
            {done && (
              <div className="mt-4 flex items-start gap-2 rounded-lg border border-brand-green/30 bg-brand-green/5 px-3.5 py-2.5 text-[13px] text-brand-green">
                <CheckCircle2 size={15} className="mt-0.5 shrink-0" />
                {done}
              </div>
            )}

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <select
                value={sweepCur}
                onChange={(e) => setSweepCur(e.target.value)}
                className="h-12 rounded-[11px] border border-hairline bg-paper px-3 text-[14px] text-ink outline-none focus:border-brand-green focus:ring-[3px] focus:ring-brand-green/10 sm:w-32"
              >
                {rows.map((r) => <option key={r.currency} value={r.currency}>{r.currency}</option>)}
              </select>
              <input
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
                placeholder="Amount"
                className="h-12 w-full min-w-0 rounded-[11px] border border-hairline bg-paper px-3.5 text-[15px] text-ink outline-none focus:border-brand-green focus:ring-[3px] focus:ring-brand-green/10"
              />
              <button
                onClick={() => {
                  setError(undefined); setDone(undefined);
                  if (!amount || Number(amount) <= 0) { setError("Enter an amount to sweep."); return; }
                  sweep.mutate();
                }}
                disabled={sweep.isPending}
                className="flex h-12 shrink-0 items-center justify-center rounded-[11px] bg-brand-green px-6 text-[14px] font-semibold text-white transition hover:brightness-95 disabled:opacity-60 sm:w-auto"
              >
                {sweep.isPending ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : "Sweep"}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
