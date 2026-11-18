/**
 * Gift cards (buy & sell) and RMB through VTU.ng — /api/v1/trade/.
 * Switched off on the server until VTU.ng approves O.A.M's KYB; check status() first.
 */
import { api } from "../lib/api";

export type TradeStatus = { giftcards: boolean; rmb: boolean; show_on_ios: boolean };
export type TradeOrder = {
  id: string; kind: "giftcard_buy" | "giftcard_sell" | "rmb_buy"; reference: string;
  status: "pending" | "processing" | "success" | "failed" | "cancelled"; currency: string; amount: string;
  title: string; details: Record<string, unknown>; codes: Record<string, string>[]; failure_reason: string;
  created_at: string; updated_at: string; settled_at: string | null;
};
export type GcCountry = { country_code: string; country_name: string; country_flag_url: string; currency_code: string };
export type GcProduct = {
  product_id: number; product_name: string; brand_name: string; currency_code: string; denomination_type: "FIXED" | "RANGE";
  min_recipient_denomination: number | null; max_recipient_denomination: number | null; fixed_recipient_denominations: number[] | null;
  logo_urls?: string[];
};
export type SellCard = { name: string; slug: string; logo_url: string | null; countries: string[]; card_types: string[]; sub_types: string[]; min_amount: number; max_amount: number };
export type RmbRate = { min_rmb: number; max_rmb: number | null; ngn_per_rmb: number };
export type RmbChannel = { channel: "alipay" | "wechat" | "bank"; name: string; is_available: boolean; rates: RmbRate[];
  account_types: { type: string; name: string; is_available: boolean; rates: RmbRate[] }[] };

export const tradeApi = {
  status: async () => (await api.get<TradeStatus>("/trade/status/")).data,
  countries: async () => (await api.get<{ results: GcCountry[] }>("/trade/giftcards/buy/countries/")).data.results,
  products: async (country: string) =>
    (await api.get<{ results: GcProduct[] }>("/trade/giftcards/buy/products/", { params: { country } })).data.results,
  quote: async (product_id: number, amount: number, quantity: number) =>
    (await api.post<{ price: string; quantity: number }>("/trade/giftcards/buy/quote/", { product_id, amount, quantity })).data,
  buy: async (input: { product_id: number; amount: number; quantity: number; title: string }) =>
    (await api.post<TradeOrder>("/trade/giftcards/buy/", input)).data,
  sellCatalog: async () => (await api.get<{ results: SellCard[] }>("/trade/giftcards/sell/catalog/")).data.results,
  sellRates: async (slug: string) =>
    (await api.get<{ results: unknown[]; oam_margin_pct: number }>("/trade/giftcards/sell/rates/", { params: { slug } })).data,
  sell: async (form: FormData) => (await api.post<TradeOrder>("/trade/giftcards/sell/", form)).data,
  rmbRates: async () => (await api.get<{ channels: RmbChannel[]; limits: { min_rmb: number; max_rmb: number } }>("/trade/rmb/rates/")).data,
  rmbQuote: async (channel: string, account_type: string | undefined, rmb_amount: number) =>
    (await api.post<{ price: string }>("/trade/rmb/quote/", { channel, account_type, rmb_amount })).data,
  rmbBuy: async (form: FormData) => (await api.post<TradeOrder>("/trade/rmb/buy/", form)).data,
  orders: async (kind?: string) => (await api.get<{ results: TradeOrder[] }>("/trade/orders/", { params: kind ? { kind } : {} })).data.results,
  order: async (reference: string) => (await api.get<TradeOrder>(`/trade/orders/${reference}/`)).data,
};

export const TRADE_STATUS_LABEL: Record<TradeOrder["status"], string> = {
  pending: "Under review", processing: "Processing", success: "Successful", failed: "Failed (refunded)", cancelled: "Declined",
};
