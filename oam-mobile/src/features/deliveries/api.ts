
/**
 * Delivery & Dispatch API client (backend: /api/v1/deliveries/) — customer + rider.
 * Business-rule errors come back as { detail, code } (insufficient_funds → 402,
 * price_changed → 409, offer_gone/taken → 409 …); `deliveryErrorCode()` reads it.
 */
import type { AxiosError } from "axios";
import { api } from "@/shared/api";
import { uploadMedia, type PickedMedia } from "@/features/marketplace/api/uploads-api";


export type DeliveryStatus = "pending" | "accepted" | "picked_up" | "in_transit" | "delivered" | "cancelled";
export type PaymentStatus = "unpaid" | "paid" | "settled" | "refunded" | "cash" | "due";
export type PaymentMethod = "wallet" | "card" | "cash" | "on_delivery";
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

// ---------------------------------------------------------------- rider ---

export type VehicleType = "bicycle" | "motorcycle" | "car" | "van";
export type DocKind = "id_card" | "license" | "vehicle" | "selfie" | "other";

export type RiderDocument = { id: number; kind: DocKind; kind_label: string; url: string; note: string; created_at: string };

export type RiderProfile = {
  id: string; full_name: string; phone: string; city: string; photo_url: string;
  vehicle_type: VehicleType; vehicle_label: string; vehicle_plate: string; vehicle_description: string;
  verification_status: Verification; verification_label: string; review_note: string; reviewed_at: string | null;
  availability: "online" | "offline"; lat: string | null; lng: string | null; location_updated_at: string | null;
  total_earnings: string; completed_deliveries: number; rating_avg: string; rating_count: number;
  documents: RiderDocument[]; created_at: string; active_delivery_id?: string | null;
  payout_account: PayoutAccount | null; auto_payout: boolean; cash_commission_due: string;
};

export type PayoutAccount = { bank_code?: string; bank_name: string; account_name: string; account_number: string };
export type OamBank = { bank_name: string; account_number: string; account_name: string };

export type RiderDelivery = {
  id: string; reference: string; status: DeliveryStatus; status_label: string;
  pickup_address: string; pickup_lat: string; pickup_lng: string; pickup_contact_name: string;
  pickup_contact_phone: string; pickup_note: string; dropoff_address: string; dropoff_lat: string;
  dropoff_lng: string; recipient_name: string; recipient_phone: string; dropoff_note: string;
  package_description: string; package_category: PackageCategory; category_label: string; weight_kg: string;
  distance_km: string; duration_min: number; rider_payout: string; currency: string;
  payment_method: PaymentMethod; payment_status: PaymentStatus; fee: string; platform_fee: string;
  customer_name: string; customer_phone: string; accepted_at: string | null; picked_up_at: string | null;
  in_transit_at: string | null; delivered_at: string | null; cancelled_at: string | null;
  rating: number | null; events: TimelineEvent[]; created_at: string;
};

export type Offer = {
  id: number; round: number; distance_km: string; status: string; expires_at: string;
  seconds_left: number; delivery: RiderDelivery;
};

export type Earnings = {
  currency: string; wallet_balance: string; total_earnings: string; completed_deliveries: number;
  today: string; this_week: string; today_count: number; rating_avg: string; rating_count: number;
  auto_payout: boolean; payout_account: PayoutAccount | null; cash_commission_due: string; cash_debt_limit: string;
  oam_bank: OamBank | null;
  ledger: { reference: string; delivery_id: string; gross_amount: string; rider_payout: string; platform_fee: string;
            currency: string; settled_at: string; dropoff_address: string; payment_method: PaymentMethod;
            status: string; payout_status: string; payout_label: string }[];
};

export type RiderApplyInput = {
  full_name: string; phone: string; city?: string; photo_url?: string; vehicle_type: VehicleType;
  vehicle_plate?: string; vehicle_description?: string; documents: { kind: DocKind; url: string }[];
  bank_code: string; account_number: string;
};

type Geo = { lat?: number; lng?: number };

// ---------------------------------------------------------------- client ---

const B = "/deliveries";

