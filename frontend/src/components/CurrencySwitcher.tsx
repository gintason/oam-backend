import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { CURRENCIES, useCurrency, type CurrencyCode } from "../currency/CurrencyContext";

/**
 * Currency switcher for the navbar. Display-only: changes how prices show,
 * not how transactions settle (those stay in NGN). Sits after the language
 * switcher.
 */

const ORDER: CurrencyCode[] = ["NGN", "USD", "GBP", "EUR"];

export default function CurrencySwitcher({ inline = false }: { inline?: boolean }) {
  const { currency, setCurrency } = useCurrency();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div className={inline ? "relative w-full" : "relative"} ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Change display currency"
        className={`inline-flex h-10 items-center gap-1.5 rounded-lg border border-hairline bg-paper px-3 text-sm font-medium text-ink transition hover:bg-mist ${inline ? "w-full justify-between" : "h-9"}`}
      >
        <span className="text-[15px] leading-none">{currency.symbol}</span>
        <span className={inline ? "inline" : "hidden sm:inline"}>{currency.code}</span>
        <ChevronDown
          size={14}
          strokeWidth={1.75}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Select display currency"
          className={
            inline
              ? "mt-2 w-full rounded-xl border border-hairline bg-paper p-1.5"
              : "absolute right-0 z-40 mt-2 w-60 rounded-xl border border-hairline bg-paper p-1.5 shadow-lg"
          }
        >
          {ORDER.map((code) => {
            const c = CURRENCIES[code];
            const selected = code === currency.code;
            return (
              <button
                key={code}
                role="option"
                aria-selected={selected}
                onClick={() => {
                  setCurrency(code);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${
                  selected ? "bg-mist" : "hover:bg-mist"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-mist text-[13px] font-semibold text-ink">
                    {c.symbol}
                  </span>
                  <span className="flex flex-col">
                    <span className="font-medium text-ink">{c.code}</span>
                    <span className="text-[12px] text-muted">{c.label}</span>
                  </span>
                </span>
                {selected && <Check size={16} strokeWidth={2} className="text-brand-green" />}
              </button>
            );
          })}
          <p className="px-3 py-2 text-[11px] leading-snug text-muted">
            Prices shown are indicative. Payments are processed in Naira (₦).
          </p>
        </div>
      )}
    </div>
  );
}
