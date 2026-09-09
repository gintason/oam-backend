import { api } from "@/shared/api";

export type Country = { isoName: string; name: string; currencyCode?: string; flag?: string };

export type Operator = {
  operator_id: string; name: string; logo: string;
  country_iso: string; country_name: string;
  sender_currency: string; destination_currency: string;
  denomination_type: string;
  international_discount: number; local_discount: number; fx_rate: number;
  min_amount: number; max_amount: number; local_min: number; local_max: number;
  fixed_amounts: number[]; local_fixed_amounts: number[]; suggested_amounts: number[];
};

export type Quote = {
  total_ngn: string; cost_usd?: string; fx_rate: string; usd_ngn?: string;
};

export type AirtimeTopup = {
  reference: string; status: string; operator_name: string; country_iso: string;
  recipient_number: string; recipient_iso2: string; amount: string; currency: string;
  total_ngn: string; markup_ngn: string; reloadly_transaction_id: string;
  delivered_amount: string; delivered_currency: string; failure_reason: string; created_at: string;
};

export const reloadlyApi = {
  countries: () => api.get<{ countries: Country[] }>("/reloadly/countries/").then((r) => r.data.countries),
  operators: (country: string, phone?: string) =>
    api.get<{ operators: Operator[] }>("/reloadly/operators/", { params: phone ? { country, phone } : { country } }).then((r) => r.data.operators),
  quote: (input: { operator_id: string; amount: number | string; use_local_amount: boolean }) =>
    api.post<Quote>("/reloadly/quote/", input).then((r) => r.data),
  buy: (payload: Record<string, unknown>) =>
    api.post<{ topup: AirtimeTopup; authorization_url?: string; reference?: string }>("/reloadly/buy/", payload).then((r) => r.data),
  cardVerify: (reference: string) =>
    api.post<{ topup: AirtimeTopup }>("/reloadly/card/verify/", { reference }).then((r) => r.data.topup),
  topup: (reference: string) =>
    api.get<AirtimeTopup>(`/reloadly/topups/${reference}/`).then((r) => r.data),
  topups: () =>
    api.get<{ results: AirtimeTopup[] }>("/reloadly/topups/").then((r) => r.data.results ?? []),
};