export const deliveriesApi = {
  meta: async (): Promise<DeliveriesMeta> => (await api.get(`${B}/meta/`)).data,
  quote: async (body: QuoteInput): Promise<Quote> => (await api.post(`${B}/requests/quote/`, body)).data,
  create: async (body: CreateDeliveryInput): Promise<Delivery> => (await api.post(`${B}/requests/`, body)).data,
  list: async (params: { state?: "active" | "past"; page?: number } = {}): Promise<Paginated<DeliveryListItem>> =>
    (await api.get(`${B}/requests/`, { params })).data,
  get: async (id: string): Promise<Delivery> => (await api.get(`${B}/requests/${id}/`)).data,
  cancel: async (id: string, reason = ""): Promise<Delivery> => (await api.post(`${B}/requests/${id}/cancel/`, { reason })).data,
  rate: async (id: string, rating: number, review = ""): Promise<Delivery> =>
    (await api.post(`${B}/requests/${id}/rate/`, { rating, review })).data,
  verifyPayment: async (id: string): Promise<Delivery> => (await api.post(`${B}/requests/${id}/verify-payment/`)).data,
  retryPayment: async (id: string, return_url?: string): Promise<Delivery> =>
    (await api.post(`${B}/requests/${id}/retry-payment/`, { return_url })).data,
};

export const riderApi = {
  me: async (): Promise<RiderProfile | null> => {
    try { return (await api.get(`${B}/rider/me/`)).data; } catch (e) {
      if ((e as AxiosError).response?.status === 404) return null;
      throw e;
    }
  },
  apply: async (body: RiderApplyInput): Promise<RiderProfile> => (await api.post(`${B}/rider/apply/`, body)).data,
  update: async (patch: Partial<RiderProfile>): Promise<RiderProfile> => (await api.patch(`${B}/rider/me/`, patch)).data,
  setBank: async (bank_code: string, account_number: string): Promise<RiderProfile> =>
    (await api.post(`${B}/rider/bank/`, { bank_code, account_number })).data,
  payCommission: async (): Promise<RiderProfile> => (await api.post(`${B}/rider/commission/pay-wallet/`)).data,
  setAvailability: async (online: boolean, geo: Geo = {}): Promise<RiderProfile> =>
    (await api.post(`${B}/rider/availability/`, { online, ...geo })).data,
  location: async (lat: number, lng: number) => (await api.post(`${B}/rider/location/`, { lat, lng })).data,
  offers: async (): Promise<Offer[]> => (await api.get(`${B}/rider/offers/`)).data,
  accept: async (offerId: number): Promise<RiderDelivery> => (await api.post(`${B}/rider/offers/${offerId}/accept/`)).data,
  reject: async (offerId: number) => (await api.post(`${B}/rider/offers/${offerId}/reject/`)).data,
  active: async (): Promise<RiderDelivery | null> => (await api.get(`${B}/rider/active/`)).data.delivery,
  jobs: async (page = 1): Promise<Paginated<RiderDelivery>> => (await api.get(`${B}/rider/jobs/`, { params: { page } })).data,
  delivery: async (id: string): Promise<RiderDelivery> => (await api.get(`${B}/rider/deliveries/${id}/`)).data,
  act: async (id: string, verb: "pickup" | "start" | "deliver" | "release",
              body: Geo & { code?: string; photo_url?: string; reason?: string } = {}): Promise<RiderDelivery> =>
    (await api.post(`${B}/rider/deliveries/${id}/${verb}/`, body)).data,
  /** Pay on delivery, at the door. */
  paymentLink: async (id: string): Promise<{ payment_url: string; reference: string; amount: string; currency: string }> =>
    (await api.post(`${B}/rider/deliveries/${id}/payment-link/`)).data,
  collectCash: async (id: string): Promise<RiderDelivery> => (await api.post(`${B}/rider/deliveries/${id}/collect-cash/`)).data,
  paymentStatus: async (id: string): Promise<RiderDelivery> => (await api.post(`${B}/rider/deliveries/${id}/payment-status/`)).data,
  earnings: async (): Promise<Earnings> => (await api.get(`${B}/rider/earnings/`)).data,
};

export type DeliveriesUploadPurpose = "rider_document" | "rider_photo" | "delivery_proof";
export const uploadDeliveriesFile = (purpose: DeliveriesUploadPurpose, file: PickedMedia) => uploadMedia(purpose, file);

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

export const VEHICLES: { value: VehicleType; label: string }[] = [
  { value: "motorcycle", label: "Motorcycle" }, { value: "bicycle", label: "Bicycle" },
  { value: "car", label: "Car" }, { value: "van", label: "Van" },
];

/** ₦1,550 — whole naira for fees. */
export function fee(v: string | number, currency = "NGN") {
  const sym = ({ NGN: "₦", USD: "$", GBP: "£", EUR: "€" } as Record<string, string>)[currency] ?? "";
  return `${sym}${Number(v || 0).toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;
}
