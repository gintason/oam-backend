/**
 * Billing (VTU) API service — /api/v1/billing/.
 * Powers airtime, data, electricity, cable purchases via one purchase endpoint.
 * Requires a verified user.
 */
import { api } from "../lib/api";
import type { Paginated } from "./types";

export type BillCategory = "airtime" | "data" | "electricity" | "cable" | "betting";

export type Biller = {
  id: string;
  country: string;
  category: BillCategory;
  code: string;      // provider code used as `code` in a purchase
  name: string;      // e.g. "MTN", "Ikeja Electric", "DSTV"
};

export type PurchaseInput = {
  category: BillCategory;
  code: string;                 // biller code (network / disco / provider)
  recipient: string;            // phone / meter no / smartcard no
  amount: number | string;
  currency?: string;            // default NGN
  country?: string;             // default NG
  plan_code?: string;           // for data / cable packages
  meter_type?: string;          // electricity: "prepaid" | "postpaid"
  /** Electricity & cable REQUIRE this — returned by verify-customer. */
  verification_id?: string;
  /** Cable package id (backend also accepts plan_code). */
  variation_id?: string;
};

export type BillOrder = {
  id: string;
  category: string;
  biller_name: string;
  recipient: string;
  amount: string;
  cost_amount?: string;
  revenue_amount?: string;
  currency: string;
  pay_with: string;
  status: string;               // "success" | "pending" | "failed" | ...
  reference: string;
  provider: string;
  provider_reference: string;
  customer_name?: string;       // meter/smartcard owner
  meter_type?: string;          // prepaid | postpaid
  token?: string;               // ELECTRICITY: the recharge token
  units?: string;               // ELECTRICITY: units purchased
  created_at: string;
  updated_at: string;
};

/**
 * Response from POST /billing/verify-customer/.
 * The provider's own fields live under `details`; `verification_id` MUST be
 * sent back with the purchase — it's the backend's proof the meter was checked.
 */
export type VerifyResponse = {
  verification_id: string;
  customer_name: string;
  details?: Record<string, unknown>;
  detail?: string;
};

/** Provider fields describing the customer (inside `details`). */
export type CustomerDetails = {
  customer_name?: string;
  customer_address?: string;
  customer_arrears?: string | number;
  outstanding?: string | number;
  minimum_amount?: string | number;
  meter_number?: string;
  [k: string]: unknown;
};

/** A data bundle or cable package offered by the provider. */
export type Plan = {
  variation_id: string;
  name: string;
  price: string;
  validity?: string;
};

