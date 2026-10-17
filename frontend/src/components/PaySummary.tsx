import { AlertCircle, Wallet as WalletIcon } from "lucide-react";
import { money, naira } from "../lib/format";

/**
 * "Amount / Fee / Total" shown directly above the pay button, plus the wallet
 * balance when paying from wallet.
 *
 * Airtime/data carry no fee (OAM's margin is the biller's discount); cable TV
 * and electricity add a small flat service fee. Either way the fee and total
 * are stated up front — unexpected charges are the single biggest source of
 * distrust in Nigerian payment apps.
 */
export default function PaySummary({
  amount,
  payWith,
  balance,
  currency = "NGN",
  label = "Amount",
  fee = 0,
}: {
  amount: number;
  fee?: number;
  payWith: "wallet" | "card";
  balance?: string | number;
  currency?: string;
  label?: string;
}) {
  if (!amount || amount <= 0) return null;
  const total = amount + (fee > 0 ? fee : 0);
  const insufficient = payWith === "wallet" && balance !== undefined && Number(balance) < total;

  return (
    <div className="mt-5 rounded-xl border border-hairline bg-mist/60 p-3.5">
      <dl className="space-y-1.5 text-[13px]">
        <div className="flex justify-between">
          <dt className="text-muted">{label}</dt>
          <dd className="tabular font-medium text-ink">{naira(amount)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted">{fee > 0 ? "Service fee" : "Fee"}</dt>
          <dd className={`tabular font-medium ${fee > 0 ? "text-ink" : "text-brand-green"}`}>{naira(fee > 0 ? fee : 0)}</dd>
        </div>
        <div className="flex justify-between border-t border-hairline pt-1.5">
          <dt className="font-semibold text-ink">Total</dt>
          <dd className="tabular text-[15px] font-bold text-ink">{naira(total)}</dd>
        </div>
      </dl>

      {payWith === "wallet" && balance !== undefined && (
        <div className={`mt-2.5 flex items-center gap-1.5 border-t border-hairline pt-2.5 text-[12.5px] ${insufficient ? "text-danger" : "text-muted"}`}>
          {insufficient ? <AlertCircle size={13} strokeWidth={2} /> : <WalletIcon size={13} strokeWidth={1.75} />}
          <span>
            Wallet balance: <span className="font-medium">{money(balance, currency)}</span>
            {insufficient && " — not enough for this purchase"}
          </span>
        </div>
      )}
    </div>
  );
}
