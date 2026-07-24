import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

/**
 * DISPLAY-ONLY currency conversion.
 *  - All real amounts in the app are in Naira (NGN), the base currency.
 *  - Selecting another currency only changes how prices are DISPLAYED, using an
 *    exchange rate. Transactions/checkout remain in NGN.
 *  - Converted values are INDICATIVE and should be labelled as such near money.
 *
 * Rates below are PLACEHOLDERS. Wire a live FX feed in refreshRates() later
 * (e.g. exchangerate.host, openexchangerates, or your own backend endpoint).
 * Rates are "how many units of the currency per 1 NGN".
 */

export type CurrencyCode = "NGN" | "USD" | "GBP" | "EUR";

export type Currency = {
  code: CurrencyCode;
  label: string;
  symbol: string;
  locale: string;
  perNGN: number; // 1 NGN = perNGN units of this currency (PLACEHOLDER)
};

export const CURRENCIES: Record<CurrencyCode, Currency> = {
  NGN: { code: "NGN", label: "Nigerian Naira", symbol: "₦", locale: "en-NG", perNGN: 1 },
  USD: { code: "USD", label: "US Dollar",      symbol: "$", locale: "en-US", perNGN: 0.00065 },
  GBP: { code: "GBP", label: "British Pound",  symbol: "£", locale: "en-GB", perNGN: 0.00051 },
  EUR: { code: "EUR", label: "Euro",           symbol: "€", locale: "en-IE", perNGN: 0.00060 },
};

type Ctx = {
  currency: Currency;
  setCurrency: (c: CurrencyCode) => void;
  /** Convert a base NGN amount and format it in the active currency. */
  format: (amountNGN: number) => string;
  /** True when showing a non-base currency (so callers can add a "≈" / note). */
  isConverted: boolean;
};

const CurrencyCtx = createContext<Ctx | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [code, setCode] = useState<CurrencyCode>("NGN");
  const [rates, setRates] = useState(CURRENCIES);

  // Placeholder for a live FX feed. Call your API here and setRates(...).
  useEffect(() => {
    // Example wiring (left disabled on purpose):
    // fetch("https://api.exchangerate.host/latest?base=NGN&symbols=USD,GBP,EUR")
    //   .then(r => r.json())
    //   .then(d => setRates(prev => ({
    //     ...prev,
    //     USD: { ...prev.USD, perNGN: d.rates.USD },
    //     GBP: { ...prev.GBP, perNGN: d.rates.GBP },
    //     EUR: { ...prev.EUR, perNGN: d.rates.EUR },
    //   })))
    //   .catch(() => { /* keep placeholder rates on failure */ });
  }, []);

  const currency = rates[code];

  function format(amountNGN: number): string {
    const converted = amountNGN * currency.perNGN;
    // NGN and other majors: no decimals for large sums reads cleaner; keep 2 for small.
    const maximumFractionDigits = converted >= 1000 ? 0 : 2;
    try {
      return new Intl.NumberFormat(currency.locale, {
        style: "currency",
        currency: currency.code,
        maximumFractionDigits,
      }).format(converted);
    } catch {
      // Fallback if Intl currency unsupported
      return `${currency.symbol}${converted.toLocaleString(undefined, { maximumFractionDigits })}`;
    }
  }

  return (
    <CurrencyCtx.Provider
      value={{ currency, setCurrency: setCode, format, isConverted: code !== "NGN" }}
    >
      {children}
    </CurrencyCtx.Provider>
  );
}

export function useCurrency(): Ctx {
  const ctx = useContext(CurrencyCtx);
  if (!ctx) throw new Error("useCurrency must be used within <CurrencyProvider>");
  return ctx;
}
