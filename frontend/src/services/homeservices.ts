import { api } from "../lib/api";

export type ServiceCategory = {
  id: string; name: string; slug: string; icon: string; order: number;
};

export type ArtisanListItem = {
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

/**
 * Note what ISN'T here: phone and whatsapp.
 * Contact details are only ever returned by the messaging API, once the
 * artisan has accepted an enquiry.
 */
export type ArtisanDetail = ArtisanListItem & {
  category: string;
  description: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  years_experience: number;
  is_available: boolean;
  views_count: number;
  created_at: string;
};

export type ArtisanWrite = {
  category: string;
  /** Cloudinary URL. The backend's write serializer accepts it. */
  profile_photo?: string;
  business_name: string;
  description: string;
  phone: string;
  whatsapp: string;
  address: string;
  city: string;
  state: string;
  years_experience: number;
  is_available: boolean;
  latitude?: number | null;
  longitude?: number | null;
};

/** Boost tiers. Durations come from the backend's BOOST_TIERS. */
export const BOOST_TIERS = [
  { key: "premium", label: "Premium", days: 30, price: 2500 },
  { key: "pro", label: "Pro", days: 90, price: 5000 },
] as const;

export const homeServicesApi = {
  async categories(): Promise<ServiceCategory[]> {
    const { data } = await api.get("/homeservices/categories/");
    return data.results ?? data;
  },

  /**
   * The backend requires lat/lng — it's a proximity search, not a directory.
   * Callers must supply a location; the UI falls back to a city centre when
   * the browser won't give one.
   */
  async search(params: {
    lat: number; lng: number; radius_km?: number; category?: string; q?: string;
  }): Promise<{ count: number; results: ArtisanListItem[] }> {
    const { data } = await api.get("/homeservices/artisans/", { params });
    return data;
  },

  async detail(id: string): Promise<ArtisanDetail> {
    const { data } = await api.get(`/homeservices/artisans/${id}/`);
    return data;
  },

  async me(): Promise<ArtisanDetail & Partial<ArtisanWrite>> {
    const { data } = await api.get("/homeservices/artisans/me/");
    return data;
  },

  async register(input: ArtisanWrite): Promise<ArtisanDetail> {
    const { data } = await api.post("/homeservices/artisans/register/", input);
    return data;
  },

  async startBoost(days: number): Promise<{ authorization_url: string; reference: string }> {
    const { data } = await api.post("/homeservices/artisans/boost/", { days });
    return data;
  },

  async verifyBoost(reference: string): Promise<{ status: string; featured_until?: string }> {
    const { data } = await api.post("/homeservices/artisans/boost/verify/", { reference });
    return data;
  },
};

/** Major Nigerian cities, for when the browser won't share a location. */
export const CITIES = [
  { name: "Abuja", lat: 9.0765, lng: 7.3986 },
  { name: "Lagos", lat: 6.5244, lng: 3.3792 },
  { name: "Port Harcourt", lat: 4.8156, lng: 7.0498 },
  { name: "Kano", lat: 12.0022, lng: 8.5920 },
  { name: "Ibadan", lat: 7.3775, lng: 3.9470 },
  { name: "Benin City", lat: 6.3350, lng: 5.6037 },
  { name: "Enugu", lat: 6.5244, lng: 7.5186 },
  { name: "Kaduna", lat: 10.5105, lng: 7.4165 },
  { name: "Jos", lat: 9.8965, lng: 8.8583 },
  { name: "Uyo", lat: 5.0378, lng: 7.9128 },
] as const;

/* ------------------------------------------------------------------ */
/* Verification                                                        */
/* ------------------------------------------------------------------ */

export type ServiceImage = {
  id: string;
  url: string;
  caption: string;
  order: number;
  created_at: string;
};

export type VerificationStatus =
  | "draft" | "incomplete" | "pending" | "approved" | "rejected";

/**
 * Note what's absent: the identity document reference. It never leaves the
 * server, not even to its owner — the artisan knows whether they uploaded one,
 * and nothing in the browser needs the id.
 */
export type Verification = {
  id: string;
  status: VerificationStatus;
  checks_report: Record<string, { ok: boolean; reasons: string[]; facts: Record<string, unknown> }>;
  checks_passed_at: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  decision_note: string;
  service_images: ServiceImage[];
  has_id_document: boolean;
  has_work_video: boolean;
  requirements: {
    service_images: { have: number; need: number; max: number; done: boolean };
    work_video: { done: boolean };
    id_document: { done: boolean };
  };
};

export const verificationApi = {
  async get(): Promise<Verification> {
    const { data } = await api.get("/homeservices/artisans/verification/");
    return data;
  },

  async attach(input: {
    purpose: "artisan_service_image" | "artisan_work_video" | "artisan_id_document";
    public_id: string;
    url?: string;
    caption?: string;
  }): Promise<{ document: ServiceImage | null; verification: Verification }> {
    const { data } = await api.post("/homeservices/artisans/verification/attach/", input);
    return data;
  },

  async removeImage(id: string): Promise<void> {
    await api.delete(`/homeservices/artisans/verification/images/${id}/`);
  },

  async submit(): Promise<{ detail: string; verification: Verification }> {
    const { data } = await api.post("/homeservices/artisans/verification/submit/", {});
    return data;
  },
};
