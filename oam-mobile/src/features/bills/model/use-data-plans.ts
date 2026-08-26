import { useQuery } from "@tanstack/react-query";
import { billsApi } from "../api/bills-api";

export function useDataPlans(network?: string) {
  return useQuery({
    queryKey: ["data-plans", network],
    queryFn: () => billsApi.getDataPlans(network as string),
    enabled: Boolean(network),
    staleTime: 5 * 60_000,
  });
}
