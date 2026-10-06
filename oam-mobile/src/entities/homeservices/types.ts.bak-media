export type ServiceCategory = { id: string; name: string; slug: string; icon: string; order: number };

export type ArtisanListItem = {
  id: string; business_name: string; category_name: string; city: string; state: string;
  is_verified: boolean; is_featured: boolean; distance_km: number | null; profile_photo: string | null;
};

export type ArtisanDetail = ArtisanListItem & {
  category: string; description: string; address: string;
  latitude: number | null; longitude: number | null;
  years_experience: number; is_available: boolean; views_count: number; created_at: string;
};

export type ArtisanWrite = {
  category: string; profile_photo?: string; business_name: string; description: string;
  phone: string; whatsapp: string; address: string; city: string; state: string;
  years_experience: number; is_available: boolean; latitude?: number | null; longitude?: number | null;
};

/** City centres for the proximity search fallback. */
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

/* ---- Verification ---- */
export type ServiceImage = { id: string; url: string; caption: string; order: number; created_at: string };
export type VerificationStatus = "draft" | "incomplete" | "pending" | "approved" | "rejected";
export type Verification = {
  id: string;
  status: VerificationStatus;
  decision_note: string;
  submitted_at: string | null;
  reviewed_at: string | null;
  service_images: ServiceImage[];
  has_id_document: boolean;
  has_work_video: boolean;
  requirements: {
    service_images: { have: number; need: number; max: number; done: boolean };
    work_video: { done: boolean };
    id_document: { done: boolean };
  };
};
