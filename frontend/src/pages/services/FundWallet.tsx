import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CreditCard, ShieldCheck } from "lucide-react";
import AppHeader from "../../components/AppHeader";
import { useAuth } from "../../auth/AuthContext";
import { paymentsApi } from "../../services/payments";
import { apiErrorMessage } from "../../lib/api";

const QUICK = [1000, 2000, 5000, 10000, 20000];

/**
 * Fund Wallet with a card via Paystack (hosted redirect flow).
 * Enter an amount -> POST /payments/fund/ -> redirect to Paystack -> pay ->
 * Paystack redirects back to /wallet/fund/callback which verifies + credits.
 */
export default function FundWallet() {
  const { isVerified } = useAuth();
  const navigate = useNavigate();
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string>();

  const init = useMutation({
    mutationFn: () => paymentsApi.fundInit({ amount: Number(amount) }),
    onSuccess: (data) => {
      // Hand off to Paystack's secure hosted checkout.
      window.location.href = data.authorization_url;
    },
    onError: (err) => setError(apiErrorMessage(err, "Couldn't start payment. Try again.")),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    const n = Number(amount);
    if (!n || n < 100) return setError("Enter an amount of at least ₦100.");
    init.mutate();
  }

  if (!isVerified) {
    return (
      <div className="min-h-screen bg-mist">
        <AppHeader />
        <main className="mx-auto max-w-md px-5 py-16 text-center">
          <h1 className="font-display text-xl font-semibold text-ink">Verify your account</h1>
          <p className="mt-2 text-[14px] text-muted">You need a verified account to fund your wallet.</p>
          <button onClick={() => navigate("/dashboard")} className="mt-5 rounded-lg bg-brand-green px-5 py-2.5 text-[14px] font-medium text-white">
            Back to dashboard
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mist">
      <AppHeader />
      <main className="mx-auto max-w-md px-5 py-8 sm:py-10">
        <button onClick={() => navigate("/dashboard")} className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted transition hover:text-ink">
          <ArrowLeft size={15} /> Back
        </button>

        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-green/10 text-brand-green">
            <CreditCard size={22} strokeWidth={1.75} />
          </span>
          <div>
            <h1 className="font-display text-xl font-semibold text-ink">Add money</h1>
            <p className="text-[13px] text-muted">Fund your wallet with your card.</p>
          </div>
        </div>

        <form onSubmit={submit} className="rounded-2xl border border-hairline bg-paper p-5">
          {error && (
            <div className="mb-4 rounded-lg border border-danger/30 bg-danger/5 px-3.5 py-2.5 text-[13px] text-danger">
              {error}
            </div>
          )}

          <label htmlFor="amount" className="mb-1.5 block text-[12.5px] font-semibold text-ink">Amount (₦)</label>
          <input
            id="amount"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
            placeholder="0"
            autoFocus
            className="h-14 w-full rounded-[11px] border border-hairline bg-paper px-3.5 text-[22px] font-semibold text-ink outline-none transition focus:border-brand-green focus:ring-[3px] focus:ring-brand-green/10"
          />
          <div className="mt-3 mb-5 flex flex-wrap gap-2">
            {QUICK.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAmount(String(a))}
                className="rounded-lg border border-hairline bg-paper px-3 py-1.5 text-[13px] font-medium text-ink transition hover:bg-mist"
              >
                ₦{a.toLocaleString()}
              </button>
            ))}
          </div>

          <button
            type="submit"
            disabled={init.isPending}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-[11px] bg-brand-green text-[15px] font-semibold text-white transition hover:brightness-95 active:scale-[0.99] disabled:opacity-60"
          >
            {init.isPending ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            ) : (
              <>Continue to payment{amount ? ` · ₦${Number(amount).toLocaleString()}` : ""}</>
            )}
          </button>

          <div className="mt-4 flex items-center justify-center gap-1.5 text-[12px] text-muted">
            <ShieldCheck size={14} strokeWidth={1.75} className="text-brand-green" />
            Secured by Paystack. Your card details never touch OAM.
          </div>
        </form>
      </main>
    </div>
  );
}
