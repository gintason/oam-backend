import { useState } from "react";
import { View, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Bookmark, BookmarkCheck, MapPin, Briefcase, BadgeCheck, Sparkles } from "lucide-react-native";
import { Text } from "@/shared/ui";
import { colors, fonts } from "@/shared/theme";
import { jobsApi, formatSalary, timeAgo, LOCATION_LABEL, EMPLOYMENT_LABEL, type JobCardData } from "../api";
import { CompanyLogo, MatchBadge } from "./kit";

/** One job in a list. Tapping opens the detail screen; the bookmark saves it. */
export function JobCard({ job, showMatch = false }: { job: JobCardData; showMatch?: boolean }) {
  const router = useRouter();
  const qc = useQueryClient();
  const [saved, setSaved] = useState(Boolean(job.is_saved));
  const toggle = useMutation({
    mutationFn: () => (saved ? jobsApi.unsave(job.id) : jobsApi.save(job.id)),
    onMutate: () => setSaved((s) => !s),
    onError: () => setSaved((s) => !s),
    onSettled: () => qc.invalidateQueries({ queryKey: ["jobs"], predicate: (q) => q.queryKey.includes("saved") }),
  });
  const salary = formatSalary(job.salary);
  const place = [job.location, job.country].filter(Boolean).join(", ");

  return (
    <Pressable
      onPress={() => router.push({ pathname: "/job", params: { id: job.id } } as never)}
      style={{ borderRadius: 16, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper, padding: 14, flexDirection: "row", gap: 12 }}
    >
      <CompanyLogo url={job.employer.logo_url} name={job.employer.company_name} />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
          {job.is_promoted ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999, backgroundColor: "rgba(227,16,18,0.10)" }}>
              <Sparkles size={10} color={colors.brand.red} />
              <Text variant="caption" color="red" style={{ fontSize: 10, fontFamily: fonts.bold }}>FEATURED</Text>
            </View>
          ) : null}
          {job.has_applied ? (
            <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999, backgroundColor: "rgba(11,115,39,0.10)" }}>
              <Text variant="caption" color="green" style={{ fontSize: 10, fontFamily: fonts.bold }}>APPLIED</Text>
            </View>
          ) : null}
        </View>
        <Text variant="title" numberOfLines={2} style={{ paddingRight: 26 }}>{job.title}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 1 }}>
          <Text variant="caption" color="muted" numberOfLines={1}>{job.employer.company_name}</Text>
          {job.employer.is_verified ? <BadgeCheck size={13} color={colors.brand.green} /> : null}
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
            <MapPin size={12} color={colors.muted} />
            <Text variant="caption" color="muted">{LOCATION_LABEL[job.location_type]}{place ? ` · ${place}` : ""}</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
            <Briefcase size={12} color={colors.muted} />
            <Text variant="caption" color="muted">{EMPLOYMENT_LABEL[job.employment_type]}</Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10, gap: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 1 }}>
            {salary ? <Text variant="label" style={{ fontFamily: fonts.bold }}>{salary}</Text> : null}
            {showMatch && job.match ? <MatchBadge score={job.match.score} compact /> : null}
          </View>
          <Text variant="caption" color="muted">{timeAgo(job.published_at)}</Text>
        </View>
      </View>
      {job.is_saved !== null ? (
        <Pressable onPress={() => toggle.mutate()} hitSlop={10} style={{ position: "absolute", right: 12, top: 12 }}
                   accessibilityLabel={saved ? "Remove from saved jobs" : "Save job"}>
          {saved ? <BookmarkCheck size={20} color={colors.brand.green} /> : <Bookmark size={20} color={colors.muted} />}
        </Pressable>
      ) : null}
    </Pressable>
  );
}
