import { useMemo, useState } from "react";
import { View, Pressable, TextInput, FlatList, Modal, ScrollView, ActivityIndicator } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useInfiniteQuery, useMutation, useQuery } from "@tanstack/react-query";
import { Search, SlidersHorizontal, BellPlus, Check, SearchX, X } from "lucide-react-native";
import { Text } from "@/shared/ui";
import { colors, fonts } from "@/shared/theme";
import { apiErrorMessage } from "@/shared/api";
import { useDebounced } from "@/shared/hooks/use-debounced";
import { jobsApi, toParams, type SearchFilters } from "@/features/jobs";
import { JobsScreen, ChipGroup, Chip, EmptyState, ErrorNote, Field, TextBox, PillButton } from "@/features/jobs/ui/kit";
import { JobCard } from "@/features/jobs/ui/JobCard";

const SORTS = [
  { value: "relevance", label: "Most relevant" }, { value: "newest", label: "Newest" },
  { value: "salary", label: "Highest pay" }, { value: "closing", label: "Closing soon" },
];

export default function JobSearch() {
  const params = useLocalSearchParams<{ q?: string }>();
  const [q, setQ] = useState(params.q ?? "");
  const [filters, setFilters] = useState<SearchFilters>({});
  const [ordering, setOrdering] = useState("relevance");
  const [sheet, setSheet] = useState(false);
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dq = useDebounced(q, 400);
  const meta = useQuery({ queryKey: ["jobs-meta"], queryFn: jobsApi.meta, staleTime: 3600_000 });
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
      name: dq.trim() || [...(filters.location_type ?? []), filters.location ?? ""].filter(Boolean).join(" · ") || "My job search",
      query: dq.trim(), filters, frequency: "daily", alert_enabled: true, notify_push: true,
    }),
    onSuccess: () => setSavedKey(key),
    onError: (err) => setError(apiErrorMessage(err, "Couldn't save this search.")),
  });

  const toggle = (k: "location_type" | "employment_type" | "experience_level" | "category", v: string) =>
    setFilters((f) => { const cur = f[k] ?? []; return { ...f, [k]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] }; });
  const activeCount = Object.values(filters).filter((v) => (Array.isArray(v) ? v.length : v)).length;

  return (
    <JobsScreen title="Find jobs" side="seeker" scroll={false}>
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
                <TextInput value={q} onChangeText={setQ} returnKeyType="search" placeholder="Title, skill or company"
                           placeholderTextColor={colors.muted} style={{ flex: 1, fontFamily: fonts.regular, fontSize: 15, color: colors.ink }} />
              </View>
              <Pressable onPress={() => setSheet(true)} style={{ height: 46, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.hairline, flexDirection: "row", alignItems: "center", gap: 6 }}
                         accessibilityLabel="Filters">
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
              <Text variant="caption" color="muted">{results.isLoading ? "Searching…" : `${count.toLocaleString()} job${count === 1 ? "" : "s"}`}</Text>
              <Pressable onPress={() => saveAlert.mutate()} disabled={savedKey === key || saveAlert.isPending}
                         style={{ flexDirection: "row", alignItems: "center", gap: 5, height: 32, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1, borderColor: colors.hairline }}>
                {savedKey === key ? <Check size={14} color={colors.brand.green} /> : <BellPlus size={14} color={colors.ink} />}
                <Text variant="caption" color={savedKey === key ? "green" : "ink"}>{savedKey === key ? "Alert saved" : "Get alerts"}</Text>
              </Pressable>
            </View>
            <ErrorNote>{error}</ErrorNote>
          </View>
        }
        renderItem={({ item }) => <JobCard job={item} />}
        ListEmptyComponent={results.isLoading ? <ActivityIndicator color={colors.brand.green} style={{ marginTop: 30 }} /> : (
          <EmptyState icon={<SearchX size={20} color={colors.muted} />} title="No jobs match yet"
                      body="Try fewer filters, or tap “Get alerts” and we'll tell you when one is posted." />
        )}
        ListFooterComponent={results.isFetchingNextPage ? <ActivityIndicator color={colors.brand.green} /> : null}
      />

      <Modal visible={sheet} animationType="slide" transparent onRequestClose={() => setSheet(false)}>
        <Pressable onPress={() => setSheet(false)} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }} />
        <View style={{ maxHeight: "85%", backgroundColor: colors.paper, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingBottom: 24 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, paddingBottom: 6 }}>
            <Text variant="heading">Filters</Text>
            <Pressable onPress={() => setSheet(false)} hitSlop={10}><X size={22} color={colors.ink} /></Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
            <Field label="Job type"><ChipGroup options={c?.employment_types ?? []} value={filters.employment_type} onToggle={(v) => toggle("employment_type", v)} /></Field>
            <Field label="Experience"><ChipGroup options={c?.experience_levels ?? []} value={filters.experience_level} onToggle={(v) => toggle("experience_level", v)} /></Field>
            <Field label="Category"><ChipGroup options={c?.categories ?? []} value={filters.category} onToggle={(v) => toggle("category", v)} /></Field>
            <Field label="City"><TextBox value={filters.location ?? ""} onChangeText={(v) => setFilters((f) => ({ ...f, location: v }))} placeholder="e.g. Lagos" /></Field>
            <Field label="Pays at least (monthly, ₦)">
              <TextBox keyboardType="number-pad" value={filters.salary_min ?? ""} onChangeText={(v) => setFilters((f) => ({ ...f, salary_min: v.replace(/\D/g, "") }))} placeholder="e.g. 300000" />
            </Field>
            <Field label="Posted">
              <ChipGroup options={[{ value: "1", label: "24 hours" }, { value: "7", label: "7 days" }, { value: "30", label: "30 days" }]}
                         value={filters.posted_within} onToggle={(v) => setFilters((f) => ({ ...f, posted_within: f.posted_within === v ? "" : v }))} />
            </Field>
            <Field label="Sort by"><ChipGroup options={SORTS} value={ordering} onToggle={setOrdering} /></Field>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <PillButton label="Clear" tone="outline" onPress={() => { setFilters({}); setOrdering("relevance"); }} style={{ flex: 1 }} />
              <PillButton label={`Show ${count.toLocaleString()} jobs`} onPress={() => setSheet(false)} style={{ flex: 2 }} />
            </View>
          </ScrollView>
        </View>
      </Modal>
    </JobsScreen>
  );
}