export const billingApi = {
  async getBillers(category: BillCategory, country = "NG"): Promise<Biller[]> {
    const { data } = await api.get<Paginated<Biller> | Biller[]>("/billing/billers/", {
      params: { category, country },
    });
    return Array.isArray(data) ? data : data.results;
  },

  async purchase(input: PurchaseInput): Promise<BillOrder> {
    const { data } = await api.post<BillOrder>("/billing/purchase/", {
      currency: "NGN",
      country: "NG",
      ...input,
    });
    return data;
  },

  /**
   * Fund a betting account. The user pays `amount + ₦50` (flat OAM service fee);
   * the betting account is credited with `amount`. Wallet-only.
   */
  async fundBetting(input: {
    code: string;            // provider, e.g. "Bet9ja" (case-sensitive)
    customer_id: string;     // betting account id
    amount: number | string;
    verification_id: string;
  }): Promise<BillOrder> {
    const { data } = await api.post<BillOrder>("/billing/betting/fund/", {
      country: "NG",
      currency: "NGN",
      ...input,
    });
    return data;
  },

  /** Live data bundles for a network (GET /billing/data-plans/?code=MTN). */
  async getDataPlans(code: string, country = "NG"): Promise<Plan[]> {
    const { data } = await api.get<{ plans: Plan[] }>("/billing/data-plans/", {
      params: { code, country },
    });
    return data.plans ?? [];
  },

  /** Live cable packages (GET /billing/tv-plans/?code=dstv). */
  async getTvPlans(code: string, country = "NG"): Promise<Plan[]> {
    const { data } = await api.get<{ plans: Plan[] }>("/billing/tv-plans/", {
      params: { code, country },
    });
    return data.plans ?? [];
  },

  /** Confirm a meter/smartcard belongs to a real customer before paying. */
  async verifyCustomer(input: {
    category: "electricity" | "cable" | "betting";
    code: string;
    customer_id: string;
    meter_type?: string;
    variation?: string;
  }): Promise<VerifyResponse> {
    const { data } = await api.post("/billing/verify-customer/", {
      country: "NG",
      ...input,
    });
    return data;
  },

  async getOrders(): Promise<Paginated<BillOrder>> {
    const { data } = await api.get<Paginated<BillOrder>>("/billing/orders/");
    return data;
  },

  /**
   * Refresh every unfinished order (and collect any token that has landed).
   * This is what the Refresh button on Order history calls.
   */
  async refreshOrders(): Promise<{ checked: number; orders: BillOrder[] }> {
    const { data } = await api.post("/billing/orders/refresh/", {});
    return data;
  },

  /** Refresh a single order by reference. */
  async refreshOrder(reference: string): Promise<BillOrder> {
    const { data } = await api.post<BillOrder>(`/billing/orders/${reference}/refresh/`, {});
    return data;
  },

  /** Ask the backend to re-check a pending order with the provider. */
  async requeryOrder(reference: string): Promise<BillOrder> {
    const { data } = await api.post<BillOrder>(`/billing/orders/${reference}/requery/`, {});
    return data;
  },

  async getOrder(reference: string): Promise<BillOrder> {
    const { data } = await api.get<BillOrder>(`/billing/orders/${reference}/`);
    return data;
  },
};

/* ------------------------------------------------------------------ */
/* Pay-per-service with a CARD (Paystack)                              */
/* ------------------------------------------------------------------ */

export type CardCheckout = {
  id: string;
  category: string;
  code: string;
  recipient: string;
  amount: string;
  currency: string;
  plan_code: string;
  funding_reference: string;
  status: "pending" | "payment_received" | "delivered" | "failed";
  failure_reason: string;
  order_status: string | null;
  order_reference: string | null;
  created_at: string;
};

export const cardCheckoutApi = {
  /** Start a card payment for one service. Returns Paystack checkout URL. */
  async start(input: PurchaseInput): Promise<{
    checkout: CardCheckout;
    authorization_url: string;
    reference: string;
  }> {
    const { data } = await api.post("/billing/purchase/card/", {
      currency: "NGN",
      country: "NG",
      ...input,
    });
    return data;
  },

  /** After returning from Paystack: verify payment and get delivery status. */
  async status(reference: string): Promise<CardCheckout> {
    const { data } = await api.get<CardCheckout>(`/billing/purchase/card/${reference}/`);
    return data;
  },
};

/* ------------------------------------------------------------------ */
/* Platform revenue (ADMIN ONLY)                                       */
/* ------------------------------------------------------------------ */

export type RevenueRow = {
  currency: string;
  available_to_sweep: string;  // earned but not yet moved to a wallet
  total_earned: string;        // lifetime margin from bill orders
};

export const revenueApi = {
  /** GET /billing/revenue/ — accumulated OAM profit per currency. */
  async get(): Promise<RevenueRow[]> {
    const { data } = await api.get<{ revenue: RevenueRow[] }>("/billing/revenue/");
    return data.revenue ?? [];
  },

  /** POST /billing/revenue/sweep/ — move revenue into your own wallet. */
  async sweep(input: { currency: string; amount: number | string }): Promise<{
    detail: string;
    currency: string;
    wallet_balance: string;
    revenue_remaining: string;
  }> {
    const { data } = await api.post("/billing/revenue/sweep/", input);
    return data;
  },
};
