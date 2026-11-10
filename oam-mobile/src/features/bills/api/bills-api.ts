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

/** No reply at all (dropped connection) — the server may still have done the purchase. */
function isNetworkError(err: unknown) {
  const e = err as { response?: unknown; request?: unknown; message?: string };
  return !e?.response && (Boolean(e?.request) || /network/i.test(String(e?.message ?? "")));
}

/**
 * The purchase reply got lost (mobile data drop). Before showing an error — which
 * invites a second, duplicate purchase — look for the order the server made.
 */
async function recoverOrder(category: string, recipient: string, err: unknown): Promise<BillOrder> {
  if (!isNetworkError(err)) throw err;
  const since = Date.now() - 3 * 60 * 1000;
  for (let i = 0; i < 3; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    try {
      const { results } = await api.get<{ results: BillOrder[] }>("/billing/orders/").then((r) => r.data);
      const hit = (results ?? []).find((o) =>
        o.category === category && String(o.recipient) === String(recipient).trim() &&
        new Date(o.created_at).getTime() >= since);
      if (hit) return hit;
    } catch { /* still offline: try again */ }
  }
  throw err;
}

export const billsApi = {
  refreshOrder: (reference: string) =>
    api.post<BillOrder>(`/billing/orders/${reference}/refresh/`, {}).then((r) => r.data),
  getOrders: () =>
    api.get<{ count: number; results: BillOrder[] }>("/billing/orders/").then((r) => r.data),
  refreshOrders: () =>
    api.post<{ checked: number; orders: BillOrder[] }>("/billing/orders/refresh/", {}).then((r) => r.data),
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
    api.post<BillOrder>("/billing/purchase/", { currency: "NGN", country: "NG", ...input }).then((r) => r.data)
      .catch((err) => recoverOrder(input.category, input.recipient, err)),
  fundBetting: (input: { code: string; customer_id: string; amount: number | string; verification_id: string }) =>
    api.post<BillOrder>("/billing/betting/fund/", { currency: "NGN", country: "NG", ...input }).then((r) => r.data)
      .catch((err) => recoverOrder("betting", input.customer_id, err)),

  cardStart: (input: PurchaseInput) =>
    api.post<{ authorization_url: string; reference: string }>("/billing/purchase/card/", { currency: "NGN", country: "NG", ...input }).then((r) => r.data),

  cardStatus: (reference: string) =>
    api.get<CardCheckout>(`/billing/purchase/card/${reference}/`).then((r) => r.data),
};
