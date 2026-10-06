import { api } from "../lib/api";
import type { ListingDetail, ListingListItem, MarketCategory } from "./marketplace";
import type { FeaturedArtisan } from "./publicArtisans";

/** Read-only data for the public (signed-out / search engine) pages. No contact details. */

export type Paged<T> = { count: number; page: number; page_size: number; results: T[] };
export type PublicListing = Omit<ListingDetail, "is_owner" | "liked">;
export type PublicArtisan = FeaturedArtisan & {
  category: string; description: string; years_experience: number | null; is_available: boolean;
  views_count: number; created_at: string;
  work_videos?: { id: string; url: string; caption: string }[];
};

export const publicSeoApi = {
  listings: (params: { q?: string; category?: string; page?: number }) =>
    api.get<Paged<ListingListItem>>("/public/listings/", { params }).then((r) => r.data),
  listing: (id: string) => api.get<PublicListing>(`/public/listings/${id}/`).then((r) => r.data),
  categories: () =>
    api.get<{ results: MarketCategory[] }>("/marketplace/public/categories/").then((r) => r.data.results),
  artisans: (params: { q?: string; category?: string; city?: string; page?: number }) =>
    api.get<Paged<FeaturedArtisan>>("/public/artisans/", { params }).then((r) => r.data),
  artisan: (id: string) => api.get<PublicArtisan>(`/public/artisans/${id}/`).then((r) => r.data),
};
