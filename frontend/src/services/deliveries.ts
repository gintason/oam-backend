import type { AxiosError } from "axios";
import { api } from "../lib/api";

/**
 * Delivery & Dispatch API client (backend: /api/v1/deliveries/).
 * Business-rule errors come back as { detail, code } (insufficient_funds → 402,
 * price_changed → 409 …); `deliveryErrorCode()` pulls the code out.
 */

export type DeliveryStatus = "pending" | "accepted" | "picked_up" | "in_transit" | "delivered" | "cancelled";
export type PaymentStatus = "unpaid" | "paid" | "settled" | "refunded" | "cash";
export type PaymentMethod = "wallet" | "card" | "cash";
export type PackageCategory = "documents" | "small" | "medium" | "large" | "food" | "fragile";
export type Verification = "pending" | "approved" | "rejected" | "suspended";

export type Choice = { value: string; label: string };

export type DeliveriesMeta = {
  package_categories: (Choice & { multiplier: string })[];
  vehicle_types: Choice[];
  document_kinds: Choice[];
  statuses: Choice[];
  offer_timeout_s: number;
  free_weight_kg: string;
  cash_enabled?: boolean;
};

export type Place = { address: string; lat: number; lng: number };

export type QuoteInput = {
  pickup_lat: number; pickup_lng: number; dropoff_lat: number; dropoff_lng: number;
  weight_kg?: number | string; package_category?: PackageCategory;
};

export type Quote = {
  distance_km: string; duration_min: number; zone_id: number | null; zone_name: string;
  base_fare: string; distance_fare: string; weight_fare: string; zone_multiplier: string;
  category_multiplier: string; surge_multiplier: string; surge_reason: string; subtotal: string;
  fee: string; platform_fee: string; rider_payout: string; currency: string; min_fare_applied: boolean;
};

export type CreateDeliveryInput = QuoteInput & {
  pickup_address: string; pickup_contact_name?: string; pickup_contact_phone?: string; pickup_note?: string;
  dropoff_address: string; recipient_name: string; recipient_phone: string; dropoff_note?: string;
  package_description: string; payment_method: PaymentMethod; expected_fee?: string; return_url?: string;
};

export type TimelineEvent = {
  status: DeliveryStatus; status_label: string; note: string; actor: string;
  lat: string | null; lng: string | null; created_at: string;
};

export type RiderPublic = {
  id: string; full_name: string; phone: string; photo_url: string; vehicle_type: string;
  vehicle_label: string; vehicle_plate: string; vehicle_description: string; rating_avg: string;
  rating_count: number; completed_deliveries: number; lat: string | null; lng: string | null;
  location_updated_at: string | null;
};

export type DeliveryListItem = {
  id: string; reference: string; status: DeliveryStatus; status_label: string;
  payment_status: PaymentStatus; payment_method: PaymentMethod; pickup_address: string;
  dropoff_address: string; recipient_name: string; package_category: PackageCategory;
  package_description: string; distance_km: string; fee: string; currency: string;
  created_at: string; delivered_at: string | null; rider_name: string; rating: number | null;
};

export type Delivery = DeliveryListItem & {
  payment_url: string;
  pickup_lat: string; pickup_lng: string; pickup_contact_name: string; pickup_contact_phone: string;
  pickup_note: string; dropoff_lat: string; dropoff_lng: string; recipient_phone: string;
  dropoff_note: string; category_label: string; weight_kg: string; duration_min: number;
  zone_name: string; base_fare: string; distance_fare: string; weight_fare: string;
  zone_multiplier: string; category_multiplier: string; surge_multiplier: string;
  delivery_code: string; proof_photo_url: string; dispatch_round: number; dispatch_exhausted: boolean;
  rider: RiderPublic | null; events: TimelineEvent[]; accepted_at: string | null;
  picked_up_at: string | null; in_transit_at: string | null; cancelled_at: string | null;
  cancel_reason: string; cancelled_by: string; review: string; can_cancel: boolean; can_rate: boolean;
};

