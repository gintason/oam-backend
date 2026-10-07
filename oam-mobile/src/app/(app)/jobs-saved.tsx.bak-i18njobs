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

export default function SavedAndAlerts() {
  const router = useRouter();
  const [tab, setTab] = useState<"jobs" | "alerts">("jobs");
  const saved = useQuery({ queryKey: ["jobs", "saved"], queryFn: () => jobsApi.savedJobs() });
  const searches = useQuery({ queryKey: ["jobs", "saved-searches"], queryFn: jobsApi.savedSearches });

  return (
    <JobsScreen title="Saved & alerts" side="seeker">
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Chip label={`Saved jobs${saved.data ? ` (${saved.data.count})` : ""}`} active={tab === "jobs"} onPress={() => setTab("jobs")} />
        <Chip label={`Job alerts${searches.data ? ` (${searches.data.count})` : ""}`} active={tab === "alerts"} onPress={() => setTab("alerts")} />
      </View>
      {tab === "jobs" ? (
        saved.isLoading ? <Loading /> : (saved.data?.results.length ?? 0) === 0 ? (
          <EmptyState icon={<Bookmark size={20} color={colors.muted} />} title="No saved jobs" body="Tap the bookmark on any job to keep it here."
                      action={<PillButton label="Browse jobs" onPress={() => router.push("/jobs-search" as never)} />} />
        ) : saved.data!.results.map((j) => <JobCard key={j.id} job={j} />)
      ) : searches.isLoading ? <Loading /> : (searches.data?.results.length ?? 0) === 0 ? (
        <EmptyState icon={<BellRing size={20} color={colors.muted} />} title="No job alerts yet"
                    body='Run a search and tap "Get alerts" — we’ll notify you when new jobs match.'
                    action={<PillButton label="Search jobs" onPress={() => router.push("/jobs-search" as never)} />} />
      ) : searches.data!.results.map((s) => <AlertRow key={s.id} s={s} />)}
    </JobsScreen>
  );
}

function AlertRow({ s }: { s: SavedSearch }) {
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
          <Text variant="caption" color="muted">{summary || "All jobs"}</Text>
        </View>
        <Pressable onPress={() => router.push({ pathname: "/jobs-search", params: s.query ? { q: s.query } : {} } as never)} hitSlop={8} style={{ padding: 4 }} accessibilityLabel="Run search">
          <Search size={18} color={colors.ink} />
        </Pressable>
        <Pressable onPress={() => Alert.alert("Delete this alert?", undefined, [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: () => remove.mutate() }])}
                   hitSlop={8} style={{ padding: 4 }} accessibilityLabel="Delete alert">
          <Trash2 size={18} color={colors.muted} />
        </Pressable>
      </View>
      <View style={{ marginTop: 10, borderTopWidth: 1, borderTopColor: colors.hairline, paddingTop: 8, gap: 8 }}>
        <ToggleRow label="Send me alerts" value={s.alert_enabled} onChange={(v) => update.mutate({ alert_enabled: v })} />
        {s.alert_enabled ? (
          <ChipGroup<AlertFrequency>
            options={[{ value: "instant", label: "Instantly" }, { value: "daily", label: "Daily" }, { value: "weekly", label: "Weekly" }]}
            value={s.frequency} onToggle={(v) => update.mutate({ frequency: v })} />
        ) : null}
        <ToggleRow label="Also email me" value={s.notify_email} onChange={(v) => update.mutate({ notify_email: v })} />
      </View>
    </Card>
  );
}
