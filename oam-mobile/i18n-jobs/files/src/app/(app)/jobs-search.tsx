import { useMemo, useState } from "react";
import { View, Pressable, TextInput, FlatList, Modal, ScrollView, ActivityIndicator } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useInfiniteQuery, useMutation} from "@tanstack/react-query";
import { Search, SlidersHorizontal, BellPlus, Check, SearchX, X } from "lucide-react-native";
import { Text } from "@/shared/ui";
import { colors, fonts } from "@/shared/theme";
import { apiErrorMessage } from "@/shared/api";
import { useDebounced } from "@/shared/hooks/use-debounced";
import { jobsApi, toParams, type SearchFilters } from "@/features/jobs";
import { JobsScreen, ChipGroup, Chip, EmptyState, ErrorNote, Field, TextBox, PillButton } from "@/features/jobs/ui/kit";
import { JobCard } from "@/features/jobs/ui/JobCard";
import { useTranslation } from "react-i18next";
import { useJobsMeta } from "@/features/jobs/i18n";

const SORTS = [
  { value: "relevance", label: "jobs.search.sort.relevance" }, { value: "newest", label: "jobs.search.sort.newest" },
  { value: "salary", label: "jobs.search.sort.salary" }, { value: "closing", label: "jobs.search.sort.closing" },
];

