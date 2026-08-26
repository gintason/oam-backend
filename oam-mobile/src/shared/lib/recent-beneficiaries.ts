/**
 * Recently used recipients per service, saved on-device with an optional name.
 * Mirror of the web `recentBeneficiaries` (localStorage) — here backed by
 * AsyncStorage with an in-memory cache + pub/sub so a hook can read it sync.
 * Keyed oam.recents.<type>, capped, upserted by identifier.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";

export type RecentItem = {
  id: string; // = account_identifier
  service_type: string;
  account_identifier: string;
  label?: string;
  biller_code?: string;
  biller_name?: string;
  customer_name?: string;
  saved_at: number;
};

export type SaveRecentInput = {
  service_type: string;
  account_identifier: string;
  label?: string;
  biller_code?: string;
  biller_name?: string;
  customer_name?: string;
};

const CAP = 10;
const keyFor = (type: string) => `oam.recents.${type}`;

const cache: Record<string, RecentItem[]> = {};
const loaded: Record<string, boolean> = {};
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

async function ensureLoaded(type: string) {
  if (loaded[type]) return;
  try {
    const raw = await AsyncStorage.getItem(keyFor(type));
    cache[type] = raw ? (JSON.parse(raw) as RecentItem[]) : [];
  } catch {
    cache[type] = [];
  }
  loaded[type] = true;
  emit();
}

async function persist(type: string) {
  try {
    await AsyncStorage.setItem(keyFor(type), JSON.stringify(cache[type] ?? []));
  } catch {
    /* non-critical */
  }
}

export async function saveRecent(input: SaveRecentInput) {
  const id = (input.account_identifier || "").trim();
  if (!id) return;
  const type = input.service_type;
  await ensureLoaded(type);
  const list = cache[type] ?? [];
  const existing = list.find((x) => x.account_identifier === id);
  const entry: RecentItem = {
    id,
    service_type: type,
    account_identifier: id,
    label: input.label ?? existing?.label,
    biller_code: input.biller_code ?? existing?.biller_code,
    biller_name: input.biller_name ?? existing?.biller_name,
    customer_name: input.customer_name ?? existing?.customer_name,
    saved_at: Date.now(),
  };
  cache[type] = [entry, ...list.filter((x) => x.account_identifier !== id)].slice(0, CAP);
  emit();
  await persist(type);
}

export async function renameRecent(type: string, id: string, label: string) {
  await ensureLoaded(type);
  cache[type] = (cache[type] ?? []).map((x) =>
    x.account_identifier === id ? { ...x, label: label.trim() || undefined } : x,
  );
  emit();
  await persist(type);
}

export async function removeRecent(type: string, id: string) {
  await ensureLoaded(type);
  cache[type] = (cache[type] ?? []).filter((x) => x.account_identifier !== id);
  emit();
  await persist(type);
}

/** Reactive read — re-renders when this type's recents change. */
export function useRecents(type: string): RecentItem[] {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    ensureLoaded(type);
    return () => {
      listeners.delete(l);
    };
  }, [type]);
  return cache[type] ?? [];
}
