import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Check, Clock, Pencil, X } from "lucide-react";
import { beneficiariesApi, type Beneficiary } from "../services/beneficiaries";
import type { BillCategory } from "../services/billing";

/**
 * "Recent numbers" / "Saved meters & smartcards" for the utility purchase
 * screens. Fetches its own list and renders nothing when empty.
 *
 * Each saved item can be given a name ("John"), so a returning user picks the
 * name instead of remembering the number. Airtime & Data show a horizontal
 * chip row; Electricity & Cable show a list with the last verified customer
 * name. Tapping an item fills the form — the screen's own auto-verify effect
 * then re-runs the account lookup for meters/smartcards.
 *
 * Touch-first: name/delete actions are always visible (no hover-only controls),
 * since the app runs on phones.
 */
type Props = {
  type: BillCategory;
  onPick: (b: Beneficiary) => void;
  /** Pass the screen's `isVerified` to skip the call for users who can't have any. */
  enabled?: boolean;
};

export default function RecentBeneficiaries({ type, onPick, enabled = true }: Props) {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const q = useQuery({
    queryKey: ["beneficiaries", type],
    queryFn: () => beneficiariesApi.list(type),
    enabled,
    staleTime: 60_000,
  });

  const rename = useMutation({
    mutationFn: ({ id, label }: { id: string; label: string }) =>
      beneficiariesApi.setLabel(id, label),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["beneficiaries", type] });
      setEditingId(null);
      setDraft("");
    },
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

  function startEdit(b: Beneficiary) {
    setEditingId(b.id);
    setDraft(b.label || "");
  }
  function cancelEdit() {
    setEditingId(null);
    setDraft("");
  }
  function saveEdit(id: string) {
    rename.mutate({ id, label: draft.trim() });
  }
  async function remove(id: string) {
    try {
      await beneficiariesApi.remove(id);
      qc.invalidateQueries({ queryKey: ["beneficiaries", type] });
    } catch {
      /* non-critical */
    }
  }

  // Inline name editor, shared by both layouts.
  const editor = (id: string) => (
    <div className="flex flex-1 items-center gap-1.5">
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value.slice(0, 40))}
        onKeyDown={(e) => {
          if (e.key === "Enter") saveEdit(id);
          if (e.key === "Escape") cancelEdit();
        }}
        placeholder={t("beneficiaries.namePlaceholder")}
        className="h-8 min-w-0 flex-1 rounded-lg border border-hairline bg-paper px-2.5 text-[13px] text-ink outline-none focus:border-brand-green"
      />
      <button
        type="button"
        onClick={() => saveEdit(id)}
        disabled={rename.isPending}
        aria-label={t("beneficiaries.save")}
        className="shrink-0 rounded-lg p-1.5 text-brand-green hover:bg-brand-green/10"
      >
        <Check size={16} strokeWidth={2.5} />
      </button>
      <button
        type="button"
        onClick={cancelEdit}
        aria-label={t("beneficiaries.cancel")}
        className="shrink-0 rounded-lg p-1.5 text-muted hover:bg-mist hover:text-ink"
      >
        <X size={16} strokeWidth={2.5} />
      </button>
    </div>
  );

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
              className="flex items-center gap-2 rounded-xl border border-hairline bg-paper px-3 py-2.5"
            >
              {editingId === b.id ? (
                editor(b.id)
              ) : (
                <>
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
                    onClick={() => startEdit(b)}
                    aria-label={t("beneficiaries.rename")}
                    className="shrink-0 rounded-lg p-1.5 text-muted hover:bg-mist hover:text-ink"
                  >
                    <Pencil size={14} strokeWidth={2} />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(b.id)}
                    aria-label={t("beneficiaries.remove")}
                    className="shrink-0 rounded-lg p-1.5 text-muted hover:bg-mist hover:text-ink"
                  >
                    <X size={15} strokeWidth={2} />
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <div className="-mx-0.5 flex gap-2 overflow-x-auto px-0.5 pb-1">
          {items.map((b) =>
            editingId === b.id ? (
              <div
                key={b.id}
                className="inline-flex w-56 shrink-0 items-center rounded-xl border border-hairline bg-paper px-2 py-1"
              >
                {editor(b.id)}
              </div>
            ) : (
              <div
                key={b.id}
                className="inline-flex shrink-0 items-center rounded-2xl border border-hairline bg-paper py-1 pl-3 pr-1"
              >
                <button
                  type="button"
                  onClick={() => onPick(b)}
                  className="flex flex-col items-start text-left"
                >
                  <span className="text-[13px] font-medium leading-tight text-ink">
                    {b.label || b.account_identifier}
                  </span>
                  {b.label && (
                    <span className="text-[10px] leading-tight text-muted">
                      {b.account_identifier}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => startEdit(b)}
                  aria-label={t("beneficiaries.rename")}
                  className="ml-1 shrink-0 rounded-full p-1 text-muted hover:bg-mist hover:text-ink"
                >
                  <Pencil size={12} strokeWidth={2} />
                </button>
                <button
                  type="button"
                  onClick={() => remove(b.id)}
                  aria-label={t("beneficiaries.remove")}
                  className="shrink-0 rounded-full p-1 text-muted hover:bg-mist hover:text-ink"
                >
                  <X size={12} strokeWidth={2.5} />
                </button>
              </div>
            ),
          )}
        </div>
      )}
    </div>
  );
}
