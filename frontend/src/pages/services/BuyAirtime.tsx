import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, CheckCircle2, CreditCard, Loader2, Smartphone, Wallet, XCircle } from "lucide-react";
import AppHeader from "../../components/AppHeader";
import { useUserScope } from "../../auth/useUserScope";
import { useAuth } from "../../auth/AuthContext";
import { billingApi, cardCheckoutApi, type Biller, type BillOrder } from "../../services/billing";
import { apiErrorMessage } from "../../lib/api";
import { walletApi } from "../../services/wallet";
import { formatPhone, detectNetwork, naira } from "../../lib/format";
import PaySummary from "../../components/PaySummary";
import ConfirmPurchase from "../../components/ConfirmPurchase";

const QUICK_AMOUNTS = [100, 200, 500, 1000, 2000];

/**
 * Buy Airtime — real purchase flow against POST /billing/purchase/ (category=airtime).
 * This is the template every other bill flow follows.
 */
export default function BuyAirtime() {
  const scope = useUserScope();
  const { isVerified } = useAuth();
  const navigate = useNavigate();

  const [network, setNetwork] = useState<string>("");   // biller code
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState<string>("");
  const [payWith, setPayWith] = useState<"wallet" | "card">("wallet");
  const [error, setError] = useState<string>();
  const [lowFunds, setLowFunds] = useState(false);
  const [order, setOrder] = useState<BillOrder | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [touchedNetwork, setTouchedNetwork] = useState(false);

  const billersQuery = useQuery({
    queryKey: ["billers", "airtime"],
    queryFn: () => billingApi.getBillers("airtime"),
    enabled: isVerified,
  });

  const walletsQuery = useQuery({
    queryKey: ["wallet", scope, "list"],
    queryFn: walletApi.getWallets,
    enabled: isVerified,
  });
  const ngnBalance = walletsQuery.data?.wallets.find((w) => w.currency === "NGN")?.balance;

  // Suggest the network from the phone prefix, but never fight the user:
  // once they pick one themselves we stop guessing (numbers get ported).
  useEffect(() => {
    if (touchedNetwork || phone.length < 4) return;
    const guess = detectNetwork(phone);
    if (!guess) return;
    const match = billersQuery.data?.find(
      (b) => b.code.toLowerCase().includes(guess) || b.name.toLowerCase().includes(guess)
    );
    if (match && match.code !== network) setNetwork(match.code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phone, billersQuery.data, touchedNetwork]);

  const purchase = useMutation({
    mutationFn: () =>
      billingApi.purchase({
        category: "airtime",
        code: network,
        recipient: phone.trim(),
        amount: Number(amount),
      }),
    onSuccess: (data) => setOrder(data),
    onError: (err) => {
      const msg = apiErrorMessage(err, "Purchase failed. Try again.");
      const status = (err as { response?: { status?: number } })?.response?.status;
      const insufficient = status === 402 || /insufficient|balance|fund/i.test(msg);
      setLowFunds(insufficient);
      setError(msg);
    },
  });

  const cardPay = useMutation({
    mutationFn: () =>
      cardCheckoutApi.start({
        category: "airtime",
        code: network,
        recipient: phone.trim(),
        amount: Number(amount),
      }),
    onSuccess: (data) => {
      // Hand off to Paystack's secure hosted checkout.
      window.location.href = data.authorization_url;
    },
    onError: (err) => setError(apiErrorMessage(err, "Couldn't start card payment.")),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    setLowFunds(false);
    if (!network) return setError("Choose a network.");
    if (phone.trim().length < 10) return setError("Enter a valid phone number.");
    if (!amount || Number(amount) <= 0) return setError("Enter an amount.");
    setConfirming(true);
  }

  function runPurchase() {
    setConfirming(false);
    if (payWith === "card") cardPay.mutate();
    else purchase.mutate();
  }

  const selectedBiller = billersQuery.data?.find((b) => b.code === network);

  if (!isVerified) return <GateVerify />;

  // success screen
  if (order) {
    const ok = order.status === "success";
    const pending = ["pending", "processing"].includes(String(order.status).toLowerCase());
    return (
      <div className="min-h-screen bg-mist">
        <AppHeader />
        <main className="mx-auto max-w-md px-5 py-12">
          <div className="rounded-2xl border border-hairline bg-paper p-8 text-center">
            {ok ? (
              <CheckCircle2 size={48} strokeWidth={1.5} className="mx-auto text-brand-green" />
            ) : pending ? (
              <Loader2 size={44} strokeWidth={1.5} className="mx-auto animate-spin text-warn" />
            ) : (
              <XCircle size={48} strokeWidth={1.5} className="mx-auto text-danger" />
            )}
            <h1 className="mt-4 font-display text-xl font-semibold text-ink">
              {ok ? "Airtime on the way!" : "Purchase failed"}
            </h1>
            <p className="mt-1 text-[14px] text-muted">
              {ok
                ? `₦${Number(order.amount).toLocaleString()} ${order.biller_name} airtime to ${order.recipient}.`
                : pending
                ? "Payment taken and your provider is completing the order. Don't buy again — check Orders in a moment."
                : "The provider could not complete this order. Any amount held has been returned to your wallet."}
            </p>
            <div className="mt-5 rounded-xl bg-mist p-3 text-left text-[12.5px] text-muted">
              <div className="flex justify-between"><span>Status</span><span className="font-medium text-ink">{order.status}</span></div>
              <div className="mt-1 flex justify-between"><span>Reference</span><span className="font-mono text-[11px] text-ink">{order.reference}</span></div>
            </div>
            <div className="mt-6 flex gap-2">
              <button
                onClick={() => { setOrder(null); setAmount(""); }}
                className="h-11 flex-1 rounded-lg border border-hairline bg-paper text-[14px] font-medium text-ink transition hover:bg-mist"
              >
                Buy again
              </button>
              <button
                onClick={() => navigate("/dashboard")}
                className="h-11 flex-1 rounded-lg bg-brand-green text-[14px] font-medium text-white transition hover:brightness-95"
              >
                Done
              </button>
            </div>
          </div>
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
            <Smartphone size={22} strokeWidth={1.75} />
          </span>
          <div>
            <h1 className="font-display text-xl font-semibold text-ink">Buy Airtime</h1>
            <p className="text-[13px] text-muted">Instant top-up, any network.</p>
          </div>
        </div>

        <form onSubmit={submit} className="rounded-2xl border border-hairline bg-paper p-5">
          {error && (
            <div className="mb-4 rounded-lg border border-danger/30 bg-danger/5 px-3.5 py-2.5 text-[13px] text-danger">
              {error}
            </div>
          )}

          {lowFunds && (
            <div className="mb-4 rounded-lg border border-brand-green/30 bg-brand-green/5 p-3.5">
              <p className="text-[13px] text-ink">Your wallet balance is too low for this purchase.</p>
              <button
                type="button"
                onClick={() => navigate("/wallet/fund")}
                className="mt-2 inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-green px-4 text-[13px] font-medium text-white transition hover:brightness-95"
              >
                <CreditCard size={15} strokeWidth={2} /> Add money with card
              </button>
            </div>
          )}

          {/* Network */}
          <label className="mb-1.5 block text-[12.5px] font-semibold text-ink">Network</label>
          {billersQuery.isLoading ? (
            <div className="mb-4 grid grid-cols-4 gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-11 animate-pulse rounded-lg bg-hairline/60" />
              ))}
            </div>
          ) : billersQuery.isError ? (
            <p className="mb-4 text-[13px] text-danger">Couldn't load networks. <button type="button" onClick={() => billersQuery.refetch()} className="underline">Retry</button></p>
          ) : (
            <div className="mb-4 grid grid-cols-4 gap-2">
              {billersQuery.data?.map((b: Biller) => {
                const selected = network === b.code;
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => { setNetwork(b.code); setTouchedNetwork(true); }}
                    className={`relative h-12 rounded-[11px] border-2 text-[13px] font-semibold transition ${
                      selected
                        ? "border-brand-green bg-brand-green/10 text-brand-green shadow-[0_2px_8px_rgba(11,115,39,0.15)]"
                        : "border-hairline bg-paper text-ink hover:border-ink/20 hover:bg-mist"
                    }`}
                  >
                    {b.name}
                    {selected && (
                      <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand-green text-white">
                        <Check size={12} strokeWidth={3} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Phone */}
          <label htmlFor="phone" className="mb-1.5 block text-[12.5px] font-semibold text-ink">
            Phone number
          </label>
          <input
            id="phone"
            inputMode="numeric"
            value={formatPhone(phone)}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
            placeholder="0803 123 4567"
            className="mb-1.5 h-12 w-full rounded-[11px] border border-hairline bg-paper px-3.5 text-[16px] tracking-wide text-ink outline-none transition focus:border-brand-green focus:ring-[3px] focus:ring-brand-green/10"
          />
          {phone.length >= 4 && detectNetwork(phone) && !touchedNetwork && (
            <p className="mb-4 text-[12px] text-muted">
              Looks like a <span className="font-medium text-ink">{detectNetwork(phone)?.toUpperCase()}</span> number —
              selected for you. Tap another network if that's wrong.
            </p>
          )}
          {(phone.length < 4 || !detectNetwork(phone) || touchedNetwork) && <div className="mb-4" />}

          {/* Amount */}
          <label htmlFor="amount" className="mb-1.5 block text-[12.5px] font-semibold text-ink">Amount (₦)</label>
          <input
            id="amount"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
            placeholder="Enter amount (min ₦50)"
            className="h-12 w-full rounded-[11px] border border-hairline bg-paper px-3.5 text-[15px] text-ink outline-none transition focus:border-brand-green focus:ring-[3px] focus:ring-brand-green/10"
          />
          <div className="mt-2 mb-5 flex flex-wrap gap-2">
            {QUICK_AMOUNTS.map((a) => {
              const selected = Number(amount) === a;
              return (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAmount(String(a))}
                  className={`h-10 rounded-lg border text-[13px] font-semibold transition ${
                    selected
                      ? "border-brand-green bg-brand-green text-white"
                      : "border-hairline bg-paper text-ink hover:bg-mist"
                  }`}
                >
                  {naira(a)}
                </button>
              );
            })}
          </div>

          {/* Payment method */}
          <label className="mb-1.5 block text-[12.5px] font-semibold text-ink">Pay with</label>
          <div className="mb-5 grid grid-cols-2 gap-2">
            {([
              { key: "wallet", label: "Wallet", icon: <Wallet size={16} strokeWidth={1.75} /> },
              { key: "card", label: "Card", icon: <CreditCard size={16} strokeWidth={1.75} /> },
            ] as const).map((m) => {
              const selected = payWith === m.key;
              return (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setPayWith(m.key)}
                  aria-pressed={selected}
                  className={`flex h-12 items-center justify-center gap-2 rounded-[11px] border-2 text-[13.5px] font-semibold transition ${
                    selected
                      ? "border-brand-green bg-brand-green/10 text-brand-green shadow-[0_2px_8px_rgba(11,115,39,0.15)]"
                      : "border-hairline bg-paper text-muted hover:border-ink/20 hover:bg-mist hover:text-ink"
                  }`}
                >
                  <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${selected ? "border-brand-green" : "border-hairline"}`}>
                    {selected && <span className="h-2 w-2 rounded-full bg-brand-green" />}
                  </span>
                  {m.icon}
                  {m.label}
                </button>
              );
            })}
          </div>

          <PaySummary
            amount={Number(amount) || 0}
            payWith={payWith}
            balance={payWith === "wallet" ? ngnBalance : undefined}
          />

          <button
            type="submit"
            disabled={purchase.isPending || cardPay.isPending}
            className="flex h-12 w-full items-center justify-center rounded-[11px] bg-brand-red text-[15px] font-semibold text-white shadow-[0_8px_20px_rgba(227,16,18,0.25)] transition hover:brightness-95 active:scale-[0.99] disabled:opacity-60"
          >
            {purchase.isPending || cardPay.isPending ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            ) : (
              amount ? `Pay ₦${Number(amount).toLocaleString()}` : "Buy airtime"
            )}
          </button>
          <p className="mt-3 text-center text-[12px] text-muted">
            {payWith === "card"
              ? "You'll pay securely on Paystack. Your airtime is delivered right after."
              : "Paid instantly from your OAM wallet."}
          </p>
        </form>
      </main>

      <ConfirmPurchase
        open={confirming}
        title="Confirm purchase"
        lines={[
          { label: "Service", value: `${selectedBiller?.name ?? ""} airtime`.trim() },
          { label: "Phone", value: formatPhone(phone) },
          { label: "Amount", value: naira(Number(amount) || 0) },
          { label: "Pay with", value: payWith === "card" ? "Card" : "Wallet" },
        ]}
        confirmLabel={`Pay ${naira(Number(amount) || 0)}`}
        pending={purchase.isPending || cardPay.isPending}
        onConfirm={runPurchase}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
}

function GateVerify() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-mist">
      <AppHeader />
      <main className="mx-auto max-w-md px-5 py-16 text-center">
        <h1 className="font-display text-xl font-semibold text-ink">Verify your account</h1>
        <p className="mt-2 text-[14px] text-muted">You need a verified account to buy airtime and pay bills.</p>
        <button onClick={() => navigate("/dashboard")} className="mt-5 rounded-lg bg-brand-green px-5 py-2.5 text-[14px] font-medium text-white">
          Back to dashboard
        </button>
      </main>
    </div>
  );
}
