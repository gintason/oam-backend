import { useAuth } from "./AuthContext";

/**
 * A stable per-user token for query keys.
 *
 * Cached queries are keyed by their queryKey alone, so two different people
 * using the same browser would otherwise share cache entries — which is exactly
 * how one account came to display another's wallet balance. Including this in
 * every user-specific key makes that structurally impossible, independently of
 * whether the cache was cleared on sign-out.
 *
 * Convention: put it SECOND, e.g. ["wallet", scope, "list"], so existing
 * prefix invalidations like invalidateQueries({ queryKey: ["wallet"] })
 * continue to match.
 */
export function useUserScope(): string {
  const { user } = useAuth();
  return user?.id ? String(user.id) : "anon";
}
