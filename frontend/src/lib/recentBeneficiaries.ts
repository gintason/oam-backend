import { useEffect, useState } from "react";
import type { BillCategory } from "../services/billing";

/**
 * On-device "recent beneficiaries" store — numbers/meters/smartcards a user has
 * recharged, kept in localStorage. No backend required: a recharge saves the
 * target here on success, and the purchase screens read it straight back.
 *
 * Per service, most-recent first, capped. Each entry can carry a user nickname
 * ("John") so a returning user picks the name instead of the number.
 *
 * Per device (localStorage isn't shared across phones). Swap the read/write
 * here for an API later if cross-device sync is wanted — the component and the
 * save hook won't need to change.
 */
export type Recent = {
  id: string; // == account_identifier (unique per service)
  service_type: BillCategory;
  account_identifier: string; // phone / meter / smartcard
  biller_code: string; // provider code — re-selects the form <select>
  biller_name: string;
  customer_name: string; // last verified account holder (meters/smartcards)
  label: string; // user nickname, e.g. "John"
  last_used_at: string;
};

const MAX_PER_SERVICE = 10;
const keyFor = (t: BillCategory) => `oam.recents.${t}`;

// Simple in-app pub/sub so every mounted list refreshes the instant one changes
// (a recharge on the screen, a rename in the row) without a page reload.
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function read(type: BillCategory): Recent[] {
  try {
    const raw = localStorage.getItem(keyFor(type));
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function write(type: BillCategory, list: Recent[]) {
  try {
    localStorage.setItem(keyFor(type), JSON.stringify(list));
  } catch {
    /* storage full / disabled — non-critical */
  }
  emit();
}

export type SaveRecentInput = {
  service_type: BillCategory;
  account_identifier: string;
  biller_code?: string;
  biller_name?: string;
  customer_name?: string;
};

/** Upsert: re-saving an existing number just floats it to the top (keeping its name). */
export function saveRecent(input: SaveRecentInput) {
  const id = (input.account_identifier || "").trim();
  if (!id) return;
  const list = read(input.service_type);
  const existing = list.find((r) => r.account_identifier === id);
  const entry: Recent = {
    id,
    service_type: input.service_type,
    account_identifier: id,
    biller_code: input.biller_code || existing?.biller_code || "",
    biller_name: input.biller_name || existing?.biller_name || "",
    customer_name: input.customer_name || existing?.customer_name || "",
    label: existing?.label || "",
    last_used_at: new Date().toISOString(),
  };
  const next = [entry, ...list.filter((r) => r.account_identifier !== id)].slice(
    0,
    MAX_PER_SERVICE,
  );
  write(input.service_type, next);
}

export function renameRecent(type: BillCategory, id: string, label: string) {
  write(
    type,
    read(type).map((r) => (r.id === id ? { ...r, label } : r)),
  );
}

export function removeRecent(type: BillCategory, id: string) {
  write(
    type,
    read(type).filter((r) => r.id !== id),
  );
}

/** Reactive read — re-renders on save/rename/remove, and on changes from other tabs. */
export function useRecents(type: BillCategory): Recent[] {
  const [list, setList] = useState<Recent[]>(() => read(type));
  useEffect(() => {
    const update = () => setList(read(type));
    update();
    listeners.add(update);
    const onStorage = (e: StorageEvent) => {
      if (e.key === keyFor(type)) update();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(update);
      window.removeEventListener("storage", onStorage);
    };
  }, [type]);
  return list;
}
