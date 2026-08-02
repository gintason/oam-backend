/**
 * Saved beneficiaries (recent numbers, meters, smartcards) — /api/v1/beneficiaries/.
 *
 * The backend keeps one de-duplicated row per (service, identifier) and returns
 * them most-recent first, capped. See beneficiaries/ Django app.
 */
import { api } from "../lib/api";
import type { BillCategory } from "./billing";

export type Beneficiary = {
  id: string;
  service_type: BillCategory;
  account_identifier: string; // phone / meter / smartcard
  biller_code: string;        // provider code — used to re-select the form <select>
  biller_name: string;        // display only, e.g. "MTN", "Ikeja Electric"
  customer_name: string;      // last verified account holder (meters/smartcards)
  label: string;              // optional user nickname
  last_used_at: string;
};

export type SaveBeneficiaryInput = {
  service_type: BillCategory;
  account_identifier: string;
  biller_code?: string;
  biller_name?: string;
  customer_name?: string;
};

export const beneficiariesApi = {
  async list(type: BillCategory): Promise<Beneficiary[]> {
    const { data } = await api.get<Beneficiary[] | { results: Beneficiary[] }>(
      "/beneficiaries/",
      { params: { type } },
    );
    return Array.isArray(data) ? data : data.results ?? [];
  },

  /** Idempotent — creating one that already exists just refreshes it. */
  async save(input: SaveBeneficiaryInput): Promise<Beneficiary> {
    const { data } = await api.post<Beneficiary>("/beneficiaries/", input);
    return data;
  },

  async setLabel(id: string, label: string): Promise<Beneficiary> {
    const { data } = await api.patch<Beneficiary>(`/beneficiaries/${id}/`, { label });
    return data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/beneficiaries/${id}/`);
  },
};
