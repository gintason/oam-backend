import { View, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MessagesSquare } from "lucide-react-native";
import { Text } from "@/shared/ui";
import { colors, fonts } from "@/shared/theme";
import { jobsApi, useJobsSocket, timeAgo } from "@/features/jobs";
import { JobsScreen, Loading, EmptyState, Avatar, CompanyLogo, StatusPill } from "@/features/jobs/ui/kit";

/** Every recruitment conversation, updating live. */
export default function JobsMessages() {
  const router = useRouter();
  const qc = useQueryClient();
  const threads = useQuery({ queryKey: ["jobs", "threads"], queryFn: jobsApi.threads });
  useJobsSocket((e) => { if (e.type === "chat.message" || e.type === "chat.read") qc.invalidateQueries({ queryKey: ["jobs", "threads"] }); });
  const list = threads.data?.results ?? [];

  return (
    <JobsScreen title="Job messages" subtitle="Chats about applications and candidates.">
      {threads.isLoading ? <Loading /> : list.length === 0 ? (
        <EmptyState icon={<MessagesSquare size={20} color={colors.muted} />} title="No conversations yet" body="Chats with employers and candidates appear here." />
      ) : list.map((t) => {
        const employerSide = t.my_side === "employer";
        const name = employerSide ? t.candidate.display_name : t.employer.company_name;
        return (
          <Pressable key={t.id} onPress={() => router.push({ pathname: "/jobs-chat", params: { id: t.id } } as never)}
                     style={{ flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper, padding: 12 }}>
            {employerSide ? <Avatar name={name} url={t.candidate.photo_url} size={44} /> : <CompanyLogo url={t.employer.logo_url} name={name} size={44} />}
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                <Text variant="label" numberOfLines={1} style={{ flex: 1, fontFamily: t.unread ? fonts.bold : fonts.medium }}>{name}</Text>
                <Text variant="caption" color="muted" style={{ fontSize: 11 }}>{timeAgo(t.last_message_at)}</Text>
              </View>
              <Text variant="caption" color="muted" numberOfLines={1}>{t.job ? `${t.job.title} · ` : ""}{t.last_message_preview || "No messages yet"}</Text>
              {t.application_status ? <View style={{ marginTop: 4 }}><StatusPill status={t.application_status} /></View> : null}
            </View>
            {t.unread > 0 ? (
              <View style={{ minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5, backgroundColor: colors.brand.green, alignItems: "center", justifyContent: "center" }}>
                <Text variant="caption" color="paper" style={{ fontSize: 11, fontFamily: fonts.bold }}>{t.unread}</Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </JobsScreen>
  );
}
