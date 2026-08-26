import { api } from "@/shared/api";
import type { WalletTransfer } from "@/entities/wallet";

export const transferApi = {
  /** Who would receive this? Shows the name before any money moves. */
  resolve: (identifier: string) =>
    api.post<{ name: string; identifier: string }>("/wallet/transfer/resolve/", { identifier }).then((r) => r.data),

  send: (input: { identifier: string; amount: number | string; currency?: string; note?: string }) =>
    api.post<WalletTransfer>("/wallet/transfer/", { currency: "NGN", ...input }).then((r) => r.data),

  history: () =>
    api.get<{ results: WalletTransfer[] }>("/wallet/transfers/").then((r) => r.data.results ?? []),
};
