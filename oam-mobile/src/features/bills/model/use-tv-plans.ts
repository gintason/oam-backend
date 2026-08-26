import { useQuery } from "@tanstack/react-query";
import { billsApi } from "../api/bills-api";

export function useTvPlans(provider?: string) {
  return useQuery({
    queryKey: ["tv-plans", provider],
    queryFn: () => billsApi.getTvPlans(provider as string),
    enabled: Boolean(provider),
    staleTime: 5 * 60_000,
  });
}
