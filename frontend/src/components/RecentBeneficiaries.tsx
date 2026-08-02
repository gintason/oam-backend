import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Clock, X } from "lucide-react";
import { beneficiariesApi, type Beneficiary } from "../services/beneficiaries";
import type { BillCategory } from "../services/billing";

/**
 * "Recent numbers" / "Saved meters & smartcards" for the utility purchase
 * screens. Fetches its own list and renders nothing when empty, so it can be
 * dropped straight above an input without cluttering a first-time user's view.
 *
 * Airtime & Data render as a horizontal chip row (tap to fill the number).
 * Electricity & Cable render as a list showing the saved meter/smartcard, an
 * optional nickname, and the last verified customer name; tapping fills the
 * form — the screen's existing auto-verify effect then re-runs the lookup.
 *
 *   <RecentBeneficiaries
 *     type="electricity"
 *     onPick={(b) => { setDisco(b.biller_code); setMeter(b.account_identifier);
 *                      setCustomerName(undefined); setVerificationId(""); }}
 *   />
 */
type Props = {
  type: BillCategory;
  onPick: (b: Beneficiary) => void;
  /** Pass the screen's `isVerified` to avoid a call for users who can't have any. */
  enabled?: boolean;
};

export default function RecentBeneficiaries({ type, onPick, enabled = true }: Props) {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["beneficiaries", type],
    queryFn: () => beneficiariesApi.list(type),
    enabled,
    staleTime: 60_000,
  });

  const items = q.data ?? [];
  if (!items.length) return null;

  const isList = type === "electricity" || type === "cable";
  const title =
    type === "electricity"
      ? t("beneficiaries.savedMeters")
      : type === "cable"
      ? t("beneficiaries.savedCards")
      : t("beneficiaries.recentNumbers");

  async function remove(id: string) {
    try {
      await beneficiariesApi.remove(id);
      qc.invalidateQueries({ queryKey: ["beneficiaries", type] });
    } catch {
      /* non-critical */
    }
  }

  return (
    <div className="mb-3">
      <div className="mb-1.5 flex items-center gap-1.5 text-[12px] font-semibold text-muted">
        <Clock size={13} strokeWidth={2} />
        {title}
      </div>

      {isList ? (
        <ul className="space-y-1.5">
          {items.map((b) => (
            <li
              key={b.id}
              className="group flex items-center gap-2 rounded-xl border border-hairline bg-paper px-3 py-2.5 transition hover:border-brand-green/40 hover:bg-brand-green/[0.03]"
            >
              <button
                type="button"
                onClick={() => onPick(b)}
                className="min-w-0 flex-1 text-left"
              >
                <span className="block truncate text-[14px] font-medium text-ink">
                  {b.label || b.account_identifier}
                </span>
                <span className="block truncate text-[12px] text-muted">
                  {b.label ? `${b.account_identifier} · ` : ""}
                  {b.customer_name || b.biller_name}
                </span>
              </button>
              <button
                type="button"
                onClick={() => remove(b.id)}
                aria-label={t("beneficiaries.remove")}
                className="shrink-0 rounded-lg p-1.5 text-muted opacity-0 transition hover:bg-mist hover:text-ink group-hover:opacity-100"
              >
                <X size={15} strokeWidth={2} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="-mx-0.5 flex gap-2 overflow-x-auto px-0.5 pb-1">
          {items.map((b) => (
            <div
              key={b.id}
              className="group inline-flex shrink-0 items-center rounded-full border border-hairline bg-paper py-1 pl-3 pr-1.5 transition hover:border-brand-green/40"
            >
              <button
                type="button"
                onClick={() => onPick(b)}
                className="inline-flex items-center gap-1.5"
              >
                <span className="text-[13px] font-medium text-ink">
                  {b.label || b.account_identifier}
                </span>
                {b.biller_name && (
                  <span className="text-[11px] text-muted">{b.biller_name}</span>
                )}
              </button>
              <button
                type="button"
                onClick={() => remove(b.id)}
                aria-label={t("beneficiaries.remove")}
                className="ml-1 rounded-full p-0.5 text-muted transition hover:bg-mist hover:text-ink"
              >
                <X size={12} strokeWidth={2.5} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
