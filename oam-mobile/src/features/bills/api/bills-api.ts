import { api } from "@/shared/api";
import type { Biller, BillOrder, CardCheckout, Plan, VerifyResponse } from "@/entities/billing";

export type PurchaseInput = {
  category: string; code: string; recipient: string;
  amount?: number | string; plan_code?: string; variation_id?: string;
  verification_id?: string; meter_type?: string;
  currency?: string; country?: string; callback_url?: string;
};

export type VerifyInput = {
  category: string; code: string; customer_id: string;
  meter_type?: string; variation_id?: string; country?: string;
};

export const billsApi = {
  listBillers: (category: string, country = "NG") =>
    api.get<Biller[] | { results: Biller[] }>("/billing/billers/", { params: { category, country } })
      .then((r) => (Array.isArray(r.data) ? r.data : r.data.results ?? [])),

  getDataPlans: (code: string, country = "NG") =>
    api.get<{ plans: Plan[] }>("/billing/data-plans/", { params: { code, country } }).then((r) => r.data.plans ?? []),

  getTvPlans: (code: string, country = "NG") =>
    api.get<{ plans: Plan[] }>("/billing/tv-plans/", { params: { code, country } }).then((r) => r.data.plans ?? []),

  verifyCustomer: (input: VerifyInput) =>
    api.post<VerifyResponse>("/billing/verify-customer/", { country: "NG", ...input }).then((r) => r.data),

  purchase: (input: PurchaseInput) =>
    api.post<BillOrder>("/billing/purchase/", { currency: "NGN", country: "NG", ...input }).then((r) => r.data),

  cardStart: (input: PurchaseInput) =>
    api.post<{ authorization_url: string; reference: string }>("/billing/purchase/card/", { currency: "NGN", country: "NG", ...input }).then((r) => r.data),

  cardStatus: (reference: string) =>
    api.get<CardCheckout>(`/billing/purchase/card/${reference}/`).then((r) => r.data),
};
