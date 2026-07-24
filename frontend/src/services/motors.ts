import { api } from "../lib/api";

/** Structured vehicle facts. `vin` is admin-only and never returned publicly. */
export type Vehicle = {
  make: string;
  model_name: string;
  year: number;
  mileage_km: number | null;
  transmission: string;
  fuel: string;
  body_type: string;
  colour: string;
  engine_size: string;
  seats: number | null;
  is_registered: boolean;
  duty_paid: boolean;
  vin?: string;
};

export type MotorsListing = {
  id: string;
  title: string;
  description: string;
  price: string;
  currency: string;
  negotiable: boolean;
  condition: string;
  location: string;
  status: string;
  is_featured: boolean;
  views_count: number;
  contact_phone: string;
  contact_whatsapp: string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  vehicle: Vehicle | null;
  images: { id: string; url: string; is_primary: boolean }[];
};

export const TRANSMISSIONS = [
  { value: "automatic", label: "Automatic" },
  { value: "manual", label: "Manual" },
  { value: "cvt", label: "CVT" },
] as const;

export const FUELS = [
  { value: "petrol", label: "Petrol" },
  { value: "diesel", label: "Diesel" },
  { value: "hybrid", label: "Hybrid" },
  { value: "electric", label: "Electric" },
  { value: "lpg", label: "LPG" },
] as const;

export const BODY_TYPES = [
  { value: "sedan", label: "Sedan" },
  { value: "suv", label: "SUV" },
  { value: "hatchback", label: "Hatchback" },
  { value: "pickup", label: "Pickup" },
  { value: "bus", label: "Bus" },
  { value: "truck", label: "Truck" },
  { value: "coupe", label: "Coupé" },
  { value: "wagon", label: "Wagon" },
  { value: "van", label: "Van" },
  { value: "other", label: "Other" },
] as const;

export const motorsApi = {
  async list(status?: string): Promise<{ count: number; results: MotorsListing[] }> {
    const { data } = await api.get("/marketplace/motors/", {
      params: status && status !== "all" ? { status } : undefined,
    });
    return data;
  },

  async create(input: {
    title?: string;
    description: string;
    price: string;
    location: string;
    condition: string;
    negotiable: boolean;
    contact_phone: string;
    contact_whatsapp?: string;
    vehicle: Vehicle;
    images: string[];
  }): Promise<MotorsListing> {
    const { data } = await api.post("/marketplace/motors/", input);
    return data;
  },

  async update(id: string, input: Partial<{
    title: string; description: string; price: string; location: string;
    condition: string; status: string; negotiable: boolean; is_featured: boolean;
    contact_phone: string; contact_whatsapp: string;
    vehicle: Partial<Vehicle>; images: string[];
  }>): Promise<MotorsListing> {
    const { data } = await api.patch(`/marketplace/motors/${id}/`, input);
    return data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/marketplace/motors/${id}/`);
  },
};
