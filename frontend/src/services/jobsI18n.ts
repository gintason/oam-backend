/**
 * Jobs translations that live outside individual screens.
 *
 *  - (label tables like STATUS_LABEL translate themselves — see services/jobs.ts)
 *  - useJobsMeta(): the server's dropdown options (job types, levels, categories…)
 *    with their labels translated by value.
 *  - planLabel(): Free / Premium / Pro.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import i18n from "i18next";
import { useTranslation } from "react-i18next";
import { jobsApi, type JobsMeta } from "./jobs";

export const planLabel = (key: string, fallback?: string) =>
  i18n.t(`jobs.plan.${key}`, { defaultValue: fallback ?? key });

const KIND: Record<string, string> = {
  location_types: "location", employment_types: "employment", experience_levels: "level", categories: "category",
  salary_periods: "salaryPeriod", application_statuses: "appStatus", alert_frequencies: "alertFrequency",
};

export function useJobsMeta() {
  const q = useQuery({ queryKey: ["jobs-meta"], queryFn: jobsApi.meta, staleTime: 3600_000 });
  const { t, i18n: inst } = useTranslation();
  const lang = inst.language;
  const data = useMemo(() => {
    if (!q.data) return q.data;
    const choices = { ...q.data.choices } as JobsMeta["choices"];
    for (const [field, kind] of Object.entries(KIND)) {
      const list = (choices as Record<string, unknown>)[field];
      if (Array.isArray(list)) {
        (choices as Record<string, unknown>)[field] = list.map((c: { value: string; label: string }) => ({
          ...c, label: t(`jobs.${kind}.${c.value}`, { defaultValue: c.label }),
        }));
      }
    }
    return { ...q.data, choices };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-run when the language changes
  }, [q.data, t, lang]);
  return { ...q, data };
}
