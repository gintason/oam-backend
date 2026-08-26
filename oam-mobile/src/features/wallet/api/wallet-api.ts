import { api } from "@/shared/api";
import type { Transaction, WalletsResponse } from "@/entities/wallet";

export const walletApi = {
  getWallets: () => api.get<WalletsResponse>("/wallet/").then((r) => r.data),

  getTransactions: (currency: string) =>
    api
      .get<Transaction[] | { results: Transaction[] }>(`/wallet/${currency}/transactions/`)
      .then((r) => (Array.isArray(r.data) ? r.data : r.data.results ?? [])),
};
