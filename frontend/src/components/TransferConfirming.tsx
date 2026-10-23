import { Clock3, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * Shown between "Send" and the receipt while the bank confirms a transfer, so a
 * receipt only ever appears for a transfer that has actually gone through.
 * `slow` = the bank hasn't confirmed within about a minute.
 */
export function TransferConfirming({ amount, to, slow, onDone }: {
  amount: string; to: string; slow: boolean; onDone: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="rounded-2xl border border-hairline bg-paper p-6 text-center">
      <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${slow ? "bg-amber-600/10" : "bg-brand-green/10"}`}>
        {slow ? <Clock3 size={28} className="text-amber-700" /> : <Loader2 size={28} className="animate-spin text-brand-green" />}
      </div>
      <h2 className="mt-3 font-display text-lg font-semibold text-ink">
        {slow ? t("withdraw.confirm.slowTitle", "Your transfer is on its way")
              : t("withdraw.confirm.title", "Confirming your transfer…")}
      </h2>
      <p className="mt-1 text-[17px] font-semibold text-ink">₦{amount}</p>
      {to && <p className="text-[13px] text-muted">{to}</p>}
      <p className="mt-3 text-[14px] leading-relaxed text-muted">
        {slow ? t("withdraw.confirm.slowBody", "The bank hasn't confirmed it yet. Most transfers arrive within minutes — you can follow it in your wallet history. If it fails, the money comes back to your wallet automatically.")
              : t("withdraw.confirm.body", "Waiting for the bank to confirm. This usually takes a few seconds.")}
      </p>
      {slow && (
        <button onClick={onDone} className="mt-5 h-11 w-full rounded-[11px] bg-brand-green text-[14px] font-semibold text-white">
          {t("withdraw.queue.done")}
        </button>
      )}
    </div>
  );
}