export type Paginated<T> = { count: number; next: string | null; previous: string | null; results: T[] };

// ---------------------------------------------------------------- admin ---

export type RiderDocument = { id: number; kind: string; kind_label: string; url: string; note: string; created_at: string };

export type AdminRider = {
  id: string; full_name: string; phone: string; city: string; photo_url: string; email: string;
  vehicle_type: string; vehicle_label: string; vehicle_plate: string; vehicle_description: string;
  verification_status: Verification; verification_label: string; review_note: string;
  reviewed_at: string | null; availability: "online" | "offline"; lat: string | null; lng: string | null;
  location_updated_at: string | null; total_earnings: string; completed_deliveries: number;
  rating_avg: string; rating_count: number; documents: RiderDocument[]; created_at: string;
  active_delivery: { id: string; reference: string } | null;
  payout_account: { bank_code: string; bank_name: string; account_name: string; account_number: string } | null;
  auto_payout: boolean;
  cash_commission_due: string;
};

export type AdminDeliveryListItem = DeliveryListItem & {
  customer_email: string; platform_fee: string; rider_payout: string; dispatch_round: number;
  dispatch_exhausted: boolean; pickup_lat: string; pickup_lng: string; dropoff_lat: string; dropoff_lng: string;
};

export type AdminDelivery = Delivery & {
  customer_email: string; customer_name: string; rider_payout: string; platform_fee: string;
  payment_reference: string;
  offers: { rider: string; round: number; distance_km: string; status: string; created_at: string }[];
};

export type Overview = {
  deliveries_by_status: Partial<Record<DeliveryStatus, number>>;
  riders_by_status: Partial<Record<Verification, number>>;
  today: { requests: number; delivered: number; gmv: string; platform_revenue: string; rider_payouts: string };
  unassigned_over_5_min: number;
  online_riders: { id: string; name: string; lat: string; lng: string; vehicle_type: string; busy: boolean; location_updated_at: string }[];
  active_deliveries: {
    id: string; reference: string; status: DeliveryStatus; pickup_lat: string; pickup_lng: string;
    dropoff_lat: string; dropoff_lng: string; rider_name: string; rider_lat: string | null; rider_lng: string | null;
  }[];
};

export type Zone = {
  id: number; name: string; city: string; center_lat: string; center_lng: string; radius_km: string;
  base_fare: string; per_km: string; per_kg: string; min_fare: string; zone_multiplier: string;
  currency: string; is_active: boolean; created_at?: string;
};

export type Surge = {
  id: number; zone: number | null; zone_name: string; multiplier: string; reason: string;
  starts_at: string; ends_at: string | null; is_active: boolean; is_live: boolean;
};

export type DispatchSettings = {
  commission_rate: string; default_base_fare: string; default_per_km: string; default_per_kg: string;
  default_min_fare: string; free_weight_kg: string; road_factor: string; round_to: number;
  auto_surge_enabled: boolean; max_surge: string; search_radius_km: string; radius_step_km: string;
  max_rounds: number; offer_batch: number; offer_timeout_s: number; location_fresh_min: number;
  cash_enabled: boolean; cash_debt_limit: string; oam_bank_name: string; oam_account_number: string;
  oam_account_name: string; updated_at: string;
};

// ---------------------------------------------------------------- client ---

const B = "/deliveries";

export const deliveriesApi = {
  meta: () => api.get<DeliveriesMeta>(`${B}/meta/`).then((r) => r.data),
  quote: (body: QuoteInput) => api.post<Quote>(`${B}/requests/quote/`, body).then((r) => r.data),
  create: (body: CreateDeliveryInput) => api.post<Delivery>(`${B}/requests/`, body).then((r) => r.data),
  list: (params: { state?: "active" | "past"; page?: number; reference?: string } = {}) =>
    api.get<Paginated<DeliveryListItem>>(`${B}/requests/`, { params }).then((r) => r.data),
  get: (id: string) => api.get<Delivery>(`${B}/requests/${id}/`).then((r) => r.data),
  cancel: (id: string, reason = "") => api.post<Delivery>(`${B}/requests/${id}/cancel/`, { reason }).then((r) => r.data),
  rate: (id: string, rating: number, review = "") =>
    api.post<Delivery>(`${B}/requests/${id}/rate/`, { rating, review }).then((r) => r.data),
  verifyPayment: (id: string) => api.post<Delivery>(`${B}/requests/${id}/verify-payment/`).then((r) => r.data),
  retryPayment: (id: string, return_url?: string) =>
    api.post<Delivery>(`${B}/requests/${id}/retry-payment/`, { return_url }).then((r) => r.data),
};

