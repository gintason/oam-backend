import { useQuery } from "@tanstack/react-query";
import type { Wallet } from "@/entities/wallet";
import { walletApi } from "../api/wallet-api";

export function useWallets() {
  return useQuery({
    queryKey: ["wallets"],
    queryFn: walletApi.getWallets,
    staleTime: 30_000,
  });
}

/** The headline wallet: prefer NGN, else the first one. */
export function pickHeadline(wallets?: Wallet[]): Wallet | undefined {
  if (!wallets?.length) return undefined;
  return wallets.find((w) => w.currency === "NGN") ?? wallets[0];
}

export function useTransactions(currency?: string) {
  return useQuery({
    queryKey: ["transactions", currency],
    queryFn: () => walletApi.getTransactions(currency as string),
    enabled: Boolean(currency),
    staleTime: 30_000,
  });
}
