/**
 * Wallet API service — typed calls to /api/v1/wallet/.
 * NOTE: these endpoints require a VERIFIED user (IsVerified). Callers should
 * only fetch when the user is verified, or handle a 403 gracefully.
 */
import { api } from "../lib/api";
import type { Paginated } from "./types";

export type Wallet = {
  id: string;
  currency: string;         // "NGN", "USD", ...
  balance: string;          // Decimal as string, e.g. "19610.00"
  updated_at: string;
};

export type WalletsResponse = {
  default_currency: string;
  default_currency_source: string;
  wallets: Wallet[];
};

export type Transaction = {
  id: string;
  direction: "debit" | "credit";
  amount: string;           // always positive Decimal string
  currency: string;
  description: string;
  reference: string;
  created_at: string;
};

export const walletApi = {
  async getWallets(): Promise<WalletsResponse> {
    const { data } = await api.get<WalletsResponse>("/wallet/");
    return data;
  },

  /** Which currency we'd default this user to, plus the supported list. */
  async getDefaultCurrency(): Promise<{ currency: string; source: string; supported: string[] }> {
    const { data } = await api.get("/wallet/default-currency/");
    return data;
  },

  /** Open a wallet in another supported currency. */
  async openWallet(currency: string): Promise<Wallet> {
    const { data } = await api.post<Wallet>("/wallet/", { currency: currency.toUpperCase() });
    return data;
  },

  async getTransactions(currency: string): Promise<Paginated<Transaction>> {
    const { data } = await api.get<Paginated<Transaction>>(
      `/wallet/${currency.toUpperCase()}/transactions/`
    );
    return data;
  },

  /** Whether the user has set a transaction PIN yet. */
  async getPinStatus(): Promise<{ has_pin: boolean }> {
    const { data } = await api.get<{ has_pin: boolean }>("/wallet/pin/");
    return data;
  },

  /**
   * Set (first time) or change the transaction PIN.
   * First-time set needs the account `password`; a change needs `current_pin`.
   */
  async setPin(input: { pin: string; password?: string; current_pin?: string }): Promise<{ has_pin: boolean }> {
    const { data } = await api.post<{ has_pin: boolean }>("/wallet/pin/", input);
    return data;
  },
};

/** Symbols for native-currency balance display (real money, not converted). */
const SYMBOLS: Record<string, string> = { NGN: "₦", USD: "$", GBP: "£", EUR: "€" };

/** Format a wallet balance in its own currency (e.g. "19610.00" -> "₦19,610.00"). */
export function formatBalance(amount: string | number, currency: string): string {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  const symbol = SYMBOLS[currency.toUpperCase()] ?? "";
  return `${symbol}${n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/* ------------------------------------------------------------------ */
/* Wallet-to-wallet transfers (P2P)                                    */
/* ------------------------------------------------------------------ */

export type WalletTransfer = {
  id: string;
  amount: string;
  currency: string;
  note: string;
  reference: string;
  direction: "in" | "out";
  counterparty: string;
  created_at: string;
};

export const transferApi = {
  /** Who would receive this? Shows the name before any money moves. */
  async resolve(identifier: string): Promise<{ name: string; identifier: string }> {
    const { data } = await api.post("/wallet/transfer/resolve/", { identifier });
    return data;
  },

  async send(input: {
    identifier: string;
    amount: number | string;
    currency?: string;
    note?: string;
  }): Promise<WalletTransfer> {
    const { data } = await api.post<WalletTransfer>("/wallet/transfer/", {
      currency: "NGN",
      ...input,
    });
    return data;
  },

  async history(): Promise<WalletTransfer[]> {
    const { data } = await api.get<{ results: WalletTransfer[] }>("/wallet/transfers/");
    return data.results ?? [];
  },
};
