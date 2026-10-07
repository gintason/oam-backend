import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useInfiniteQuery, useMutation} from "@tanstack/react-query";
import { Search, SlidersHorizontal, BellPlus, X, SearchX, Check } from "lucide-react";
import { JobsShell, Chip, Spinner, EmptyState, Button, TextInput, Select, ErrorNote } from "../../components/jobs/ui";
import JobCard from "../../components/jobs/JobCard";
import { jobsApi, toParams, type SearchFilters } from "../../services/jobs";
import { apiErrorMessage } from "../../lib/api";
import { useDebounced } from "../../hooks/useDebounced";
import { useUserScope } from "../../auth/useUserScope";
import { useTranslation } from "react-i18next";
import { useJobsMeta } from "../../services/jobsI18n";

const MULTI = ["location_type", "employment_type", "experience_level", "category"] as const;

/** Read filters from the URL so a search can be bookmarked, shared or saved as an alert. */
function fromUrl(p: URLSearchParams): { q: string; filters: SearchFilters; ordering: string } {
  const filters: SearchFilters = {};
  for (const k of MULTI) {
    const v = p.get(k);
    if (v) filters[k] = v.split(",");
  }
  for (const k of ["country", "location", "salary_min", "posted_within", "skills"] as const) {
    const v = p.get(k);
    if (v) filters[k] = v;
  }
  return { q: p.get("q") ?? "", filters, ordering: p.get("ordering") ?? "relevance" };
}

