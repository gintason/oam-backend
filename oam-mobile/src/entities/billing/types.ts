export type BillCategory = "airtime" | "data" | "electricity" | "cable";
export type Biller = { id: string; country: string; category: string; code: string; name: string; service_fee?: string };
export type Plan = { variation_id: string; name: string; price: string; validity?: string };
export type BillStatus = "success" | "pending" | "failed" | string;

export type BillOrder = {
  id: string; category: string; biller_name: string; recipient: string; amount: string;
  currency: string; pay_with: string; status: BillStatus; reference: string;
  provider: string | null; customer_name: string | null; meter_type: string | null;
  token: string | null; units: string | null; created_at: string; updated_at: string;
  pins?: { serial: string; pin: string }[];          // education exam PINs
  epin_cards?: EpinCard[];                            // ePIN packs of 10 printable cards
  quantity?: number; plan_name?: string;
};

export type EpinCard = { id: string; network: string; denomination: number; pieces_count: number; image_url?: string };
export type EpinStock = { stock: Record<string, Record<string, number>>; pack_size: number; max_packs: number; denominations: number[] };

export type CardCheckout = {
  id: string; category: string; code: string; recipient: string; amount: string; currency: string;
  plan_code: string; funding_reference: string;
  status: "pending" | "payment_received" | "delivered" | "failed" | string;
  failure_reason: string; order_status: string | null; order_reference: string | null; created_at: string;
};

/** Response from POST /billing/verify-customer/ (meter / smartcard lookup). */
export type VerifyResponse = {
  verification_id: string;
  customer_name: string;
  details?: Record<string, unknown>;
  detail?: string;
};
