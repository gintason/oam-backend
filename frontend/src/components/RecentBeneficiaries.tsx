import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Clock, Pencil, X } from "lucide-react";
import {
  useRecents,
  renameRecent,
  removeRecent,
  type Recent,
} from "../lib/recentBeneficiaries";
import type { BillCategory } from "../services/billing";

/**
 * "Recent numbers" / "Saved meters & smartcards" for the utility purchase
 * screens. Reads the on-device store and renders nothing when empty.
 *
 * Naming: an UNNAMED item shows an explicit green "Name" button, so a returning
 * user can tag a number as "John" and pick the name next time. A NAMED item
 * shows a pencil to rename. Tapping the item fills the form — the screen's own
 * auto-verify effect then re-runs the meter/smartcard lookup.
 *
 * Labels use i18n with English fallbacks, so they render correctly whether or
 * not the translation keys are present. Touch-first: all actions are always
 * visible (no hover-only controls).
 */
type Props = {
  type: BillCategory;
  onPick: (b: Recent) => void;
  enabled?: boolean; // accepted for call-site compatibility; not needed on-device
};

export default function RecentBeneficiaries({ type, onPick }: Props) {
  const { t } = useTranslation();
  const items = useRecents(type);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  if (!items.length) return null;

  const isList = type === "electricity" || type === "cable";
  const title =
    type === "electricity"
      ? t("beneficiaries.savedMeters", { defaultValue: "Saved meters" })
      : type === "cable"
      ? t("beneficiaries.savedCards", { defaultValue: "Saved smartcards" })
      : t("beneficiaries.recentNumbers", { defaultValue: "Recent numbers" });

  function startEdit(b: Recent) {
    setEditingId(b.id);
    setDraft(b.label || "");
  }
  function cancelEdit() {
    setEditingId(null);
    setDraft("");
  }
  function saveEdit(id: string) {
    renameRecent(type, id, draft.trim());
    setEditingId(null);
    setDraft("");
  }

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
        placeholder={t("beneficiaries.namePlaceholder", { defaultValue: "Name (e.g. John)" })}
        className="h-8 min-w-0 flex-1 rounded-lg border border-hairline bg-paper px-2.5 text-[13px] text-ink outline-none focus:border-brand-green"
      />
      <button
        type="button"
        onClick={() => saveEdit(id)}
        aria-label={t("beneficiaries.save", { defaultValue: "Save" })}
        className="shrink-0 rounded-lg p-1.5 text-brand-green hover:bg-brand-green/10"
      >
        <Check size={16} strokeWidth={2.5} />
      </button>
      <button
        type="button"
        onClick={cancelEdit}
        aria-label={t("beneficiaries.cancel", { defaultValue: "Cancel" })}
        className="shrink-0 rounded-lg p-1.5 text-muted hover:bg-mist hover:text-ink"
      >
        <X size={16} strokeWidth={2.5} />
      </button>
    </div>
  );

  const nameAction = (b: Recent) =>
    b.label ? (
      <button
        type="button"
        onClick={() => startEdit(b)}
        aria-label={t("beneficiaries.rename", { defaultValue: "Rename" })}
        className="shrink-0 rounded-lg p-1.5 text-muted hover:bg-mist hover:text-ink"
      >
        <Pencil size={14} strokeWidth={2} />
      </button>
    ) : (
      <button
        type="button"
        onClick={() => startEdit(b)}
        className="inline-flex shrink-0 items-center gap-1 rounded-full border border-brand-green/30 bg-brand-green/[0.06] px-2 py-1 text-[11px] font-semibold text-brand-green"
      >
        <Pencil size={11} strokeWidth={2.5} />
        {t("beneficiaries.name", { defaultValue: "Name" })}
      </button>
    );

  const removeLabel = t("beneficiaries.remove", { defaultValue: "Remove" });

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
                  {nameAction(b)}
                  <button
                    type="button"
                    onClick={() => removeRecent(type, b.id)}
                    aria-label={removeLabel}
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
                className="inline-flex w-60 shrink-0 items-center rounded-xl border border-hairline bg-paper px-2 py-1"
              >
                {editor(b.id)}
              </div>
            ) : (
              <div
                key={b.id}
                className="inline-flex shrink-0 items-center gap-1 rounded-2xl border border-hairline bg-paper py-1 pl-3 pr-1.5"
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
                {nameAction(b)}
                <button
                  type="button"
                  onClick={() => removeRecent(type, b.id)}
                  aria-label={removeLabel}
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
