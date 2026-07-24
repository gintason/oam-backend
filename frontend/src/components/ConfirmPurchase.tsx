import { AlertCircle, X } from "lucide-react";

/**
 * Final confirmation before money moves.
 *
 * A mistyped digit on a phone number or meter sends real money to a stranger
 * and generally can't be reversed, so restating the whole purchase in plain
 * language is a cheap safeguard against an expensive mistake.
 */
export default function ConfirmPurchase({
  open, title, lines, confirmLabel, onConfirm, onCancel, pending,
}: {
  open: boolean;
  title: string;
  lines: { label: string; value: string }[];
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  pending?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" role="dialog" aria-modal="true">
      <div className="w-full max-w-sm rounded-2xl bg-paper p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-display text-[17px] font-semibold text-ink">{title}</h2>
          <button onClick={onCancel} aria-label="Close" className="-mr-1 -mt-1 rounded-lg p-1 text-muted transition hover:bg-mist hover:text-ink">
            <X size={17} />
          </button>
        </div>

        <dl className="mt-4 space-y-2 rounded-xl bg-mist p-3.5 text-[13px]">
          {lines.map((l) => (
            <div key={l.label} className="flex justify-between gap-3">
              <dt className="shrink-0 text-muted">{l.label}</dt>
              <dd className="text-right font-medium text-ink">{l.value}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-3 flex items-start gap-1.5 text-[12px] leading-relaxed text-muted">
          <AlertCircle size={13} strokeWidth={1.75} className="mt-0.5 shrink-0" />
          Check the details carefully — completed purchases can't be reversed.
        </p>

        <div className="mt-4 flex gap-2">
          <button onClick={onCancel} className="h-11 flex-1 rounded-[11px] border border-hairline bg-paper text-[14px] font-medium text-ink transition hover:bg-mist">
            Go back
          </button>
          <button
            onClick={onConfirm}
            disabled={pending}
            className="h-11 flex-1 rounded-[11px] bg-brand-red text-[14px] font-semibold text-white transition hover:brightness-95 disabled:opacity-60"
          >
            {pending ? <span className="mx-auto block h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
