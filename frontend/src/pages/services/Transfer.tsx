import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ArrowDownLeft, ArrowLeft, ArrowUpRight, BadgeCheck, CheckCircle2, Loader2, Send } from "lucide-react";
import AppHeader from "../../components/AppHeader";
import { useUserScope } from "../../auth/useUserScope";
import { useAuth } from "../../auth/AuthContext";
import { walletApi, transferApi, formatBalance, type WalletTransfer } from "../../services/wallet";
import { apiErrorMessage } from "../../lib/api";
import { VerifyGate } from "./BuyData";
import { useDebounced } from "../../hooks/useDebounced";

/** Send money to another OAM user by email or phone. */
export default function Transfer() {
  const scope = useUserScope();
  const { isVerified } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [identifier, setIdentifier] = useState("");
  const [recipient, setRecipient] = useState<string>();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const debouncedIdentifier = useDebounced(identifier, 700);
  const [error, setError] = useState<string>();
  const [done, setDone] = useState<WalletTransfer | null>(null);

  const walletsQuery = useQuery({
    queryKey: ["wallet", scope, "list"],
    queryFn: walletApi.getWallets,
    enabled: isVerified,
  });
  const ngn = walletsQuery.data?.wallets.find((w) => w.currency === "NGN");
  const balance = Number(ngn?.balance ?? 0);

  const historyQuery = useQuery({
    queryKey: ["wallet", scope, "transfers"],
    queryFn: transferApi.history,
    enabled: isVerified,
  });

  /** A plausible email, or a Nigerian phone number of full length. */
  const looksComplete = (v: string) => {
    const t = v.trim();
    if (t.includes("@")) return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(t);
    const digits = t.replace(/\D/g, "");
    return digits.length >= 11;
  };

  const resolve = useMutation({
    mutationFn: () => transferApi.resolve(identifier.trim()),
    onSuccess: (d) => { setRecipient(d.name); setError(undefined); },
    onError: (err) => { setRecipient(undefined); setError(apiErrorMessage(err, "Couldn't find that account.")); },
  });

  // Look the recipient up as soon as the identifier is complete — asking
  // someone to press an extra button before they can send money is friction
  // with no payoff. Partial input is never sent, so we don't generate
  // pointless "no such user" errors while they're still typing.
  useEffect(() => {
    if (!looksComplete(debouncedIdentifier) || recipient || resolve.isPending) return;
    resolve.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedIdentifier]);

  const send = useMutation({
    mutationFn: () => transferApi.send({ identifier: identifier.trim(), amount: Number(amount), note: note.trim() }),
    onSuccess: (t) => {
      setDone(t); setError(undefined); setAmount(""); setNote("");
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
    },
    onError: (err) => setError(apiErrorMessage(err, "Transfer failed.")),
  });

  if (!isVerified) return <VerifyGate onBack={() => navigate("/dashboard")} />;

  if (done) {
    return (
      <div className="min-h-screen bg-mist">
        <AppHeader />
        <main className="mx-auto max-w-md px-5 py-12">
          <div className="rounded-2xl border border-hairline bg-paper p-8 text-center">
            <CheckCircle2 size={48} strokeWidth={1.5} className="mx-auto text-brand-green" />
            <h1 className="mt-4 font-display text-xl font-semibold text-ink">Money sent!</h1>
            <p className="mt-1 text-[14px] text-muted">
              ₦{Number(done.amount).toLocaleString()} to {done.counterparty}.
            </p>
            <div className="mt-5 rounded-xl bg-mist p-3 text-left text-[12.5px] text-muted">
              <div className="flex justify-between"><span>Reference</span><span className="font-mono text-[11px] text-ink">{done.reference}</span></div>
            </div>
            <div className="mt-6 flex gap-2">
              <button onClick={() => { setDone(null); setRecipient(undefined); setIdentifier(""); }} className="h-11 flex-1 rounded-lg border border-hairline bg-paper text-[14px] font-medium text-ink transition hover:bg-mist">
                Send again
              </button>
              <button onClick={() => navigate("/wallet")} className="h-11 flex-1 rounded-lg bg-brand-green text-[14px] font-medium text-white transition hover:brightness-95">
                Done
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const transfers = historyQuery.data ?? [];

  return (
    <div className="min-h-screen bg-mist">
      <AppHeader />
      <main className="mx-auto max-w-md px-5 py-8 sm:py-10">
        <button onClick={() => navigate("/wallet")} className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted transition hover:text-ink">
          <ArrowLeft size={15} /> Back to wallet
        </button>

        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-green/10 text-brand-green">
            <Send size={22} strokeWidth={1.75} />
          </span>
          <div>
            <h1 className="font-display text-xl font-semibold text-ink">Transfer</h1>
            <p className="text-[13px] text-muted">
              Available: <span className="font-medium text-ink">{formatBalance(ngn?.balance ?? "0", "NGN")}</span>
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-hairline bg-paper p-5">
          {error && <div className="mb-4 rounded-lg border border-danger/30 bg-danger/5 px-3.5 py-2.5 text-[13px] text-danger">{error}</div>}

          <label htmlFor="ident" className="mb-1.5 block text-[12.5px] font-semibold text-ink">Recipient's email or phone</label>
          <div className="mb-2">
            <input
              id="ident"
              value={identifier}
              onChange={(e) => { setIdentifier(e.target.value); setRecipient(undefined); setError(undefined); }}
              onBlur={() => { if (looksComplete(identifier) && !recipient && !resolve.isPending) resolve.mutate(); }}
              placeholder="name@example.com or 080..."
              className="h-12 w-full rounded-[11px] border border-hairline bg-paper px-3.5 text-[15px] text-ink outline-none transition focus:border-brand-green focus:ring-[3px] focus:ring-brand-green/10"
            />
            {resolve.isPending && (
              <p className="mt-1.5 flex items-center gap-1.5 text-[12.5px] text-muted">
                <Loader2 size={13} strokeWidth={2} className="animate-spin" />
                Finding this person…
              </p>
            )}
            {!resolve.isPending && !recipient && identifier.trim().length > 0 && !looksComplete(identifier) && (
              <p className="mt-1.5 text-[12.5px] text-muted">
                {identifier.includes("@")
                  ? "Keep typing their full email address."
                  : "Keep typing — we'll find them once the full number is in."}
              </p>
            )}
          </div>

          {recipient && (
            <div className="mb-4 flex items-center gap-1.5 rounded-lg border border-brand-green/30 bg-brand-green/5 px-3 py-2 text-[13px] text-brand-green">
              <BadgeCheck size={15} strokeWidth={2} /> {recipient}
            </div>
          )}

          <label htmlFor="amt" className="mb-1.5 mt-2 block text-[12.5px] font-semibold text-ink">Amount (₦)</label>
          <input
            id="amt"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
            placeholder="Enter amount"
            className="h-12 w-full rounded-[11px] border border-hairline bg-paper px-3.5 text-[15px] text-ink outline-none transition focus:border-brand-green focus:ring-[3px] focus:ring-brand-green/10"
          />
          {amount && Number(amount) > balance && (
            <p className="mt-1.5 text-[12.5px] text-danger">That's more than your available balance.</p>
          )}

          <label htmlFor="note" className="mb-1.5 mt-4 block text-[12.5px] font-semibold text-ink">Note (optional)</label>
          <input
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 140))}
            placeholder="What's it for?"
            className="h-12 w-full rounded-[11px] border border-hairline bg-paper px-3.5 text-[14px] text-ink outline-none transition focus:border-brand-green focus:ring-[3px] focus:ring-brand-green/10"
          />

          <button
            onClick={() => {
              setError(undefined);
              if (!recipient) return setError("Wait for the recipient to be confirmed.");
              if (!amount || Number(amount) <= 0) return setError("Enter an amount.");
              if (Number(amount) > balance) return setError("Amount exceeds your balance.");
              send.mutate();
            }}
            disabled={send.isPending}
            className="mt-5 flex h-12 w-full items-center justify-center rounded-[11px] bg-brand-red text-[15px] font-semibold text-white shadow-[0_8px_20px_rgba(227,16,18,0.25)] transition hover:brightness-95 active:scale-[0.99] disabled:opacity-60"
          >
            {send.isPending
              ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              : amount ? `Send ₦${Number(amount).toLocaleString()}` : "Send money"}
          </button>
          <p className="mt-3 text-center text-[12px] text-muted">Instant, free transfers between OAM wallets.</p>
        </div>

        {/* Recent transfers */}
        {transfers.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-3 text-[15px] font-semibold text-ink">Recent transfers</h2>
            <ul className="divide-y divide-hairline rounded-2xl border border-hairline bg-paper">
              {transfers.slice(0, 8).map((t) => {
                const incoming = t.direction === "in";
                return (
                  <li key={t.id} className="flex items-center gap-3 px-4 py-3.5">
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${incoming ? "bg-brand-green/10 text-brand-green" : "bg-mist text-muted"}`}>
                      {incoming ? <ArrowDownLeft size={16} strokeWidth={2} /> : <ArrowUpRight size={16} strokeWidth={2} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-[13.5px] font-medium text-ink">
                        {incoming ? "From" : "To"} {t.counterparty}
                      </p>
                      <p className="line-clamp-1 text-[11.5px] text-muted">
                        {t.note || new Date(t.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                      </p>
                    </div>
                    <span className={`shrink-0 tabular text-[13.5px] font-semibold ${incoming ? "text-brand-green" : "text-ink"}`}>
                      {incoming ? "+" : "−"}₦{Number(t.amount).toLocaleString()}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}
