export type MarketCategory = {
  id: string; name: string; slug: string; description: string;
  icon: string; is_admin_only: boolean; order: number;
};

export type ListingListItem = {
  id: string; title: string; price: string; currency: string;
  negotiable: boolean; condition: string; location: string;
  category_name: string; is_featured: boolean;
  primary_image: string | null; created_at: string;
};

export type ListingDetail = {
  id: string; title: string; description: string; price: string; currency: string;
  negotiable: boolean; condition: string; location: string;
  category: string; category_name: string; status: string;
  is_featured: boolean; views_count: number; seller_name: string;
  images: { id: string; url: string; is_primary: boolean }[];
  videos?: { id: string; url: string; thumbnail_url?: string }[];
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
  listing_limit: number | null;
  active_listings: number;
};

export const CONDITIONS = [
  { value: "new", label: "Brand new" },
  { value: "used", label: "Used" },
  { value: "refurbished", label: "Refurbished" },
] as const;

/** OAM Motors is the admin storefront — shown first, with a friendly label. */
export function categoryLabel(slug: string, name: string) {
  return slug === "oam-motors" ? "O.A.M Motors" : name;
}
