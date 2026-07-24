import { useState } from "react";
import { Copy, Check, KeyRound } from "lucide-react";

/**
 * Prominent display for a prepaid electricity token.
 *
 * The token IS the product — if the customer loses it, they've paid for
 * nothing they can use. So it's shown large, monospaced, grouped in fours for
 * keypad entry, and copyable in one tap. It's also stored on the order, so it
 * can always be retrieved from order history.
 */
export default function TokenCard({ token, units }: { token: string; units?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — the number is on screen to type manually */
    }
  }

  // Group digits in fours so it's easy to read off while typing into a meter.
  const pretty = token.replace(/\s|-/g, "").replace(/(.{4})/g, "$1 ").trim();

  return (
    <div className="rounded-2xl border-2 border-brand-green/30 bg-brand-green/[0.04] p-5">
      <div className="flex items-center justify-center gap-1.5 text-[12.5px] font-semibold uppercase tracking-wide text-brand-green">
        <KeyRound size={14} strokeWidth={2} />
        Your recharge token
      </div>

      <div className="mt-3 select-all break-all text-center font-mono text-[22px] font-bold leading-snug tracking-wider text-ink sm:text-[26px]">
        {pretty}
      </div>

      {units && (
        <p className="mt-2 text-center text-[13px] text-muted">
          <span className="font-semibold text-ink">{units}</span> units
        </p>
      )}

      <button
        type="button"
        onClick={copy}
        className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-[11px] bg-brand-green text-[14px] font-semibold text-white transition hover:brightness-95"
      >
        {copied ? <><Check size={16} strokeWidth={2.5} /> Copied</> : <><Copy size={15} strokeWidth={2} /> Copy token</>}
      </button>

      <p className="mt-3 text-center text-[12px] text-muted">
        Type this into your meter keypad. It's saved in your order history, so you
        can come back to it any time.
      </p>
    </div>
  );
}
