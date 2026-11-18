import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Minus, Plus, Ticket } from "lucide-react";
import AppHeader from "../../components/AppHeader";
import { useUserScope } from "../../auth/useUserScope";
import { useAuth } from "../../auth/AuthContext";
import { billingApi, type Biller, type BillOrder } from "../../services/billing";
import { apiErrorMessage } from "../../lib/api";
import { walletApi } from "../../services/wallet";
import PaySummary from "../../components/PaySummary";
import { ErrorBox, LowFunds, VerifyGate } from "./BuyData";
import BillPins from "./BillPins";

const VALUES = [100, 200, 500, 1000];

/** ePIN — packs of 10 printable recharge cards (₦100–₦1,000), 1–5 packs. Wallet payment. */
export default function BuyEpin() {
  const scope = useUserScope();
  const { isVerified } = useAuth();
  const navigate = useNavigate();

  const [network, setNetwork] = useState("");
  const [value, setValue] = useState<number | null>(null);
  const [packs, setPacks] = useState(1);
  const [error, setError] = useState<string>();
  const [lowFunds, setLowFunds] = useState(false);
  const [order, setOrder] = useState<BillOrder | null>(null);

  const billers = useQuery({ queryKey: ["billers", "epin"], queryFn: () => billingApi.getBillers("epin"), enabled: isVerified });
  const stock = useQuery({ queryKey: ["epin-stock"], queryFn: billingApi.getEpinStock, enabled: isVerified, refetchInterval: 60_000 });
  const wallets = useQuery({ queryKey: ["wallet", scope, "list"], queryFn: walletApi.getWallets, enabled: isVerified });
  const balance = wallets.data?.wallets.find((w) => w.currency === "NGN")?.balance;
  const fee = Number(billers.data?.find((b) => b.code === network)?.service_fee ?? 0);
  const inStock = (v: number) => {
    const n = stock.data?.stock?.[network.toUpperCase()]?.[String(v)];
    return n === undefined ? true : n > 0;
  };

  const purchase = useMutation({
    mutationFn: () => billingApi.purchase({
      category: "epin", code: network, recipient: `${packs} pack(s)`, amount: (value ?? 0) * 10 * packs,
      plan_code: String(value), quantity: packs,
    }),
    onSuccess: (d) => setOrder(d),
    onError: (err) => {
      const msg = apiErrorMessage(err, "Purchase failed. Try again.");
      setLowFunds(/insufficient|balance|fund/i.test(msg));
      setError(msg);
    },
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined); setLowFunds(false);
    if (!network) return setError("Choose a network.");
    if (!value) return setError("Choose a card value.");
    purchase.mutate();
  }

  if (!isVerified) return <VerifyGate onBack={() => navigate("/dashboard")} />;
  if (order) {
    return <BillPins order={order} title="Your recharge cards are ready" onAgain={() => { setOrder(null); setValue(null); }} onDone={() => navigate("/dashboard")} />;
  }

  const total = (value ?? 0) * 10 * packs;
  return (
    <div className="min-h-screen bg-mist">
      <AppHeader />
      <main className="mx-auto max-w-md px-5 py-8 sm:py-10">
        <button onClick={() => navigate("/dashboard")} className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted transition hover:text-ink">
          <ArrowLeft size={15} /> Back
        </button>
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-green/10 text-brand-green"><Ticket size={22} strokeWidth={1.75} /></span>
          <div>
            <h1 className="font-display text-xl font-semibold text-ink">Recharge cards (ePIN)</h1>
            <p className="text-[13px] text-muted">Printable cards in packs of 10 — great for resale.</p>
          </div>
        </div>

        <form onSubmit={submit} className="rounded-2xl border border-hairline bg-paper p-5">
          {error && <ErrorBox message={error} />}
          {lowFunds && <LowFunds onCard={() => navigate("/wallet/fund")} />}

          <label className="mb-1.5 block text-[12.5px] font-semibold text-ink">Network</label>
          <div className="mb-4 grid grid-cols-4 gap-2">
            {billers.data?.map((b: Biller) => (
              <button key={b.id} type="button" onClick={() => { setNetwork(b.code); setValue(null); }}
                      className={`h-11 rounded-lg border text-[13px] font-medium transition ${network === b.code ? "border-brand-green bg-brand-green/10 text-brand-green" : "border-hairline bg-paper text-ink hover:bg-mist"}`}>
                {b.name}
              </button>
            ))}
          </div>

          {network && (
            <>
              <label className="mb-1.5 block text-[12.5px] font-semibold text-ink">Card value</label>
              <div className="mb-4 grid grid-cols-4 gap-2">
                {VALUES.map((v) => {
                  const ok = inStock(v);
                  return (
                    <button key={v} type="button" disabled={!ok} onClick={() => setValue(v)}
                            className={`h-11 rounded-lg border text-[13px] font-medium transition disabled:opacity-40 ${value === v ? "border-brand-green bg-brand-green/10 text-brand-green" : "border-hairline bg-paper text-ink hover:bg-mist"}`}>
                      ₦{v.toLocaleString()}{!ok && <span className="block text-[10px]">Out of stock</span>}
                    </button>
                  );
                })}
              </div>
              <div className="mb-4 flex items-center justify-between">
                <span className="text-[12.5px] font-semibold text-ink">Packs (10 cards each)</span>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setPacks(Math.max(1, packs - 1))} className="flex h-9 w-9 items-center justify-center rounded-lg border border-hairline"><Minus size={15} /></button>
                  <span className="w-5 text-center text-[15px] font-semibold tabular">{packs}</span>
                  <button type="button" onClick={() => setPacks(Math.min(5, packs + 1))} className="flex h-9 w-9 items-center justify-center rounded-lg border border-hairline"><Plus size={15} /></button>
                </div>
              </div>
              {value && <p className="mb-3 text-[12.5px] text-muted">{packs * 10} cards of ₦{value.toLocaleString()} each.</p>}
            </>
          )}

          <PaySummary fee={fee} amount={total} payWith="wallet" balance={balance} label="Recharge cards" />
          <button type="submit" disabled={purchase.isPending}
                  className="flex h-12 w-full items-center justify-center rounded-[11px] bg-brand-red text-[15px] font-semibold text-white disabled:opacity-60">
            {purchase.isPending ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : value ? `Pay ₦${(total + fee).toLocaleString()}` : "Buy cards"}
          </button>
          <p className="mt-3 text-center text-[12px] text-muted">Paid from your O.A.M wallet. You'll get a printable image of your cards.</p>
        </form>
      </main>
    </div>
  );
}
