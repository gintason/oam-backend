/** Gift cards (buy & sell) and RMB through VTU.ng — /api/v1/trade/ (off until KYB). */
import { Platform } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/shared/api";

export type TradeStatus = { giftcards: boolean; rmb: boolean; show_on_ios: boolean };
export type TradeOrder = {
  id: string; kind: "giftcard_buy" | "giftcard_sell" | "rmb_buy"; reference: string;
  status: "pending" | "processing" | "success" | "failed" | "cancelled"; currency: string; amount: string;
  title: string; codes: Record<string, string>[]; failure_reason: string; created_at: string;
};
export type GcCountry = { country_code: string; country_name: string };
export type GcProduct = { product_id: number; product_name: string; currency_code: string; denomination_type: "FIXED" | "RANGE";
  min_recipient_denomination: number | null; max_recipient_denomination: number | null; fixed_recipient_denominations: number[] | null };
export type SellCard = { name: string; slug: string; countries: string[]; card_types: string[]; sub_types: string[]; min_amount: number; max_amount: number };
export type RmbChannel = { channel: "alipay" | "wechat" | "bank"; name: string; is_available: boolean;
  account_types: { type: string; name: string; is_available: boolean }[] };
export type UploadFile = { uri: string; name: string; type: string };

const multipart = { headers: { "Content-Type": "multipart/form-data" } };

export const tradeApi = {
  status: async () => (await api.get<TradeStatus>("/trade/status/")).data,
  countries: async () => (await api.get<{ results: GcCountry[] }>("/trade/giftcards/buy/countries/")).data.results,
  products: async (country: string) => (await api.get<{ results: GcProduct[] }>("/trade/giftcards/buy/products/", { params: { country } })).data.results,
  quote: async (product_id: number, amount: number, quantity: number) =>
    (await api.post<{ price: string }>("/trade/giftcards/buy/quote/", { product_id, amount, quantity })).data,
  buy: async (input: { product_id: number; amount: number; quantity: number; title: string }) => (await api.post<TradeOrder>("/trade/giftcards/buy/", input)).data,
  sellCatalog: async () => (await api.get<{ results: SellCard[] }>("/trade/giftcards/sell/catalog/")).data.results,
  sell: async (form: FormData) => (await api.post<TradeOrder>("/trade/giftcards/sell/", form, multipart)).data,
  rmbRates: async () => (await api.get<{ channels: RmbChannel[]; limits: { min_rmb: number; max_rmb: number } }>("/trade/rmb/rates/")).data,
  rmbQuote: async (channel: string, account_type: string | undefined, rmb_amount: number) =>
    (await api.post<{ price: string }>("/trade/rmb/quote/", { channel, account_type, rmb_amount })).data,
  rmbBuy: async (form: FormData) => (await api.post<TradeOrder>("/trade/rmb/buy/", form, multipart)).data,
  orders: async (kind?: string) => (await api.get<{ results: TradeOrder[] }>("/trade/orders/", { params: kind ? { kind } : {} })).data.results,
  order: async (reference: string) => (await api.get<TradeOrder>(`/trade/orders/${reference}/`)).data,
};

/** Which trade services to show here. iPhone stays hidden unless the server allows it. */
export function useTradeAvailability() {
  const q = useQuery({ queryKey: ["trade-status"], queryFn: tradeApi.status, staleTime: 300_000, retry: false });
  const allowed = Platform.OS !== "ios" || Boolean(q.data?.show_on_ios);
  return { giftcards: allowed && Boolean(q.data?.giftcards), rmb: allowed && Boolean(q.data?.rmb) };
}

export const STATUS_LABEL: Record<TradeOrder["status"], string> = {
  pending: "Under review", processing: "Processing", success: "Successful", failed: "Failed (refunded)", cancelled: "Declined",
};

export const CURRENCY_BY_COUNTRY: Record<string, string> = {
  US: "USD", GB: "GBP", EU: "EUR", DE: "EUR", FR: "EUR", IT: "EUR", ES: "EUR", NL: "EUR", BE: "EUR", AT: "EUR", IE: "EUR",
  FI: "EUR", PT: "EUR", GR: "EUR", CA: "CAD", AU: "AUD", NZ: "NZD", CH: "CHF", SE: "SEK", NO: "NOK", DK: "DKK",
  PL: "PLN", JP: "JPY", SG: "SGD", MY: "MYR", BR: "BRL", TR: "TRY",
};
