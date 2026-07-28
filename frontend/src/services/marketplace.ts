import { api } from "../lib/api";

export type MarketCategory = {
  id: string; name: string; slug: string; description: string;
  icon: string; is_admin_only: boolean; order: number;
};

export type ListingListItem = {
  id: string; title: string; price: string; currency: string;
  negotiable: boolean; condition: string; location: string;
  category_name: string; is_featured: boolean; is_verified: boolean;
  primary_image: string | null; created_at: string;
};

/** No contact fields — those come from an accepted conversation only. */
export type ListingDetail = {
  id: string; title: string; description: string; price: string; currency: string;
  negotiable: boolean; condition: string; location: string;
  category: string; category_name: string; status: string;
  is_featured: boolean; is_verified: boolean; verified_at: string | null;
  views_count: number; seller_name: string; is_owner: boolean;
  images: { id: string; url: string; is_primary: boolean }[];
  videos: { id: string; url: string; thumbnail_url: string }[];
  expires_at: string | null; created_at: string; updated_at: string;
};

export type ListingWrite = {
  category: string; title: string; description: string;
  price: string; currency?: string; negotiable: boolean;
  condition: string; location: string;
  contact_phone: string; contact_whatsapp: string;
  images?: string[];
  videos?: string[];
};

export type Subscription = {
  tier: "free" | "premium" | "pro";
  active_tier: "free" | "premium" | "pro";
  expires_at: string | null;
  listing_limit: number | null;   // null = unlimited
  active_listings: number;
};

/** Mirrors the backend's SUBSCRIPTION_PRICES and TIER_LIMITS. */
export const SELLER_TIERS = [
  { key: "free", label: "Free", price: 0, limit: 3,
    perks: ["Up to 3 active listings", "Message buyers in-app"] },
  { key: "premium", label: "Premium", price: 2500, limit: 20,
    perks: ["Up to 20 active listings", "Featured placement", "Message buyers in-app"] },
  { key: "pro", label: "Pro", price: 5000, limit: null,
    perks: ["Unlimited listings", "Featured placement", "Priority in search"] },
] as const;

export const CONDITIONS = [
  { value: "new", label: "Brand new" },
  { value: "used", label: "Used" },
  { value: "refurbished", label: "Refurbished" },
] as const;

export const marketplaceApi = {
  async categories(): Promise<MarketCategory[]> {
    const { data } = await api.get("/marketplace/categories/");
    return data.results ?? data;
  },

  async browse(params: {
    category?: string; q?: string; min_price?: string; max_price?: string;
    location?: string; condition?: string;
  }): Promise<{ count: number; results: ListingListItem[] }> {
    const { data } = await api.get("/marketplace/listings/", { params });
    return { count: data.count ?? data.results?.length ?? 0, results: data.results ?? data };
  },

  async detail(id: string): Promise<ListingDetail> {
    const { data } = await api.get(`/marketplace/listings/${id}/`);
    return data;
  },

  async create(input: ListingWrite): Promise<ListingDetail> {
    const { data } = await api.post("/marketplace/listings/create/", input);
    return data;
  },

  /** Edit an existing listing (owner only). Sending images/videos replaces them. */
  async update(id: string, input: Partial<ListingWrite>): Promise<ListingDetail> {
    const { data } = await api.patch(`/marketplace/listings/${id}/`, input);
    return data;
  },

  /** Delete a listing (owner only). */
  async remove(id: string): Promise<void> {
    await api.delete(`/marketplace/listings/${id}/`);
  },

  async renew(id: string): Promise<ListingDetail> {
    const { data } = await api.post(`/marketplace/listings/${id}/renew/`, {});
    return data;
  },

  async mine(): Promise<{ count: number; results: ListingListItem[] }> {
    const { data } = await api.get("/marketplace/my-listings/");
    return { count: data.count ?? data.results?.length ?? 0, results: data.results ?? data };
  },

  async subscription(): Promise<Subscription> {
    const { data } = await api.get("/marketplace/subscription/");
    return data;
  },

  async subscribe(tier: "premium" | "pro"): Promise<{ authorization_url: string; reference: string }> {
    const { data } = await api.post("/marketplace/subscription/subscribe/", { tier });
    return data;
  },

  async verify(reference: string): Promise<{ status: string; tier?: string; expires_at?: string }> {
    const { data } = await api.post("/marketplace/subscription/verify/", { reference });
    return data;
  },
};
