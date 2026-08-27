import { api } from "@/shared/api";

/** Per-currency listing prices + which currencies are enabled for payment. */
export type PricingResponse = {
  supported_currencies: string[];
  subscription: Record<string, Record<string, string>>; // tier -> ccy -> price
  boost: Record<string, Record<string, string>>;        // days -> ccy -> price
};

export const pricingApi = {
  get: () => api.get<PricingResponse>("/payments/pricing/").then((r) => r.data),
};
