import { useState } from "react";
import { View, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Search, Lock, UsersRound } from "lucide-react-native";
import { Text } from "@/shared/ui";
import { colors, fonts } from "@/shared/theme";
import { useDebounced } from "@/shared/hooks/use-debounced";
import { jobsApi } from "@/features/jobs";
import { JobsScreen, Loading, Card, EmptyState, PillButton, Avatar, TextBox } from "@/features/jobs/ui/kit";
import { UpgradeSheet } from "@/features/jobs/ui/UpgradeSheet";
import { useTranslation } from "react-i18next";

/** Candidate database search (Premium / Pro). */
export default function CandidateSearch() {
  const { t } = useTranslation();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [skills, setSkills] = useState("");
  const [upgrade, setUpgrade] = useState<string | null>(null);
  const dq = useDebounced(`${q}|${skills}`, 400);
  const usage = useQuery({ queryKey: ["jobs", "subscription"], queryFn: jobsApi.subscription });
  const allowed = usage.data?.plan.candidate_search;
  const params: Record<string, string> = { open_to_work: "1" };
  if (q.trim()) params.q = q.trim();
  if (skills.trim()) params.skills = skills.trim();
  const results = useQuery({ queryKey: ["jobs", "candidate-search", dq], queryFn: () => jobsApi.searchCandidates(params), enabled: Boolean(allowed) });

  return (
    <JobsScreen title={t("jobs.candidates.candidates")} subtitle={t("jobs.candidates.findPeopleWhoHavenT")} side="employer">
      {usage.isLoading ? <Loading /> : !allowed ? (
        <EmptyState icon={<Lock size={20} color={colors.muted} />} title={t("jobs.candidates.searchCandidatesOnPremiumOr")}
                    body={t("jobs.candidates.searchOpenToWorkCandidates")}
                    action={<PillButton label={t("jobs.candidates.seePlans")} onPress={() => setUpgrade("upgrade_required")} />} />
      ) : (
        <>
          {usage.data?.candidate_views_per_month != null ? (
            <Text variant="caption" color="muted">{t("jobs.candidates.profileViewsUsed", { used: usage.data.candidate_views_used, limit: usage.data.candidate_views_per_month })}</Text>
          ) : null}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, height: 46, borderRadius: 12, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.mist, paddingHorizontal: 12 }}>
            <Search size={17} color={colors.muted} />
            <TextInput value={q} onChangeText={setQ} placeholder={t("jobs.candidates.keywords")} placeholderTextColor={colors.muted} style={{ flex: 1, fontFamily: fonts.regular, fontSize: 15, color: colors.ink }} />
          </View>
          <TextBox value={skills} onChangeText={setSkills} placeholder={t("jobs.candidates.skillsCommaSeparated")} />
          {results.isLoading ? <Loading /> : (results.data?.results.length ?? 0) === 0 ? (
            <EmptyState icon={<UsersRound size={20} color={colors.muted} />} title={t("jobs.candidates.noCandidatesMatch")} body={t("jobs.candidates.tryFewerSkillsOrA")} />
          ) : results.data!.results.map((c) => (
            <Card key={c.id} onPress={() => router.push({ pathname: "/jobs-candidate", params: { id: c.id } } as never)} style={{ flexDirection: "row", gap: 12 }}>
              <Avatar name={c.display_name} url={c.photo_url} />
              <View style={{ flex: 1 }}>
                <Text variant="label" numberOfLines={1}>{c.display_name}</Text>
                <Text variant="caption" color="muted" numberOfLines={1}>{c.headline || "—"}</Text>
                <Text variant="caption" color="muted">{[[c.location, c.country].filter(Boolean).join(", "), `${c.years_experience} yrs`].filter(Boolean).join(" · ")}</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                  {c.skills.slice(0, 4).map((s) => <View key={s} style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, backgroundColor: colors.mist }}><Text variant="caption" style={{ fontSize: 11.5 }}>{s}</Text></View>)}
                </View>
              </View>
            </Card>
          ))}
        </>
      )}
      <UpgradeSheet reason={upgrade} onClose={() => setUpgrade(null)} />
    </JobsScreen>
  );
}
