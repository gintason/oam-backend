import { api } from "@/shared/api";

export type Bank = { code: string; name: string; [k: string]: unknown };
export type BankAccount = {
  id: string; bank_code: string; bank_name: string; account_number: string;
  account_name: string; currency: string; is_active: boolean; created_at: string;
};
export type Withdrawal = {
  id: string; amount: string; currency: string; status: string;
  reference?: string; account_name?: string; failure_reason?: string; created_at: string;
  [k: string]: unknown;
};

export const payoutsApi = {
  /** Banks — normalized aggressively (providers differ in shape). */
  getBanks: (currency = "NGN") =>
    api.get("/payouts/banks-list/", { params: { currency } }).then((r) => {
      const data = r.data as Record<string, unknown> | unknown[];
      const raw: unknown = Array.isArray(data)
        ? data
        : (data as Record<string, unknown>)?.banks ??
          (data as Record<string, unknown>)?.data ??
          (data as Record<string, unknown>)?.results ??
          [];
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
    }),

  resolveAccount: (input: { bank_code: string; account_number: string; currency?: string }) =>
    api
      .post("/payouts/resolve-account/", { currency: "NGN", ...input })
      .then((r) => r.data as { account_name?: string; name?: string; detail?: string; [k: string]: unknown }),

  getBankAccounts: () =>
    api
      .get<BankAccount[] | { results: BankAccount[] }>("/payouts/banks/")
      .then((r) => (Array.isArray(r.data) ? r.data : r.data.results ?? [])),

  addBankAccount: (input: { bank_code: string; account_number: string; currency?: string }) =>
    api.post<BankAccount>("/payouts/banks/", { currency: "NGN", ...input }).then((r) => r.data),

  withdraw: (input: { bank_account_id: string; amount: number | string; currency?: string }) =>
    api.post<Withdrawal>("/payouts/withdrawals/", { currency: "NGN", ...input }).then((r) => r.data),
};
