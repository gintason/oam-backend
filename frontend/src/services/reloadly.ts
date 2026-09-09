import { api } from "../lib/api";

export type Country = { isoName: string; name: string; currencyCode?: string; flag?: string };

export type Operator = {
  operator_id: string; name: string; logo: string;
  country_iso: string; country_name: string;
  sender_currency: string; destination_currency: string;
  denomination_type: string;            // FIXED | RANGE
  international_discount: number; local_discount: number; fx_rate: number;
  min_amount: number; max_amount: number; local_min: number; local_max: number;
  fixed_amounts: number[]; local_fixed_amounts: number[]; suggested_amounts: number[];
};

export type Quote = {
  face_usd: string; total_ngn: string; cost_ngn: string; markup_ngn: string;
  usd_ngn: string; markup_percent: string;
};

export type AirtimeTopup = {
  reference: string; status: string; operator_name: string; country_iso: string;
  recipient_number: string; recipient_iso2: string; amount: string; currency: string;
  total_ngn: string; markup_ngn: string; reloadly_transaction_id: string;
  delivered_amount: string; delivered_currency: string; failure_reason: string; created_at: string;
};

export const reloadlyApi = {
  async countries(): Promise<Country[]> {
    const { data } = await api.get<{ countries: Country[] }>("/reloadly/countries/");
    return data.countries;
  },
  async operators(country: string, phone?: string): Promise<Operator[]> {
    const { data } = await api.get<{ operators: Operator[] }>("/reloadly/operators/", { params: phone ? { country, phone } : { country } });
    return data.operators;
  },
  async quote(input: { operator_id: string; amount: number | string; use_local_amount: boolean }): Promise<Quote> {
    const { data } = await api.post<Quote>("/reloadly/quote/", input);
    return data;
  },
  async buy(payload: Record<string, unknown>) {
    const { data } = await api.post<{ topup: AirtimeTopup; authorization_url?: string; reference?: string }>("/reloadly/buy/", payload);
    return data;
  },
  async cardVerify(reference: string): Promise<AirtimeTopup> {
    const { data } = await api.post<{ topup: AirtimeTopup }>("/reloadly/card/verify/", { reference });
    return data.topup;
  },
  async topup(reference: string): Promise<AirtimeTopup> {
    const { data } = await api.get<AirtimeTopup>(`/reloadly/topups/${reference}/`);
    return data;
  },
};

const KEY = "oam_intl_air";
export const intlAirStore = {
  set: (v: { ref: string; topupRef: string }) => localStorage.setItem(KEY, JSON.stringify(v)),
  take: (): { ref: string; topupRef: string } | null => {
    try { const raw = localStorage.getItem(KEY); localStorage.removeItem(KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
  },
};
