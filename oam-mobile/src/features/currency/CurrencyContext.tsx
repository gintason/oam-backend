import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * DISPLAY-ONLY currency conversion for the mobile app — mirrors the web
 * CurrencyContext.
 *  - All real amounts are in Naira (NGN), the base currency.
 *  - Selecting another currency only changes how balances/prices are DISPLAYED,
 *    using an exchange rate. Wallet funding and checkout still settle in NGN.
 *  - Converted values are INDICATIVE and labelled as such near money.
 *
 * Rates are PLACEHOLDERS ("how many units of the currency per 1 NGN"). Wire a
 * live FX feed (or a backend rates endpoint) into refreshRates() later; keep
 * these in sync with the web CurrencyContext so both platforms agree.
 */
export type CurrencyCode = "NGN" | "USD" | "GBP" | "EUR";

export type Currency = {
  code: CurrencyCode;
  label: string;
  symbol: string;
  perNGN: number; // 1 NGN = perNGN units of this currency (PLACEHOLDER)
};

export const CURRENCIES: Record<CurrencyCode, Currency> = {
  NGN: { code: "NGN", label: "Nigerian Naira", symbol: "₦", perNGN: 1 },
  USD: { code: "USD", label: "US Dollar", symbol: "$", perNGN: 0.00065 },
  GBP: { code: "GBP", label: "British Pound", symbol: "£", perNGN: 0.00051 },
  EUR: { code: "EUR", label: "Euro", symbol: "€", perNGN: 0.0006 },
};

export const CURRENCY_ORDER: CurrencyCode[] = ["NGN", "USD", "GBP", "EUR"];
const STORAGE_KEY = "oam_currency";

type Ctx = {
  currency: Currency;
  setCurrency: (c: CurrencyCode) => void;
  /** Convert a base NGN amount and format it in the active display currency. */
  format: (amountNGN: number | string) => string;
  /** True when showing a non-base currency (so callers can add a "≈" / note). */
  isConverted: boolean;
};

const CurrencyCtx = createContext<Ctx | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [code, setCode] = useState<CurrencyCode>("NGN");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (v && v in CURRENCIES) setCode(v as CurrencyCode);
      })
      .catch(() => {
        /* keep default NGN */
      });
  }, []);

  function choose(c: CurrencyCode) {
    setCode(c);
    AsyncStorage.setItem(STORAGE_KEY, c).catch(() => {});
  }

  const currency = CURRENCIES[code];

  function format(amount: number | string): string {
    const base = typeof amount === "string" ? Number(amount) || 0 : amount;
    const value = base * currency.perNGN;
    const digits = currency.code === "NGN" || value >= 1000 ? 0 : 2;
    const num = Number(value).toLocaleString(undefined, {
      maximumFractionDigits: digits,
      minimumFractionDigits: digits,
    });
    return `${currency.symbol}${num}`;
  }

  return (
    <CurrencyCtx.Provider value={{ currency, setCurrency: choose, format, isConverted: code !== "NGN" }}>
      {children}
    </CurrencyCtx.Provider>
  );
}

export function useCurrency(): Ctx {
  const ctx = useContext(CurrencyCtx);
  if (!ctx) throw new Error("useCurrency must be used within <CurrencyProvider>");
  return ctx;
}
