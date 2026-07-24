/**
 * Payments (wallet funding) API service — /api/v1/payments/.
 * Card funding via Paystack's hosted checkout (redirect flow — no Paystack key
 * needed in the frontend; the secret key stays on the backend).
 * Requires a verified user.
 */
import { api } from "../lib/api";

export type FundInitResponse = {
  transaction: { internal_reference: string; status: string; amount: string; currency: string };
  authorization_url: string;   // Paystack hosted checkout URL
  reference: string;           // our internal reference (used to verify on return)
};

export type FundVerifyResponse = {
  id: string;
  service_type: string;
  provider: string;
  status: string;              // "success" | "pending" | "failed" | ...
  amount: string;
  currency: string;
  internal_reference: string;
  provider_reference: string;
  created_at: string;
  updated_at: string;
};

export const paymentsApi = {
  async fundInit(input: { amount: number | string; currency?: string }): Promise<FundInitResponse> {
    const { data } = await api.post<FundInitResponse>("/payments/fund/", {
      amount: input.amount,
      currency: input.currency ?? "NGN",
    });
    return data;
  },

  async verifyFunding(reference: string): Promise<FundVerifyResponse> {
    const { data } = await api.get<FundVerifyResponse>(`/payments/fund/verify/${reference}/`);
    return data;
  },
};
