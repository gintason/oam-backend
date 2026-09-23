import { useState, useRef, useEffect } from "react";
import { Bell } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { notificationsApi } from "../services/notifications";
import { useUserScope } from "../auth/useUserScope";

/** Bell icon + red unread badge + dropdown panel of recent notifications. */
export default function NotificationBell() {
  const { t } = useTranslation();
  const scope = useUserScope();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const unread = useQuery({
    queryKey: ["notifications", scope, "unread"],
    queryFn: notificationsApi.unread,
    refetchInterval: 30000,
    retry: false,
  }).data ?? 0;

  const list = useQuery({
    queryKey: ["notifications", scope, "list"],
    queryFn: notificationsApi.list,
    enabled: open,
    retry: false,
  });

  const markRead = useMutation({
    mutationFn: () => notificationsApi.markRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications", scope, "unread"] });
      qc.invalidateQueries({ queryKey: ["notifications", scope, "list"] });
    },
  });

  // Mark everything read when the panel opens.
  useEffect(() => { if (open && unread > 0) markRead.mutate(); /* eslint-disable-next-line */ }, [open]);

  // Close on outside click.
  useEffect(() => {
    function onDoc(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        title={t("header.nav.notifications", "Notifications")}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-ink transition hover:bg-mist"
      >
        <Bell size={19} strokeWidth={1.9} />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-red px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 max-w-[90vw] overflow-hidden rounded-xl border border-hairline bg-paper shadow-lg">
          <div className="border-b border-hairline px-4 py-3">
            <p className="text-[13.5px] font-semibold text-ink">{t("notifications.title", "Notifications")}</p>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {list.isLoading ? (
              <p className="px-4 py-6 text-center text-[13px] text-muted">{t("common.loading", "Loading…")}</p>
            ) : list.data && list.data.length > 0 ? (
              list.data.map((n) => (
                <div key={n.id} className={`border-b border-hairline px-4 py-3 ${n.is_read ? "" : "bg-brand-green/5"}`}>
                  <p className="text-[13px] font-semibold text-ink">{n.title}</p>
                  {n.body && <p className="mt-0.5 text-[12.5px] text-muted">{n.body}</p>}
                  <p className="mt-1 text-[11px] text-muted">{new Date(n.created_at).toLocaleString()}</p>
                </div>
              ))
            ) : (
              <p className="px-4 py-8 text-center text-[13px] text-muted">{t("notifications.empty", "No notifications yet.")}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
