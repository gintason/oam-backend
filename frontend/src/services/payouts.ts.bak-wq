/**
 * Payouts API — /api/v1/payouts/. Withdraw wallet funds to a Nigerian bank.
 * Requires a verified user.
 *
 * Flow: list banks -> resolve account (shows the real account name) -> save the
 * account -> withdraw from it.
 */
import { api } from "../lib/api";
import type { Paginated } from "./types";

export type Bank = { code: string; name: string; [k: string]: unknown };

export type BankAccount = {
  id: string;
  bank_code: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  currency: string;
  is_active: boolean;
  created_at: string;
};

export type Withdrawal = {
  id: string;
  amount: string;
  currency: string;
  status: string;
  reference?: string;
  bank_account?: string;
  account_name?: string;
  created_at: string;
  [k: string]: unknown;
};

export const payoutsApi = {
  /**
   * Banks supported by the payout provider.
   *
   * Providers differ in what they return, so this normalizes aggressively:
   * the list may arrive as an array, {banks:[...]}, {data:[...]} or
   * {results:[...]}, and each entry may name its fields name/bank_name/label
   * and code/bank_code/slug/id. We map everything to {code, name} and drop
   * anything unusable, so the picker always has something sane to show.
   */
  async getBanks(currency = "NGN"): Promise<Bank[]> {
    const { data } = await api.get("/payouts/banks-list/", { params: { currency } });

    const raw: unknown =
      Array.isArray(data) ? data
      : data?.banks ?? data?.data ?? data?.results ?? [];

    const list = Array.isArray(raw) ? raw : [];

    return list
      .map((b) => {
        if (typeof b === "string") return { code: b, name: b } as Bank;
        const o = (b ?? {}) as Record<string, unknown>;
        const name = o.name ?? o.bank_name ?? o.label ?? o.title ?? o.slug ?? "";
        const code = o.code ?? o.bank_code ?? o.slug ?? o.id ?? o.value ?? "";
        return { ...o, code: String(code), name: String(name) } as Bank;
      })
      .filter((b) => b.name && b.code);
  },

  /** Preview the account holder's name before saving. */
  async resolveAccount(input: { bank_code: string; account_number: string; currency?: string }) {
    const { data } = await api.post("/payouts/resolve-account/", {
      currency: "NGN",
      ...input,
    });
    return data as { account_name?: string; detail?: string; [k: string]: unknown };
  },

  /** Saved payout accounts. */
  async getBankAccounts(): Promise<BankAccount[]> {
    const { data } = await api.get<Paginated<BankAccount> | BankAccount[]>("/payouts/banks/");
    return Array.isArray(data) ? data : data.results ?? [];
  },

  /** Resolve + save a payout account. */
  async addBankAccount(input: { bank_code: string; account_number: string; currency?: string }): Promise<BankAccount> {
    const { data } = await api.post<BankAccount>("/payouts/banks/", {
      currency: "NGN",
      ...input,
    });
    return data;
  },

  /** Send money from the wallet to a saved bank account. Requires the PIN. */
  async withdraw(input: { bank_account_id: string; amount: number | string; pin: string; currency?: string }): Promise<Withdrawal> {
    const { data } = await api.post<Withdrawal>("/payouts/withdrawals/", {
      currency: "NGN",
      ...input,
    });
    return data;
  },

  async history(): Promise<Withdrawal[]> {
    const { data } = await api.get<Paginated<Withdrawal> | Withdrawal[]>("/payouts/withdrawals/history/");
    return Array.isArray(data) ? data : data.results ?? [];
  },
};