export default function JobSearch() {
  const { t } = useTranslation();
  const scope = useUserScope();
  const [params, setParams] = useSearchParams();
  const initial = useMemo(() => fromUrl(params), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [q, setQ] = useState(initial.q);
  const [filters, setFilters] = useState<SearchFilters>(initial.filters);
  const [ordering, setOrdering] = useState(initial.ordering);
  const [showFilters, setShowFilters] = useState(false);
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  const dq = useDebounced(q, 350);

  const meta = useJobsMeta();
  const c = meta.data?.choices;

  const query = toParams(dq, filters, ordering !== "relevance" ? { ordering } : {});
  const key = JSON.stringify(query);

  useEffect(() => {
    setParams(query, { replace: true });
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  const results = useInfiniteQuery({
    queryKey: ["jobs", scope, "search", key],
    queryFn: ({ pageParam }) => jobsApi.search({ ...query, page: String(pageParam) }),
    initialPageParam: 1,
    getNextPageParam: (last, all) => (last.next ? all.length + 1 : undefined),
  });
  const jobs = results.data?.pages.flatMap((p) => p.results) ?? [];
  const count = results.data?.pages[0]?.count ?? 0;

  const saveAlert = useMutation({
    mutationFn: () =>
      jobsApi.createSavedSearch({
        name: dq.trim() || describe(filters) || t("jobs.jobSearch.myJobSearch"),
        query: dq.trim(),
        filters,
        frequency: "daily",
        alert_enabled: true,
        notify_push: true,
      }),
    onSuccess: () => setSavedKey(key),
    onError: (err) => setError(apiErrorMessage(err, t("jobs.jobSearch.couldnTSaveThisSearch"))),
  });

  function toggle(k: (typeof MULTI)[number], v: string) {
    setFilters((f) => {
      const cur = f[k] ?? [];
      const next = cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v];
      return { ...f, [k]: next };
    });
  }
  function set<K extends keyof SearchFilters>(k: K, v: SearchFilters[K]) {
    setFilters((f) => ({ ...f, [k]: v }));
  }
  const alertSaved = savedKey === key;
  const activeCount = Object.values(filters).filter((v) => (Array.isArray(v) ? v.length : v)).length;

  return (
    <JobsShell>
      <div className="flex gap-2">
        <label className="relative flex-1">
          <span className="sr-only">{t("jobs.jobSearch.keywords")}</span>
          <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <TextInput
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("jobs.jobSearch.titleSkillOrCompanyTry")}
            className="h-11 pl-9"
          />
        </label>
        <button
          type="button"
          onClick={() => setShowFilters((s) => !s)}
          className="inline-flex h-11 items-center gap-1.5 rounded-lg border border-hairline bg-paper px-3.5 text-[13.5px] font-medium text-ink hover:bg-mist lg:hidden"
          aria-expanded={showFilters}
        >
          <SlidersHorizontal size={16} />{" "}{t("jobs.jobSearch.filters")}{activeCount ? ` (${activeCount})` : ""}
        </button>
      </div>

      <div className="mt-4 grid gap-5 lg:grid-cols-[260px_1fr]">
        {/* Filters */}
        <aside className={`${showFilters ? "block" : "hidden"} space-y-5 rounded-2xl border border-hairline bg-paper p-4 lg:block lg:self-start`}>
          <FilterGroup title={t("jobs.jobSearch.workSetting")}>
            {(c?.location_types ?? []).map((o) => (
              <Chip key={o.value} active={Boolean(filters.location_type?.includes(o.value))}
                    onClick={() => toggle("location_type", o.value)}>{o.label}</Chip>
            ))}
          </FilterGroup>
          <FilterGroup title={t("jobs.jobSearch.jobType")}>
            {(c?.employment_types ?? []).map((o) => (
              <Chip key={o.value} active={Boolean(filters.employment_type?.includes(o.value))}
                    onClick={() => toggle("employment_type", o.value)}>{o.label}</Chip>
            ))}
          </FilterGroup>
          <FilterGroup title={t("jobs.jobSearch.experience")}>
            {(c?.experience_levels ?? []).map((o) => (
              <Chip key={o.value} active={Boolean(filters.experience_level?.includes(o.value))}
                    onClick={() => toggle("experience_level", o.value)}>{o.label}</Chip>
            ))}
          </FilterGroup>
          <div>
            <p className="mb-2 text-[12.5px] font-semibold text-ink">{t("jobs.jobSearch.category")}</p>
            <Select
              value={filters.category?.[0] ?? ""}
              onChange={(e) => set("category", e.target.value ? [e.target.value] : [])}
              aria-label={t("jobs.jobSearch.category")}
            >
              <option value="">{t("jobs.jobSearch.allCategories")}</option>
              {(c?.categories ?? []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          </div>
          <div>
            <p className="mb-2 text-[12.5px] font-semibold text-ink">{t("jobs.jobSearch.location")}</p>
            <TextInput value={filters.location ?? ""} onChange={(e) => set("location", e.target.value)}
                       placeholder={t("jobs.jobSearch.cityEGLagos")} aria-label={t("jobs.jobSearch.city")} />
          </div>
          <div>
            <p className="mb-2 text-[12.5px] font-semibold text-ink">{t("jobs.jobSearch.paysAtLeastMonthly")}</p>
            <TextInput inputMode="numeric" value={filters.salary_min ?? ""}
                       onChange={(e) => set("salary_min", e.target.value.replace(/\D/g, ""))}
                       placeholder={t("jobs.jobSearch.salaryPlaceholder")} aria-label={t("jobs.jobSearch.minimumSalary")} />
          </div>
          <div>
            <p className="mb-2 text-[12.5px] font-semibold text-ink">{t("jobs.jobSearch.posted")}</p>
            <Select value={filters.posted_within ?? ""} onChange={(e) => set("posted_within", e.target.value)} aria-label={t("jobs.jobSearch.postedWithin")}>
              <option value="">{t("jobs.jobSearch.anyTime")}</option>
              <option value="1">{t("jobs.jobSearch.last24Hours")}</option>
              <option value="7">{t("jobs.jobSearch.last7Days")}</option>
              <option value="30">{t("jobs.jobSearch.last30Days")}</option>
            </Select>
          </div>
          {activeCount > 0 && (
            <button onClick={() => setFilters({})} className="inline-flex items-center gap-1 text-[13px] font-medium text-muted hover:text-ink">
              <X size={14} />{" "}{t("jobs.jobSearch.clearFilters")}
            </button>
          )}
        </aside>

        {/* Results */}
        <section>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[13.5px] text-muted" aria-live="polite">
              {results.isLoading ? t("jobs.jobSearch.searching") : t("jobs.jobSearch.jobCount", { count, n: count.toLocaleString() })}
            </p>
            <div className="flex items-center gap-2">
              <Select value={ordering} onChange={(e) => setOrdering(e.target.value)} className="h-9 w-auto text-[13px]" aria-label={t("jobs.jobSearch.sortBy")}>
                <option value="relevance">{t("jobs.jobSearch.mostRelevant")}</option>
                <option value="newest">{t("jobs.jobSearch.newest")}</option>
                <option value="salary">{t("jobs.jobSearch.highestSalary")}</option>
                <option value="closing">{t("jobs.jobSearch.closingSoon")}</option>
              </Select>
              <Button size="sm" variant="secondary" onClick={() => saveAlert.mutate()} loading={saveAlert.isPending} disabled={alertSaved}>
                {alertSaved ? <><Check size={14} />{" "}{t("jobs.jobSearch.alertSaved")}</> : <><BellPlus size={14} />{" "}{t("jobs.jobSearch.getAlerts")}</>}
              </Button>
            </div>
          </div>
          <ErrorNote>{error}</ErrorNote>

          {results.isLoading ? (
            <Spinner />
          ) : jobs.length === 0 ? (
            <EmptyState
              icon={<SearchX size={20} />}
              title={t("jobs.jobSearch.noJobsMatchYet")}
              body={t("jobs.jobSearch.tryFewerFiltersOrA")}
            />
          ) : (
            <div className="space-y-3">
              {jobs.map((j) => <JobCard key={j.id} job={j} />)}
              {results.hasNextPage && (
                <div className="pt-2 text-center">
                  <Button variant="secondary" onClick={() => results.fetchNextPage()} loading={results.isFetchingNextPage}>
                    {t("jobs.jobSearch.loadMore")}
                  </Button>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </JobsShell>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-[12.5px] font-semibold text-ink">{title}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function describe(f: SearchFilters): string {
  const bits = [...(f.location_type ?? []), ...(f.employment_type ?? []), f.location ?? ""]
    .filter(Boolean).map((s) => String(s).replace("_", "-"));
  return bits.join(" · ");
}
