import { api } from "@/shared/api";

export type AppNotification = {
  id: number;
  kind: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
};

export const notificationsApi = {
  list: () => api.get<AppNotification[]>("/notifications/").then((r) => r.data),
  unread: () => api.get<{ unread: number }>("/notifications/unread/").then((r) => r.data.unread ?? 0),
  markRead: (ids?: number[]) => api.post("/notifications/read/", ids ? { ids } : {}).then(() => undefined),
};
