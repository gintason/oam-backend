import { api } from "../lib/api";

/**
 * Public artisan data for the landing page.
 *
 * These endpoints don't require a session — someone deciding whether OAM is
 * worth signing up for shouldn't have to sign up to see who's on it.
 */

export type FeaturedArtisan = {
  id: string;
  business_name: string;
  category_name: string;
  city: string;
  state: string;
  is_verified: boolean;
  is_featured: boolean;
  distance_km: number | null;
  profile_photo: string | null;
};

export type PublicCategory = {
  id: string; name: string; slug: string; icon: string; order: number;
};

export const publicArtisansApi = {
  async featured(params?: { category?: string; limit?: number }): Promise<{
    count: number; results: FeaturedArtisan[];
  }> {
    const { data } = await api.get("/homeservices/featured/", { params });
    return data;
  },

  async categories(): Promise<PublicCategory[]> {
    const { data } = await api.get("/homeservices/categories/public/");
    return data.results ?? data;
  },
};

/* ------------------------------------------------------------------ */
/* Public marketplace                                                  */
/* ------------------------------------------------------------------ */

export type PublicListing = {
  id: string;
  title: string;
  price: string;
  currency: string;
  negotiable: boolean;
  condition: string;
  location: string;
  category_name: string;
  is_featured: boolean;
  primary_image: string | null;
  created_at: string;
};

export const publicMarketApi = {
  async listings(params?: { category?: string; limit?: number }): Promise<{
    count: number; results: PublicListing[];
  }> {
    const { data } = await api.get("/marketplace/public/listings/", { params });
    return data;
  },

  async categories(): Promise<PublicCategory[]> {
    const { data } = await api.get("/marketplace/public/categories/");
    return data.results ?? data;
  },
};
