import { api } from "@/shared/api";
import type { MarketCategory, ListingListItem, ListingDetail, ListingWrite, Subscription } from "@/entities/marketplace";

export type BrowseParams = {
  category?: string; q?: string; min_price?: string; max_price?: string; location?: string; condition?: string;
};

export const marketplaceApi = {
  categories: () =>
    api.get<{ results?: MarketCategory[] } | MarketCategory[]>("/marketplace/categories/")
      .then((r) => (Array.isArray(r.data) ? r.data : r.data.results ?? [])),

  browse: (params: BrowseParams) =>
    api.get<{ count?: number; results?: ListingListItem[] } | ListingListItem[]>("/marketplace/listings/", { params })
      .then((r) => {
        const d = r.data as { count?: number; results?: ListingListItem[] };
        const results = Array.isArray(r.data) ? (r.data as ListingListItem[]) : d.results ?? [];
        return { count: (d.count ?? results.length) as number, results };
      }),

  detail: (id: string) => api.get<ListingDetail>(`/marketplace/listings/${id}/`).then((r) => r.data),

  create: (input: ListingWrite) =>
    api.post<ListingDetail>("/marketplace/listings/create/", { currency: "NGN", ...input }).then((r) => r.data),

  renew: (id: string) => api.post<ListingDetail>(`/marketplace/listings/${id}/renew/`, {}).then((r) => r.data),

  mine: () =>
    api.get<{ count?: number; results?: ListingListItem[] }>("/marketplace/my-listings/")
      .then((r) => ({ count: r.data.count ?? r.data.results?.length ?? 0, results: r.data.results ?? [] })),

  subscription: () => api.get<Subscription>("/marketplace/subscription/").then((r) => r.data),

  /** Start a Pro/Premium upgrade — returns the Flutterwave checkout link + our reference. */
  subscribe: (tier: "premium" | "pro", currency = "NGN") =>
    api.post<{ authorization_url: string; reference: string }>("/marketplace/subscription/subscribe/", { tier, currency })
      .then((r) => r.data),

  /** Confirm the upgrade after checkout; the backend verifies with the gateway and activates the tier. */
  verifySubscription: (reference: string) =>
    api.post<{ payment_status?: string; tier?: string; expires_at?: string }>("/marketplace/subscription/verify/", { reference })
      .then((r) => r.data),
};
