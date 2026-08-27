import { api } from "@/shared/api";
import type { ServiceCategory, ArtisanListItem, ArtisanDetail, ArtisanWrite } from "@/entities/homeservices";

export const homeServicesApi = {
  categories: () =>
    api.get<{ results?: ServiceCategory[] } | ServiceCategory[]>("/homeservices/categories/")
      .then((r) => (Array.isArray(r.data) ? r.data : r.data.results ?? [])),

  /** Proximity search — lat/lng required. */
  search: (params: { lat: number; lng: number; radius_km?: number; category?: string; q?: string }) =>
    api.get<{ count: number; results: ArtisanListItem[] }>("/homeservices/artisans/", { params }).then((r) => r.data),

  detail: (id: string) => api.get<ArtisanDetail>(`/homeservices/artisans/${id}/`).then((r) => r.data),

  me: () => api.get<ArtisanDetail & Partial<ArtisanWrite>>("/homeservices/artisans/me/").then((r) => r.data),

  register: (input: ArtisanWrite) => api.post<ArtisanDetail>("/homeservices/artisans/register/", input).then((r) => r.data),

  /** Start a profile boost — returns the Flutterwave checkout link + our reference. */
  startBoost: (days: number, currency = "NGN") =>
    api.post<{ authorization_url: string; reference: string }>("/homeservices/artisans/boost/", { days, currency })
      .then((r) => r.data),

  /** Confirm the boost after checkout; the backend verifies with the gateway and features the profile. */
  verifyBoost: (reference: string) =>
    api.post<{ status?: string; featured_until?: string }>("/homeservices/artisans/boost/verify/", { reference })
      .then((r) => r.data),
};
