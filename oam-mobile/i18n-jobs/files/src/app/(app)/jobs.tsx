import { useState } from "react";
import { View, Pressable, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Search, Briefcase, Users, Sparkles, FileText, ChevronRight } from "lucide-react-native";
import { Text } from "@/shared/ui";
import { colors, fonts } from "@/shared/theme";
import { jobsApi } from "@/features/jobs";
import { JobsScreen, Loading, Card } from "@/features/jobs/ui/kit";
import { JobCard } from "@/features/jobs/ui/JobCard";
import { useTranslation } from "react-i18next";

/** Jobs hub: search, the two paths (find work / hire), and picks for you. */
export default function JobsHub() {
  const { t } = useTranslation();
  const router = useRouter();
  const [q, setQ] = useState("");
  const me = useQuery({ queryKey: ["jobs", "candidate"], queryFn: jobsApi.me });
  const rec = useQuery({ queryKey: ["jobs", "recommended"], queryFn: () => jobsApi.recommended(6) });

  const search = () => router.push({ pathname: "/jobs-search", params: q.trim() ? { q: q.trim() } : {} } as never);

  return (
    <JobsScreen title={t("jobs.hub.jobs")} subtitle={t("jobs.hub.findWorkYouLlLove")}>
      <View style={{ borderRadius: 18, backgroundColor: "#0a0a0a", padding: 16, gap: 10, overflow: "hidden" }}>
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, flexDirection: "row" }}>
          <View style={{ flex: 1, backgroundColor: colors.brand.black }} />
          <View style={{ flex: 1, backgroundColor: colors.brand.red }} />
          <View style={{ flex: 1, backgroundColor: colors.brand.green }} />
        </View>
        <Text variant="caption" style={{ color: "rgba(255,255,255,0.6)", marginTop: 4 }}>{t("jobs.hub.oamJobs")}</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 8, height: 46, borderRadius: 12, backgroundColor: colors.paper, paddingHorizontal: 12 }}>
            <Search size={17} color={colors.muted} />
            <TextInput value={q} onChangeText={setQ} onSubmitEditing={search} returnKeyType="search" placeholder={t("jobs.hub.jobTitleSkillOrCompany")}
                       placeholderTextColor={colors.muted} style={{ flex: 1, fontFamily: fonts.regular, fontSize: 15, color: colors.ink }} />
          </View>
          <Pressable onPress={search} style={{ height: 46, paddingHorizontal: 16, borderRadius: 12, backgroundColor: colors.brand.green, justifyContent: "center" }}>
            <Text variant="label" color="paper">{t("jobs.hub.search")}</Text>
          </Pressable>
        </View>
      </View>

      <View style={{ flexDirection: "row", gap: 12 }}>
        <PathCard icon={<Briefcase size={19} color={colors.brand.green} />} title={t("jobs.hub.findAJob")} body={t("jobs.hub.search1TapApplyAnd")} onPress={() => router.push("/jobs-search" as never)} />
        <PathCard icon={<Users size={19} color={colors.brand.green} />} title={t("jobs.hub.iMHiring")} body={t("jobs.hub.postJobsAndManageCandidates")} onPress={() => router.push("/jobs-employer" as never)} />
      </View>

      {me.data && me.data.completeness < 70 ? (
        <Card onPress={() => router.push("/jobs-profile" as never)} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ height: 40, width: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(11,115,39,0.10)" }}>
            <FileText size={18} color={colors.brand.green} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="label">{t("jobs.hub.yourCvIsCompletenessComplete", { completeness: me.data.completeness })}</Text>
            <Text variant="caption" color="muted">{t("jobs.hub.completeItForBetterMatches")}</Text>
          </View>
          <ChevronRight size={18} color={colors.muted} />
        </Card>
      ) : null}

      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Sparkles size={16} color={colors.brand.green} />
          <Text variant="title">{t("jobs.hub.recommendedForYou")}</Text>
        </View>
        <Pressable onPress={() => router.push("/jobs-search" as never)} hitSlop={6}><Text variant="caption" color="green">{t("jobs.hub.seeAll")}</Text></Pressable>
      </View>
      {rec.isLoading ? <Loading /> : (rec.data?.results.length ?? 0) === 0 ? (
        <Card><Text variant="caption" color="muted">{t("jobs.hub.addSkillsToYourCv")}</Text></Card>
      ) : rec.data!.results.map((j) => <JobCard key={j.id} job={j} showMatch />)}
    </JobsScreen>
  );
}

function PathCard({ icon, title, body, onPress }: { icon: React.ReactNode; title: string; body: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ flex: 1, borderRadius: 16, borderWidth: 1, borderColor: "rgba(11,115,39,0.18)", backgroundColor: "rgba(11,115,39,0.06)", padding: 14 }}>
      <View style={{ height: 38, width: 38, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(11,115,39,0.12)" }}>{icon}</View>
      <Text variant="label" style={{ marginTop: 10 }}>{title}</Text>
      <Text variant="caption" color="muted" style={{ marginTop: 2, lineHeight: 17 }}>{body}</Text>
    </Pressable>
  );
}
