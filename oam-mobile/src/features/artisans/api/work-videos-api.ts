import { api } from "@/shared/api";

export type WorkVideo = {
  id: string; video_url: string; public_id: string; caption: string;
  status: "pending" | "approved" | "rejected"; review_note: string; created_at: string;
};

/** The signed-in artisan's own "previous work" videos. Approved ones show on the public profile. */
export const workVideosApi = {
  list: () => api.get<WorkVideo[]>("/homeservices/artisans/work-videos/").then((r) => r.data),
  add: (input: { video_url: string; public_id?: string; caption?: string }) =>
    api.post<WorkVideo>("/homeservices/artisans/work-videos/", input).then((r) => r.data),
  remove: (id: string) => api.delete(`/homeservices/artisans/work-videos/${id}/`).then(() => undefined),
};
