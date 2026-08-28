import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BadgeCheck, Loader2, Ticket } from "lucide-react";
import AppHeader from "../../components/AppHeader";
import { useUserScope } from "../../auth/useUserScope";
import { useAuth } from "../../auth/AuthContext";
import { billingApi, type Biller, type BillOrder } from "../../services/billing";
import { Result } from "./BuyData";
import { apiErrorMessage } from "../../lib/api";
import { walletApi } from "../../services/wallet";
import { naira } from "../../lib/format";
import { useDebounced } from "../../hooks/useDebounced";

const QUICK_AMOUNTS = [500, 1000, 2000, 5000];
const SERVICE_FEE = 50;

/**
 * Fund Betting Wallet. Pick a provider (Bet9ja, SportyBet, …), enter the betting
 * account ID, confirm the account holder's name, then pay from the OAM wallet.
 * The user pays `amount + ₦50`; the betting account is credited with `amount`.
 */
export default function BuyBetting() {
  const scope = useUserScope();
  const { isVerified } = useAuth();
  const navigate = useNavigate();

  const [provider, setProvider] = useState("");
  const [account, setAccount] = useState("");
  const [amount, setAmount] = useState("");
  const [customerName, setCustomerName] = useState<string>();
  const [verificationId, setVerificationId] = useState<string>("");
  const [error, setError] = useState<string>();
  const [order, setOrder] = useState<BillOrder | null>(null);

  const billersQuery = useQuery({
    queryKey: ["billers", "betting"],
    queryFn: () => billingApi.getBillers("betting"),
    enabled: isVerified,
  });

  const walletsQuery = useQuery({
    queryKey: ["wallet", scope, "list"],
    queryFn: walletApi.getWallets,
    enabled: isVerified,
  });
  const ngnBalance = walletsQuery.data?.wallets.find((w) => w.currency === "NGN")?.balance;

  const verify = useMutation({
    mutationFn: () =>
      billingApi.verifyCustomer({ category: "betting", code: provider, customer_id: account.trim() }),
    onSuccess: (data) => {
      if (data.customer_name && data.verification_id) {
        setCustomerName(data.customer_name);
        setVerificationId(data.verification_id);
        setError(undefined);
      } else {
        setCustomerName(undefined);
        setVerificationId("");
        setError(data.detail || "Couldn't confirm that betting account.");
      }
    },
    onError: (err) => {
      setCustomerName(undefined);
      setVerificationId("");
      setError(apiErrorMessage(err, "Couldn't verify that betting account."));
    },
  });

  // Auto-verify once a provider is picked and the account id looks complete.
  const debouncedAccount = useDebounced(account, 700);
  useEffect(() => {
    if (provider && debouncedAccount.trim().length >= 4 && !customerName && !verify.isPending) {
      verify.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider, debouncedAccount]);

  const fund = useMutation({
    mutationFn: () =>
      billingApi.fundBetting({
        code: provider,
        customer_id: account.trim(),
        amount: Number(amount),
        verification_id: verificationId,
      }),
    onSuccess: (data) => setOrder(data),
    onError: (err) => {
      const msg = apiErrorMessage(err, "Funding failed. Try again.");
      const st = (err as { response?: { status?: number } })?.response?.status;
      setError(st === 402 ? "Your wallet balance is too low. Add money and try again." : msg);
    },
  });

  const amt = Number(amount) || 0;
  const total = amt > 0 ? amt + SERVICE_FEE : 0;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    if (!provider) return setError("Choose a betting provider.");
    if (account.trim().length < 3) return setError("Enter a valid betting account ID.");
    if (!verificationId || !customerName) return setError("Confirm the betting account first.");
    if (amt < 100) return setError("Enter an amount of at least ₦100.");
    if (amt > 100000) return setError("Maximum funding is ₦100,000.");
    fund.mutate();
  }

  if (!isVerified) {
    return (
      <div className="min-h-screen bg-mist">
        <AppHeader />
        <main className="mx-auto max-w-md px-5 py-16 text-center">
          <h1 className="font-display text-xl font-semibold text-ink">Verify your account</h1>
          <p className="mt-2 text-[14px] text-muted">You need a verified account to fund betting wallets.</p>
          <button onClick={() => navigate("/dashboard")} className="mt-5 rounded-lg bg-brand-green px-5 py-2.5 text-[14px] font-medium text-white">
            Back to dashboard
          </button>
        </main>
      </div>
    );
  }

  if (order) {
    return (
      <Result
        ok={order.status === "success"}
        title={order.status === "success" ? "Betting wallet funded!" : "Funding in progress"}
        message={`₦${Number(order.cost_amount ?? order.amount).toLocaleString()} to ${order.biller_name} account ${order.recipient}.`}
        order={order}
        onAgain={() => { setOrder(null); setAmount(""); }}
        onDone={() => navigate(order.status === "success" ? "/dashboard" : "/orders")}
      />
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
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-red/10 text-brand-red">
            <Ticket size={22} strokeWidth={1.75} />
          </span>
          <div>
            <h1 className="font-display text-xl font-semibold text-ink">Fund Betting Wallet</h1>
            <p className="text-[13px] text-muted">Top up your betting account instantly.</p>
          </div>
        </div>

        <form onSubmit={submit} className="rounded-2xl border border-hairline bg-paper p-5">
          {error && (
            <div className="mb-4 rounded-lg border border-danger/30 bg-danger/5 px-3.5 py-2.5 text-[13px] text-danger">
              {error}
            </div>
          )}

          {/* Provider */}
          <label className="mb-1.5 block text-[12.5px] font-semibold text-ink">Betting provider</label>
          {billersQuery.isLoading ? (
            <div className="mb-4 h-12 animate-pulse rounded-[11px] bg-hairline/60" />
          ) : billersQuery.isError ? (
            <p className="mb-4 text-[13px] text-danger">
              Couldn't load providers. <button type="button" onClick={() => billersQuery.refetch()} className="underline">Retry</button>
            </p>
          ) : (
            <select
              value={provider}
              onChange={(e) => { setProvider(e.target.value); setCustomerName(undefined); setVerificationId(""); }}
              className="mb-4 h-12 w-full rounded-[11px] border border-hairline bg-paper px-3 text-[14px] text-ink outline-none transition focus:border-brand-green focus:ring-[3px] focus:ring-brand-green/10"
            >
              <option value="">Select provider…</option>
              {billersQuery.data?.map((b: Biller) => (
                <option key={b.id} value={b.code}>{b.name}</option>
              ))}
            </select>
          )}

          {/* Betting account ID */}
          <label htmlFor="account" className="mb-1.5 block text-[12.5px] font-semibold text-ink">Betting account ID</label>
          <input
            id="account"
            value={account}
            onChange={(e) => { setAccount(e.target.value.trim()); setCustomerName(undefined); setVerificationId(""); setError(undefined); }}
            placeholder="Your betting user ID"
            onBlur={() => { if (provider && account.trim().length >= 3 && !customerName && !verify.isPending) verify.mutate(); }}
            className="h-12 w-full rounded-[11px] border border-hairline bg-paper px-3.5 text-[15px] text-ink outline-none transition focus:border-brand-green focus:ring-[3px] focus:ring-brand-green/10"
          />
          {verify.isPending && (
            <div className="mt-2 flex items-center gap-1.5 text-[13px] text-muted">
              <Loader2 size={14} className="animate-spin" /> Checking account…
            </div>
          )}
          {customerName && (
            <div className="mt-2 mb-2 rounded-lg border border-brand-green/30 bg-brand-green/5 px-3 py-2.5">
              <div className="flex items-center gap-1.5 text-[13.5px] font-medium text-brand-green">
                <BadgeCheck size={15} strokeWidth={2} />
                {customerName}
              </div>
            </div>
          )}
          {!customerName && !verify.isPending && provider && account.length >= 3 && verify.isError && (
            <p className="mt-2 text-[12.5px] text-muted">
              Couldn't confirm that account.{" "}
              <button type="button" onClick={() => verify.mutate()} className="underline text-ink">Check again</button>
            </p>
          )}
          {!provider && account.length > 0 && (
            <p className="mt-2 text-[12.5px] text-muted">Choose your provider above to confirm the account.</p>
          )}

          {/* Amount */}
          <label htmlFor="amount" className="mb-1.5 mt-2 block text-[12.5px] font-semibold text-ink">Amount (₦)</label>
          <input
            id="amount"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
            placeholder="Enter amount"
            className="h-12 w-full rounded-[11px] border border-hairline bg-paper px-3.5 text-[15px] text-ink outline-none transition focus:border-brand-green focus:ring-[3px] focus:ring-brand-green/10"
          />
          <div className="mt-2 mb-5 flex flex-wrap gap-2">
            {QUICK_AMOUNTS.map((a) => (
              <button key={a} type="button" onClick={() => setAmount(String(a))} className="rounded-lg border border-hairline bg-paper px-3 py-1.5 text-[13px] font-medium text-ink transition hover:bg-mist">
                ₦{a.toLocaleString()}
              </button>
            ))}
          </div>

          {/* Fee breakdown */}
          <div className="mb-5 rounded-xl bg-mist p-3.5 text-[13px]">
            <div className="flex justify-between text-muted">
              <span>Betting credit</span><span className="text-ink">{naira(amt)}</span>
            </div>
            <div className="mt-1.5 flex justify-between text-muted">
              <span>Service fee</span><span className="text-ink">{naira(SERVICE_FEE)}</span>
            </div>
            <div className="mt-2 flex justify-between border-t border-hairline pt-2 font-semibold">
              <span className="text-ink">You pay</span><span className="text-ink">{naira(total)}</span>
            </div>
            {ngnBalance !== undefined && (
              <p className="mt-2 text-[12px] text-muted">Wallet balance: {naira(Number(ngnBalance))}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={fund.isPending}
            className="flex h-12 w-full items-center justify-center rounded-[11px] bg-brand-red text-[15px] font-semibold text-white shadow-[0_8px_20px_rgba(227,16,18,0.25)] transition hover:brightness-95 active:scale-[0.99] disabled:opacity-60"
          >
            {fund.isPending ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            ) : (
              total ? `Pay ${naira(total)}` : "Fund wallet"
            )}
          </button>
          <p className="mt-3 text-center text-[12px] text-muted">Paid instantly from your OAM wallet. Includes a ₦50 service fee.</p>
        </form>
      </main>
    </div>
  );
}
