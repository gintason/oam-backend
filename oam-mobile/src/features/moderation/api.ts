import { api } from "@/shared/api";

/** What can be reported. "conversation"/"jobchat" = the other person in that chat. */
export type ReportTarget = "listing" | "artisan" | "comment" | "conversation" | "jobchat" | "message" | "user";

export type BlockedUser = { user_id: string; name: string; created_at: string };

export const moderationApi = {
  report: async (body: { target_type: ReportTarget; target_id: string; reason: string; details?: string; block?: boolean }) =>
    (await api.post("/moderation/reports/", body)).data as { ok: boolean; blocked: boolean; detail: string },
  block: async (target_type: ReportTarget, target_id: string) =>
    (await api.post("/moderation/blocks/", { target_type, target_id })).data as { ok: boolean; user_id: string; name: string; detail: string },
  blocked: async () => (await api.get("/moderation/blocks/")).data.results as BlockedUser[],
  unblock: async (userId: string) => { await api.delete(`/moderation/blocks/${userId}/`); },
};
