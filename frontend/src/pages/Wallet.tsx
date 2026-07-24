import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, ArrowDownLeft, ArrowUpRight, Building2, CreditCard, Eye, EyeOff, Plus, Receipt, RefreshCw, Send, ShieldAlert, Smartphone, Tv, Wallet as WalletIcon, Wifi, Zap } from "lucide-react";
import AppHeader from "../components/AppHeader";
import { useUserScope } from "../auth/useUserScope";
import { useAuth } from "../auth/AuthContext";
import { walletApi, formatBalance, type Transaction } from "../services/wallet";
import { describeTransaction, friendlyTime, type TxnKind } from "../lib/format";
import { apiErrorMessage } from "../lib/api";

/**
 * Full wallet page: real balance per currency, currency switching, and the
 * complete transaction history for the selected wallet.
 */
export default function Wallet() {
  const scope = useUserScope();
  const { isVerified, user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [hide, setHide] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [openError, setOpenError] = useState<string>();

  const walletsQuery = useQuery({
    queryKey: ["wallet", scope, "list"],
    queryFn: walletApi.getWallets,
    enabled: isVerified,
  });

  const currencyQuery = useQuery({
    queryKey: ["wallet", scope, "default-currency"],
    queryFn: walletApi.getDefaultCurrency,
    enabled: isVerified,
    staleTime: 10 * 60_000,
  });

  // Default to NGN when present, else the backend's default.
  const wallets = walletsQuery.data?.wallets ?? [];
  const backendDefault = walletsQuery.data?.default_currency ?? "NGN";
  const active =
    selected ??
    (wallets.some((w) => w.currency === "NGN") ? "NGN" : backendDefault);
  const activeWallet = wallets.find((w) => w.currency === active);

  const txnsQuery = useQuery({
    queryKey: ["wallet", scope, "transactions", active],
    queryFn: () => walletApi.getTransactions(active),
    enabled: isVerified && Boolean(activeWallet),
  });

  const openWallet = useMutation({
    mutationFn: (cur: string) => walletApi.openWallet(cur),
    onSuccess: (w) => {
      setOpenError(undefined);
      setSelected(w.currency);
      queryClient.invalidateQueries({ queryKey: ["wallet", scope, "list"] });
    },
    onError: (err) => setOpenError(apiErrorMessage(err, "Couldn't open that wallet.")),
  });

  const supported = currencyQuery.data?.supported ?? ["NGN", "USD", "GBP", "EUR"];
  const transactions = txnsQuery.data?.results ?? [];

  if (!isVerified) {
    return (
      <div className="min-h-screen bg-mist">
        <AppHeader />
        <main className="mx-auto max-w-md px-5 py-16 text-center">
          <ShieldAlert size={40} strokeWidth={1.5} className="mx-auto text-warn" />
          <h1 className="mt-4 font-display text-xl font-semibold text-ink">Verify your account</h1>
          <p className="mt-2 text-[14px] text-muted">Your wallet unlocks once your account is verified.</p>
          <Link to="/verify" state={{ identifier: user?.email ?? user?.phone ?? "" }} className="mt-5 inline-block rounded-lg bg-brand-green px-5 py-2.5 text-[14px] font-medium text-white">
            Verify now
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mist">
      <AppHeader />
      <main className="mx-auto max-w-4xl px-5 py-8 sm:px-6 sm:py-10">
        <div className="mb-5 flex items-center justify-between">
          <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">Wallet</h1>
          <button
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ["wallet"] });
            }}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-hairline bg-paper px-3 text-[13px] font-medium text-ink transition hover:bg-mist"
          >
            <RefreshCw size={14} strokeWidth={1.75} className={walletsQuery.isFetching ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {/* Currency switcher */}
        <div className="scrollbar-hide -mx-5 mb-4 flex gap-2 overflow-x-auto px-5 sm:mx-0 sm:px-0">
          {supported.map((cur) => {
            const owned = wallets.some((w) => w.currency === cur);
            const isActive = active === cur;
            return (
              <button
                key={cur}
                onClick={() => {
                  if (owned) setSelected(cur);
                  else openWallet.mutate(cur);
                }}
                disabled={openWallet.isPending}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-brand-green text-white"
                    : owned
                    ? "border border-hairline bg-paper text-ink hover:bg-mist"
                    : "border border-dashed border-hairline bg-paper text-muted hover:bg-mist"
                }`}
              >
                {cur}
                {!owned && " +"}
              </button>
            );
          })}
        </div>
        {openError && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/5 px-3.5 py-2.5 text-[13px] text-danger">
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            {openError}
          </div>
        )}

        {/* Balance card */}
        <div className="relative overflow-hidden rounded-2xl bg-[#0a0a0a] p-6 text-white sm:p-7">
          <div
            className="absolute inset-x-0 top-0 h-[3px]"
            style={{ background: "linear-gradient(90deg,#111 33%,#E31012 33%,#E31012 66%,#0B7327 66%)" }}
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: "radial-gradient(circle at 15% 15%, rgba(11,115,39,0.35), transparent 55%), radial-gradient(circle at 90% 90%, rgba(227,16,18,0.14), transparent 50%)" }}
            aria-hidden="true"
          />
          <div className="relative">
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-white/60">{active} balance</span>
              <button onClick={() => setHide((v) => !v)} title={hide ? "Show balance" : "Hide balance"} aria-label={hide ? "Show balance" : "Hide balance"} className="text-white/50 transition hover:text-white/80">
                {hide ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <div className="mt-2 min-h-[48px]">
              {walletsQuery.isLoading ? (
                <div className="mt-1 h-10 w-44 animate-pulse rounded-lg bg-white/10" />
              ) : walletsQuery.isError ? (
                <div className="text-[15px] text-white/70">
                  Couldn't load your balance. <button onClick={() => walletsQuery.refetch()} className="underline">Retry</button>
                </div>
              ) : (
                <div className="tabular text-[34px] font-bold tracking-tight sm:text-[40px]">
                  {hide ? "••••••" : formatBalance(activeWallet?.balance ?? "0", active)}
                </div>
              )}
            </div>

            {activeWallet?.updated_at && !walletsQuery.isLoading && !walletsQuery.isError && (
              <p className="mt-1 text-[11.5px] text-white/40">
                Last updated {friendlyTime(activeWallet.updated_at)}
              </p>
            )}

            {!walletsQuery.isLoading && !walletsQuery.isError && Number(activeWallet?.balance ?? 0) === 0 && (
              <p className="mt-1 text-[12.5px] text-white/50">
                This wallet is empty. Add money to pay from your balance.
              </p>
            )}

            <div className="mt-5 flex flex-wrap gap-3">
              <Link to="/wallet/fund" className="inline-flex items-center gap-1.5 rounded-lg bg-brand-red px-4 py-2 text-[13px] font-medium text-white transition hover:brightness-95">
                <Plus size={16} strokeWidth={2} /> Add money
              </Link>
              <Link to="/wallet/send" className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.08] px-4 py-2 text-[13px] font-medium text-white transition hover:bg-white/[0.14]">
                <Send size={15} strokeWidth={2} /> Transfer
              </Link>
              <Link to="/wallet/withdraw" className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.08] px-4 py-2 text-[13px] font-medium text-white transition hover:bg-white/[0.14]">
                <ArrowUpRight size={15} strokeWidth={2} /> Withdraw
              </Link>
            </div>
          </div>
        </div>

        {/* Transactions */}
        <div className="mt-8">
          <h2 className="mb-3 text-[15px] font-semibold text-ink">Transaction history</h2>
          <div className="rounded-2xl border border-hairline bg-paper">
            {txnsQuery.isLoading ? (
              <ul className="divide-y divide-hairline">
                {Array.from({ length: 6 }).map((_, i) => (
                  <li key={i} className="flex items-center gap-3 px-4 py-3.5">
                    <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-hairline/60" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-2/3 animate-pulse rounded bg-hairline/60" />
                      <div className="h-2.5 w-1/3 animate-pulse rounded bg-hairline/60" />
                    </div>
                    <div className="h-3 w-16 animate-pulse rounded bg-hairline/60" />
                  </li>
                ))}
              </ul>
            ) : txnsQuery.isError ? (
              <Message icon={<Receipt size={20} strokeWidth={1.5} />} text="Couldn't load transactions." action={<button onClick={() => txnsQuery.refetch()} className="mt-3 rounded-lg bg-brand-green px-4 py-2 text-[13px] font-medium text-white">Try again</button>} />
            ) : transactions.length === 0 ? (
              <Message icon={<WalletIcon size={20} strokeWidth={1.5} />} text={`No ${active} transactions yet. Fund your wallet or buy a service to see activity here.`} />
            ) : (
              <ul className="divide-y divide-hairline">
                {transactions.map((t) => <Row key={t.id} txn={t} />)}
              </ul>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

const KIND_ICONS: Record<TxnKind, React.ReactNode> = {
  airtime: <Smartphone size={16} strokeWidth={1.75} />,
  data: <Wifi size={16} strokeWidth={1.75} />,
  electricity: <Zap size={16} strokeWidth={1.75} />,
  cable: <Tv size={16} strokeWidth={1.75} />,
  funding: <CreditCard size={16} strokeWidth={1.75} />,
  withdrawal: <Building2 size={16} strokeWidth={1.75} />,
  transfer: <Send size={15} strokeWidth={1.75} />,
  other: <Receipt size={16} strokeWidth={1.75} />,
};

function Row({ txn }: { txn: Transaction }) {
  const credit = txn.direction === "credit";
  const { label, kind, reference } = describeTransaction(txn.description);
  const symbol = { NGN: "₦", USD: "$", GBP: "£", EUR: "€" }[txn.currency.toUpperCase()] ?? "";
  const amt = `${symbol}${Number(txn.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <li className="flex items-center gap-3 px-4 py-3.5">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${credit ? "bg-brand-green/10 text-brand-green" : "bg-mist text-muted"}`}>
        {KIND_ICONS[kind] ?? (credit ? <ArrowDownLeft size={16} strokeWidth={2} /> : <ArrowUpRight size={16} strokeWidth={2} />)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-1 text-[13.5px] font-medium text-ink">{label}</p>
        <p className="text-[11.5px] text-muted">
          {friendlyTime(txn.created_at)}
          {reference && <span className="ml-1.5 font-mono text-[10.5px] opacity-70">{reference}</span>}
        </p>
      </div>
      <span className={`shrink-0 tabular text-[13.5px] font-semibold ${credit ? "text-brand-green" : "text-ink"}`}>
        {credit ? "+" : "−"}{amt}
      </span>
    </li>
  );
}

function Message({ icon, text, action }: { icon: React.ReactNode; text: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-mist text-muted">{icon}</span>
      <p className="mt-3 max-w-xs text-[13px] text-muted">{text}</p>
      {action}
    </div>
  );
}
