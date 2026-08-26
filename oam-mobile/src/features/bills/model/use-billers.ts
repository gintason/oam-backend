import { useQuery } from "@tanstack/react-query";
import { billsApi } from "../api/bills-api";

export function useBillers(category: string) {
  return useQuery({
    queryKey: ["billers", category],
    queryFn: () => billsApi.listBillers(category),
    staleTime: 5 * 60_000,
  });
}
