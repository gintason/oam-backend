import { saveRecent, type SaveRecentInput } from "../lib/recentBeneficiaries";

/**
 * Returns a fire-and-forget `saveBeneficiary(...)` to call from a purchase's
 * onSuccess. Same call shape the screens already use — it now writes to the
 * on-device store, so it works with no backend.
 *
 *   const saveBeneficiary = useSaveBeneficiary();
 *   // inside purchase.onSuccess, once status === "success":
 *   saveBeneficiary({ service_type: "airtime", account_identifier: data.recipient,
 *                     biller_code: network, biller_name: data.biller_name });
 */
export function useSaveBeneficiary() {
  return (input: SaveRecentInput): void => {
    try {
      saveRecent(input);
    } catch {
      /* saving a recent must never break a purchase */
    }
  };
}
