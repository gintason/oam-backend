import { api } from "@/shared/api";

/** Structured vehicle facts. `vin` is admin-only and never returned publicly. */
export type Vehicle = {
  make: string; model_name: string; year: number; mileage_km: number | null;
  transmission: string; fuel: string; body_type: string; colour: string;
  engine_size: string; seats: number | null; is_registered: boolean; duty_paid: boolean; vin?: string;
};

export type MotorsListing = {
  id: string; title: string; description: string; price: string; currency: string;
  negotiable: boolean; condition: string; location: string; status: string;
  is_featured: boolean; views_count: number; contact_phone: string; contact_whatsapp: string;
  expires_at: string | null; created_at: string; updated_at: string;
  vehicle: Vehicle | null; images: { id: string; url: string; is_primary: boolean }[];
};

export const TRANSMISSIONS = [
  { value: "automatic", label: "Automatic" }, { value: "manual", label: "Manual" }, { value: "cvt", label: "CVT" },
] as const;
export const FUELS = [
  { value: "petrol", label: "Petrol" }, { value: "diesel", label: "Diesel" }, { value: "hybrid", label: "Hybrid" },
  { value: "electric", label: "Electric" }, { value: "lpg", label: "LPG" },
] as const;
export const BODY_TYPES = [
  { value: "sedan", label: "Sedan" }, { value: "suv", label: "SUV" }, { value: "hatchback", label: "Hatchback" },
  { value: "pickup", label: "Pickup" }, { value: "bus", label: "Bus" }, { value: "truck", label: "Truck" },
  { value: "coupe", label: "Coupé" }, { value: "wagon", label: "Wagon" }, { value: "van", label: "Van" }, { value: "other", label: "Other" },
] as const;
export const CONDITIONS = [
  { value: "used", label: "Nigerian Used" }, { value: "foreign_used", label: "Foreign Used" }, { value: "new", label: "Brand New" },
] as const;

export const EMPTY_VEHICLE: Vehicle = {
  make: "", model_name: "", year: new Date().getFullYear(), mileage_km: null,
  transmission: "automatic", fuel: "petrol", body_type: "sedan",
  colour: "", engine_size: "", seats: null, is_registered: false, duty_paid: false, vin: "",
};

export const motorsApi = {
  list: (status?: string) =>
    api.get<{ count: number; results: MotorsListing[] }>("/marketplace/motors/", {
      params: status && status !== "all" ? { status } : undefined,
    }).then((r) => r.data),
  create: (input: {
    title?: string; description: string; price: string; location: string; condition: string;
    negotiable: boolean; contact_phone: string; contact_whatsapp?: string; vehicle: Vehicle; images: string[];
  }) => api.post<MotorsListing>("/marketplace/motors/", input).then((r) => r.data),
  update: (id: string, input: Record<string, unknown>) =>
    api.patch<MotorsListing>(`/marketplace/motors/${id}/`, input).then((r) => r.data),
  remove: (id: string) => api.delete(`/marketplace/motors/${id}/`).then(() => undefined),
};
