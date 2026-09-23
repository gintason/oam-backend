import { api } from "../lib/api";

export type Notification = {
  id: number;
  kind: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
};

export const notificationsApi = {
  list: (): Promise<Notification[]> =>
    api.get<Notification[]>("/notifications/").then((r) => r.data),
  unread: (): Promise<number> =>
    api.get<{ unread: number }>("/notifications/unread/").then((r) => r.data.unread ?? 0),
  markRead: (ids?: number[]): Promise<void> =>
    api.post("/notifications/read/", ids ? { ids } : {}).then(() => undefined),
};
