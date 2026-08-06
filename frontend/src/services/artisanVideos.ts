import { api } from "../lib/api";

/**
 * Artisan "videos of previous work" — uploaded to Cloudinary via the existing
 * `artisan_work_video` upload purpose, then recorded here for admin approval.
 * Only approved videos are shown on the public profile.
 *
 * Endpoints live under the homeservices artisan namespace:
 *   GET/POST   /homeservices/artisans/work-videos/
 *   DELETE     /homeservices/artisans/work-videos/{id}/
 */
export type ArtisanVideoStatus = "pending" | "approved" | "rejected";

export type ArtisanVideo = {
  id: string;
  video_url: string;
  caption: string;
  status: ArtisanVideoStatus;
  review_note: string;
  created_at: string;
};

export const artisanVideosApi = {
  async list(): Promise<ArtisanVideo[]> {
    const { data } = await api.get<ArtisanVideo[] | { results: ArtisanVideo[] }>(
      "/homeservices/artisans/work-videos/",
    );
    return Array.isArray(data) ? data : data.results ?? [];
  },

  async add(input: {
    video_url: string;
    public_id?: string;
    caption?: string;
  }): Promise<ArtisanVideo> {
    const { data } = await api.post<ArtisanVideo>(
      "/homeservices/artisans/work-videos/",
      input,
    );
    return data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/homeservices/artisans/work-videos/${id}/`);
  },
};
