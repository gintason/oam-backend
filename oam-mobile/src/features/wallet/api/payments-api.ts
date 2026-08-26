import { api } from "@/shared/api";

export type FundInit = {
  transaction: { internal_reference: string; status: string; amount: string; currency: string };
  authorization_url: string;
  reference: string;
};

export type FundVerify = {
  id: string;
  service_type: string;
  provider: string;
  status: string; // "success" | "pending" | "failed" | ...
  amount: string;
  currency: string;
  internal_reference: string;
  provider_reference: string;
  created_at: string;
  updated_at: string;
};

export const paymentsApi = {
  fundInit: (input: { amount: number | string; currency?: string; callback_url?: string }) =>
    api
      .post<FundInit>("/payments/fund/", { currency: "NGN", ...input })
      .then((r) => r.data),

  verifyFunding: (reference: string) =>
    api.get<FundVerify>(`/payments/fund/verify/${reference}/`).then((r) => r.data),
};