export const dispatchAdminApi = {
  overview: () => api.get<Overview>(`${B}/admin/overview/`).then((r) => r.data),
  riders: (params: { status?: string; availability?: string; q?: string; page?: number } = {}) =>
    api.get<Paginated<AdminRider>>(`${B}/admin/riders/`, { params }).then((r) => r.data),
  recordCommission: (id: string, amount: string) =>
    api.post<AdminRider>(`${B}/admin/riders/${id}/commission/`, { amount }).then((r) => r.data),
  reviewRider: (id: string, action: "approve" | "reject" | "suspend" | "reinstate", note = "") =>
    api.post<AdminRider>(`${B}/admin/riders/${id}/review/`, { action, note }).then((r) => r.data),
  deliveries: (params: { status?: string; q?: string; page?: number; unassigned?: "1" } = {}) =>
    api.get<Paginated<AdminDeliveryListItem>>(`${B}/admin/deliveries/`, { params }).then((r) => r.data),
  delivery: (id: string) => api.get<AdminDelivery>(`${B}/admin/deliveries/${id}/`).then((r) => r.data),
  cancelDelivery: (id: string, reason = "") =>
    api.post<AdminDelivery>(`${B}/admin/deliveries/${id}/cancel/`, { reason }).then((r) => r.data),
  redispatch: (id: string) => api.post<AdminDelivery>(`${B}/admin/deliveries/${id}/redispatch/`).then((r) => r.data),
  zones: () => api.get<Zone[]>(`${B}/admin/zones/`).then((r) => r.data),
  saveZone: (z: Partial<Zone>) =>
    (z.id ? api.patch<Zone>(`${B}/admin/zones/${z.id}/`, z) : api.post<Zone>(`${B}/admin/zones/`, z)).then((r) => r.data),
  deleteZone: (id: number) => api.delete(`${B}/admin/zones/${id}/`),
  surges: () => api.get<Surge[]>(`${B}/admin/surges/`).then((r) => r.data),
  saveSurge: (s: Partial<Surge>) =>
    (s.id ? api.patch<Surge>(`${B}/admin/surges/${s.id}/`, s) : api.post<Surge>(`${B}/admin/surges/`, s)).then((r) => r.data),
  deleteSurge: (id: number) => api.delete(`${B}/admin/surges/${id}/`),
  settings: () => api.get<DispatchSettings>(`${B}/admin/settings/`).then((r) => r.data),
  saveSettings: (s: Partial<DispatchSettings>) =>
    api.patch<DispatchSettings>(`${B}/admin/settings/`, s).then((r) => r.data),
  quotePreview: (body: QuoteInput) => api.post<Quote>(`${B}/admin/quote-preview/`, body).then((r) => r.data),
};

export function deliveryErrorCode(err: unknown): string | undefined {
  return (err as AxiosError<{ code?: string }>)?.response?.data?.code;
}

export const STATUS_LABEL: Record<DeliveryStatus, string> = {
  pending: "Finding a rider",
  accepted: "Rider heading to pickup",
  picked_up: "Picked up",
  in_transit: "On the way",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const STATUS_STEPS: DeliveryStatus[] = ["pending", "accepted", "picked_up", "in_transit", "delivered"];

export const CATEGORY_LABEL: Record<PackageCategory, string> = {
  documents: "Documents", small: "Small parcel", medium: "Medium parcel",
  large: "Large item", food: "Food", fragile: "Fragile",
};
