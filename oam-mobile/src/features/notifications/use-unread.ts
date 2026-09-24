import { useQuery } from "@tanstack/react-query";
import { notificationsApi } from "./notifications-api";

/** Polls the unread notification count for the dashboard bell badge. */
export function useUnreadNotifications() {
  return useQuery({
    queryKey: ["notifications", "unread"],
    queryFn: notificationsApi.unread,
    refetchInterval: 30000,
    retry: false,
  }).data ?? 0;
}
