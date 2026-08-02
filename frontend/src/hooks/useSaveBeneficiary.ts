import { useQueryClient } from "@tanstack/react-query";
import { beneficiariesApi, type SaveBeneficiaryInput } from "../services/beneficiaries";

/**
 * Returns a fire-and-forget `saveBeneficiary(...)` to call from a purchase's
 * onSuccess. It records the number/meter/smartcard so it appears in "Recent"
 * next time, and refreshes the on-screen list.
 *
 * Deliberately swallows errors: a beneficiary is a convenience record, and a
 * failure to save one must never surface as if the purchase itself failed.
 *
 *   const saveBeneficiary = useSaveBeneficiary();
 *   // inside purchase.onSuccess, once status === "success":
 *   saveBeneficiary({ service_type: "airtime", account_identifier: data.recipient,
 *                     biller_code: network, biller_name: data.biller_name });
 */
export function useSaveBeneficiary() {
  const qc = useQueryClient();
  return async (input: SaveBeneficiaryInput): Promise<void> => {
    if (!input.account_identifier?.trim()) return;
    try {
      await beneficiariesApi.save(input);
      qc.invalidateQueries({ queryKey: ["beneficiaries", input.service_type] });
    } catch {
      /* saving a beneficiary must never break a purchase */
    }
  };
}
