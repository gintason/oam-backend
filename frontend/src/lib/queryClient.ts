/**
 * TanStack Query client. Central cache + defaults for all server data fetching.
 *
 * Defaults chosen for a super-app:
 *  - staleTime 60s: data stays "fresh" for a minute, so switching tabs/pages
 *    doesn't refetch constantly.
 *  - retry once: transient network blips retry, but a real error surfaces fast.
 *  - refetchOnWindowFocus off: avoids surprise refetches when the user tabs back.
 */
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
