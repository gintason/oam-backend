import { api } from "../lib/api";

/** Per-currency listing prices + which currencies are enabled for payment. */
export type Pricing = {
  supported_currencies: string[];
  subscription: Record<string, Record<string, string>>; // tier -> ccy -> price
  boost: Record<string, Record<string, string>>;        // days -> ccy -> price
};

export const pricingApi = {
  async get(): Promise<Pricing> {
    const { data } = await api.get("/payments/pricing/");
    return data;
  },
};
