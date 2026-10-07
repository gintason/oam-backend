import { useState } from "react";
import { View, Pressable, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bookmark, BellRing, Trash2, Search } from "lucide-react-native";
import { Text } from "@/shared/ui";
import { colors } from "@/shared/theme";
import { jobsApi, type AlertFrequency, type SavedSearch } from "@/features/jobs";
import { JobsScreen, Loading, EmptyState, Chip, ChipGroup, ToggleRow, PillButton, Card } from "@/features/jobs/ui/kit";
import { JobCard } from "@/features/jobs/ui/JobCard";
import { useTranslation } from "react-i18next";

export default function SavedAndAlerts() {
  const { t } = useTranslation();
  const router = useRouter();
  const [tab, setTab] = useState<"jobs" | "alerts">("jobs");
  const saved = useQuery({ queryKey: ["jobs", "saved"], queryFn: () => jobsApi.savedJobs() });
  const searches = useQuery({ queryKey: ["jobs", "saved-searches"], queryFn: jobsApi.savedSearches });

  return (
    <JobsScreen title={t("jobs.saved.savedAlerts")} side="seeker">
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Chip label={`${t("jobs.saved.savedJobs")}${saved.data ? ` (${saved.data.count})` : ""}`} active={tab === "jobs"} onPress={() => setTab("jobs")} />
        <Chip label={`${t("jobs.saved.jobAlerts")}${searches.data ? ` (${searches.data.count})` : ""}`} active={tab === "alerts"} onPress={() => setTab("alerts")} />
      </View>
      {tab === "jobs" ? (
        saved.isLoading ? <Loading /> : (saved.data?.results.length ?? 0) === 0 ? (
          <EmptyState icon={<Bookmark size={20} color={colors.muted} />} title={t("jobs.saved.noSavedJobs")} body={t("jobs.saved.tapTheBookmarkOnAny")}
                      action={<PillButton label={t("jobs.saved.browseJobs")} onPress={() => router.push("/jobs-search" as never)} />} />
        ) : saved.data!.results.map((j) => <JobCard key={j.id} job={j} />)
      ) : searches.isLoading ? <Loading /> : (searches.data?.results.length ?? 0) === 0 ? (
        <EmptyState icon={<BellRing size={20} color={colors.muted} />} title={t("jobs.saved.noJobAlertsYet")}
                    body={t("jobs.saved.runASearchAndTap")}
                    action={<PillButton label={t("jobs.saved.searchJobs")} onPress={() => router.push("/jobs-search" as never)} />} />
      ) : searches.data!.results.map((s) => <AlertRow key={s.id} s={s} />)}
    </JobsScreen>
  );
}

function AlertRow({ s }: { s: SavedSearch }) {
  const { t } = useTranslation();
  const router = useRouter();
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: ["jobs", "saved-searches"] });
  const update = useMutation({ mutationFn: (p: Partial<SavedSearch>) => jobsApi.updateSavedSearch(s.id, p), onSuccess: refresh });
  const remove = useMutation({ mutationFn: () => jobsApi.deleteSavedSearch(s.id), onSuccess: refresh });
  const summary = [s.query && `“${s.query}”`, ...(s.filters.location_type ?? []), ...(s.filters.employment_type ?? []), s.filters.location].filter(Boolean).join(" · ");
  return (
    <Card>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Text variant="title">{s.name}</Text>
          <Text variant="caption" color="muted">{summary || t("jobs.saved.allJobs")}</Text>
        </View>
        <Pressable onPress={() => router.push({ pathname: "/jobs-search", params: s.query ? { q: s.query } : {} } as never)} hitSlop={8} style={{ padding: 4 }} accessibilityLabel={t("jobs.saved.runSearch")}>
          <Search size={18} color={colors.ink} />
        </Pressable>
        <Pressable onPress={() => Alert.alert(t("jobs.saved.deleteThisAlert"), undefined, [{ text: t("jobs.saved.cancel"), style: "cancel" }, { text: t("jobs.saved.delete"), style: "destructive", onPress: () => remove.mutate() }])}
                   hitSlop={8} style={{ padding: 4 }} accessibilityLabel={t("jobs.saved.deleteAlert")}>
          <Trash2 size={18} color={colors.muted} />
        </Pressable>
      </View>
      <View style={{ marginTop: 10, borderTopWidth: 1, borderTopColor: colors.hairline, paddingTop: 8, gap: 8 }}>
        <ToggleRow label={t("jobs.saved.sendMeAlerts")} value={s.alert_enabled} onChange={(v) => update.mutate({ alert_enabled: v })} />
        {s.alert_enabled ? (
          <ChipGroup<AlertFrequency>
            options={[{ value: "instant", label: t("jobs.saved.instantly") }, { value: "daily", label: t("jobs.saved.daily") }, { value: "weekly", label: t("jobs.saved.weekly") }]}
            value={s.frequency} onToggle={(v) => update.mutate({ frequency: v })} />
        ) : null}
        <ToggleRow label={t("jobs.saved.alsoEmailMe")} value={s.notify_email} onChange={(v) => update.mutate({ notify_email: v })} />
      </View>
    </Card>
  );
}
