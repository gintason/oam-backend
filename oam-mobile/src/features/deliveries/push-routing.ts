/**
 * Open the right screen when a delivery push is tapped. The backend tags every
 * delivery push with data.module = "deliveries" (apps/deliveries/events.py).
 * Mounted once in the root layout, next to the jobs push router.
 */
import { useEffect } from "react";
import Constants from "expo-constants";
import { router } from "expo-router";

type Data = Record<string, unknown>;

export function routeForDeliveriesPush(data: Data | undefined): { pathname: string; params?: Record<string, string> } | null {
  if (!data || data.module !== "deliveries") return null;
  const id = typeof data.delivery_id === "string" ? data.delivery_id : "";
  const type = String(data.type ?? "");
  if (type === "delivery.offer") return { pathname: "/rider" };
  if (type === "delivery.earned") return { pathname: "/rider-earnings" };
  if (type.startsWith("rider.")) return { pathname: "/rider" };
  if (type === "delivery.cancelled") return id ? { pathname: "/delivery", params: { id } } : { pathname: "/deliveries" };
  return id ? { pathname: "/delivery", params: { id } } : { pathname: "/deliveries" };
}

const isExpoGo = Constants.appOwnership === "expo";

export function useDeliveriesPushRouting(enabled: boolean) {
  useEffect(() => {
    if (!enabled || isExpoGo) return;
    let sub: { remove: () => void } | undefined;
    let cancelled = false;
    (async () => {
      try {
        const Notifications = await import("expo-notifications");
        const go = (data: Data | undefined) => {
          const r = routeForDeliveriesPush(data);
          if (r) router.push(r as never);
        };
        const last = await Notifications.getLastNotificationResponseAsync();
        if (!cancelled && last) go(last.notification.request.content.data as Data);
        sub = Notifications.addNotificationResponseReceivedListener((resp) =>
          go(resp.notification.request.content.data as Data));
      } catch {
        /* notifications unavailable */
      }
    })();
    return () => { cancelled = true; sub?.remove(); };
  }, [enabled]);
}