export default function JobSearch() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ q?: string }>();
  const [q, setQ] = useState(params.q ?? "");
  const [filters, setFilters] = useState<SearchFilters>({});
  const [ordering, setOrdering] = useState("relevance");
  const [sheet, setSheet] = useState(false);
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dq = useDebounced(q, 400);
  const meta = useJobsMeta();
  const c = meta.data?.choices;

  const query = useMemo(() => toParams(dq, filters, ordering !== "relevance" ? { ordering } : {}), [dq, filters, ordering]);
  const key = JSON.stringify(query);
  const results = useInfiniteQuery({
    queryKey: ["jobs", "search", key],
    queryFn: ({ pageParam }) => jobsApi.search({ ...query, page: String(pageParam) }),
    initialPageParam: 1,
    getNextPageParam: (last, all) => (last.next ? all.length + 1 : undefined),
  });
  const jobs = results.data?.pages.flatMap((p) => p.results) ?? [];
  const count = results.data?.pages[0]?.count ?? 0;

  const saveAlert = useMutation({
    mutationFn: () => jobsApi.createSavedSearch({
      name: dq.trim() || [...(filters.location_type ?? []), filters.location ?? ""].filter(Boolean).join(" · ") || t("jobs.search.myJobSearch"),
      query: dq.trim(), filters, frequency: "daily", alert_enabled: true, notify_push: true,
    }),
    onSuccess: () => setSavedKey(key),
    onError: (err) => setError(apiErrorMessage(err, t("jobs.search.couldnTSaveThisSearch"))),
  });

  const toggle = (k: "location_type" | "employment_type" | "experience_level" | "category", v: string) =>
    setFilters((f) => { const cur = f[k] ?? []; return { ...f, [k]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] }; });
  const activeCount = Object.values(filters).filter((v) => (Array.isArray(v) ? v.length : v)).length;

  return (
    <JobsScreen title={t("jobs.search.findJobs")} side="seeker" scroll={false}>
      <FlatList
        data={jobs}
        keyExtractor={(j) => j.id}
        contentContainerStyle={{ padding: 20, paddingBottom: 48, gap: 12 }}
        keyboardShouldPersistTaps="handled"
        onEndReached={() => results.hasNextPage && !results.isFetchingNextPage && results.fetchNextPage()}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={
          <View style={{ gap: 10, marginBottom: 4 }}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 8, height: 46, borderRadius: 12, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.mist, paddingHorizontal: 12 }}>
                <Search size={17} color={colors.muted} />
                <TextInput value={q} onChangeText={setQ} returnKeyType="search" placeholder={t("jobs.search.titleSkillOrCompany")}
                           placeholderTextColor={colors.muted} style={{ flex: 1, fontFamily: fonts.regular, fontSize: 15, color: colors.ink }} />
              </View>
              <Pressable onPress={() => setSheet(true)} style={{ height: 46, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.hairline, flexDirection: "row", alignItems: "center", gap: 6 }}
                         accessibilityLabel={t("jobs.search.filters")}>
                <SlidersHorizontal size={17} color={colors.ink} />
                {activeCount ? <Text variant="label">{activeCount}</Text> : null}
              </Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {(c?.location_types ?? []).map((o) => (
                <Chip key={o.value} label={o.label} active={Boolean(filters.location_type?.includes(o.value))} onPress={() => toggle("location_type", o.value)} />
              ))}
            </ScrollView>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text variant="caption" color="muted">{results.isLoading ? t("jobs.search.searching") : t("jobs.search.jobCount", { count, n: count.toLocaleString() })}</Text>
              <Pressable onPress={() => saveAlert.mutate()} disabled={savedKey === key || saveAlert.isPending}
                         style={{ flexDirection: "row", alignItems: "center", gap: 5, height: 32, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1, borderColor: colors.hairline }}>
                {savedKey === key ? <Check size={14} color={colors.brand.green} /> : <BellPlus size={14} color={colors.ink} />}
                <Text variant="caption" color={savedKey === key ? "green" : "ink"}>{savedKey === key ? t("jobs.search.alertSaved") : t("jobs.search.getAlerts")}</Text>
              </Pressable>
            </View>
            <ErrorNote>{error}</ErrorNote>
          </View>
        }
        renderItem={({ item }) => <JobCard job={item} />}
        ListEmptyComponent={results.isLoading ? <ActivityIndicator color={colors.brand.green} style={{ marginTop: 30 }} /> : (
          <EmptyState icon={<SearchX size={20} color={colors.muted} />} title={t("jobs.search.noJobsMatchYet")}
                      body={t("jobs.search.tryFewerFiltersOrTap")} />
        )}
        ListFooterComponent={results.isFetchingNextPage ? <ActivityIndicator color={colors.brand.green} /> : null}
      />

      <Modal visible={sheet} animationType="slide" transparent onRequestClose={() => setSheet(false)}>
        <Pressable onPress={() => setSheet(false)} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }} />
        <View style={{ maxHeight: "85%", backgroundColor: colors.paper, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingBottom: 24 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, paddingBottom: 6 }}>
            <Text variant="heading">{t("jobs.search.filters")}</Text>
            <Pressable onPress={() => setSheet(false)} hitSlop={10}><X size={22} color={colors.ink} /></Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
            <Field label={t("jobs.search.jobType")}><ChipGroup options={c?.employment_types ?? []} value={filters.employment_type} onToggle={(v) => toggle("employment_type", v)} /></Field>
            <Field label={t("jobs.search.experience")}><ChipGroup options={c?.experience_levels ?? []} value={filters.experience_level} onToggle={(v) => toggle("experience_level", v)} /></Field>
            <Field label={t("jobs.search.category")}><ChipGroup options={c?.categories ?? []} value={filters.category} onToggle={(v) => toggle("category", v)} /></Field>
            <Field label={t("jobs.search.city")}><TextBox value={filters.location ?? ""} onChangeText={(v) => setFilters((f) => ({ ...f, location: v }))} placeholder={t("jobs.search.eGLagos")} /></Field>
            <Field label={t("jobs.search.paysAtLeastMonthly")}>
              <TextBox keyboardType="number-pad" value={filters.salary_min ?? ""} onChangeText={(v) => setFilters((f) => ({ ...f, salary_min: v.replace(/\D/g, "") }))} placeholder={t("jobs.search.salaryPlaceholder", "e.g. 300000")} />
            </Field>
            <Field label={t("jobs.search.posted")}>
              <ChipGroup options={[{ value: "1", label: t("jobs.search.n24Hours") }, { value: "7", label: t("jobs.search.n7Days") }, { value: "30", label: t("jobs.search.n30Days") }]}
                         value={filters.posted_within} onToggle={(v) => setFilters((f) => ({ ...f, posted_within: f.posted_within === v ? "" : v }))} />
            </Field>
            <Field label={t("jobs.search.sortBy")}><ChipGroup options={SORTS.map((s) => ({ ...s, label: t(s.label) }))} value={ordering} onToggle={setOrdering} /></Field>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <PillButton label={t("jobs.search.clear")} tone="outline" onPress={() => { setFilters({}); setOrdering("relevance"); }} style={{ flex: 1 }} />
              <PillButton label={t("jobs.search.showJobs", { count, n: count.toLocaleString() })} onPress={() => setSheet(false)} style={{ flex: 2 }} />
            </View>
          </ScrollView>
        </View>
      </Modal>
    </JobsScreen>
  );
}
