import { api } from "@/shared/api";

export type TravelLink = {
  program: string; category: string; url: string; sub_id: string;
  applied_params: Record<string, string>; ignored_params: Record<string, string>;
};

export const affiliatesApi = {
  /** Build the tracked partner URL. Empty params are dropped. */
  getLink: (slug: string, params: Record<string, string | number> = {}) => {
    const clean = Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && String(v) !== ""),
    );
    return api.post<TravelLink>(`/affiliates/travel/${slug}/link/`, { params: clean }).then((r) => r.data);
  },
};
