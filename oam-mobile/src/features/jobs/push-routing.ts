/**
 * Open the right screen when a jobs push notification is tapped.
 *
 * The backend tags every jobs push with data.module = "jobs" and a `type`
 * (see apps/jobs/services.py). Mounted once in the root layout; handles taps
 * while the app is running and the tap that cold-started it.
 */
import { useEffect } from "react";
import Constants from "expo-constants";
import { router } from "expo-router";

type Data = Record<string, unknown>;

export function routeForJobsPush(data: Data | undefined): { pathname: string; params?: Record<string, string> } | null {
  if (!data || data.module !== "jobs") return null;
  const str = (k: string) => (typeof data[k] === "string" ? (data[k] as string) : "");
  switch (data.type) {
    case "chat.message":
      return str("thread_id") ? { pathname: "/jobs-chat", params: { id: str("thread_id") } } : { pathname: "/jobs-messages" };
    case "application.created":
      return str("job_id") ? { pathname: "/jobs-pipeline", params: { id: str("job_id") } } : { pathname: "/jobs-employer" };
    case "application.updated":
      return { pathname: "/jobs-applications" };
    case "job_alert": {
      const ids = Array.isArray(data.job_ids) ? (data.job_ids as string[]) : [];
      return ids.length === 1 ? { pathname: "/job", params: { id: ids[0] } } : { pathname: "/jobs-saved" };
    }
    case "job.expired":
    case "jobs.plan_expiring":
      return { pathname: "/jobs-employer" };
    case "jobs.payment":
      return { pathname: "/jobs-plans" };
    default:
      return { pathname: "/jobs" };
  }
}

const isExpoGo = Constants.appOwnership === "expo";

export function useJobsPushRouting(enabled: boolean) {
  useEffect(() => {
    if (!enabled || isExpoGo) return;
    let sub: { remove: () => void } | undefined;
    let cancelled = false;
    (async () => {
      try {
        const Notifications = await import("expo-notifications");
        const go = (data: Data | undefined) => {
          const r = routeForJobsPush(data);
          if (r) router.push(r as never);
        };
        const last = await Notifications.getLastNotificationResponseAsync();
        if (!cancelled && last) go(last.notification.request.content.data as Data);
        sub = Notifications.addNotificationResponseReceivedListener((resp) =>
          go(resp.notification.request.content.data as Data));
      } catch {
        /* notifications unavailable — nothing to route */
      }
    })();
    return () => { cancelled = true; sub?.remove(); };
  }, [enabled]);
}
