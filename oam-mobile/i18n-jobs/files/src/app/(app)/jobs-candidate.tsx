import { useState } from "react";
import { View, Linking } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { FileText, Mail, Phone, MessageSquare } from "lucide-react-native";
import { Text } from "@/shared/ui";
import { colors } from "@/shared/theme";
import { apiErrorMessage } from "@/shared/api";
import { jobsApi, jobsErrorCode, UPGRADE_CODES } from "@/features/jobs";
import { JobsScreen, Loading, Card, Avatar, PillButton, ErrorNote } from "@/features/jobs/ui/kit";
import { UpgradeSheet } from "@/features/jobs/ui/UpgradeSheet";
import { useTranslation } from "react-i18next";

/** A candidate's full profile (counts against the monthly view quota). */
export default function CandidateView() {
  const { t: tr } = useTranslation();
  const { id = "", job } = useLocalSearchParams<{ id: string; job?: string }>();
  const router = useRouter();
  const [upgrade, setUpgrade] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const c = useQuery({ queryKey: ["jobs", "candidate-view", id], queryFn: () => jobsApi.candidate(id), retry: false, enabled: Boolean(id) });
  const viewCode = c.error ? jobsErrorCode(c.error) : undefined;
  const blockedBy = viewCode && UPGRADE_CODES.has(viewCode) && !dismissed ? viewCode : null;

  const message = useMutation({
    mutationFn: () => jobsApi.directThread(id, undefined, job || undefined),
    onSuccess: (t) => router.push({ pathname: "/jobs-chat", params: { id: t.id } } as never),
    onError: (err) => {
      const code = jobsErrorCode(err);
      if (code && UPGRADE_CODES.has(code)) setUpgrade(code);
      else setError(apiErrorMessage(err, tr("jobs.candidate.couldnTStartAConversation")));
    },
  });

  const d = c.data;
  return (
    <JobsScreen title={tr("jobs.candidate.candidate")} side="employer">
      {c.isLoading ? <Loading /> : !d ? <ErrorNote>{apiErrorMessage(c.error, tr("jobs.candidate.thisProfileIsnTAvailable"))}</ErrorNote> : (
        <>
          <Card style={{ gap: 12 }}>
            <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
              <Avatar name={d.display_name} url={d.photo_url} size={56} />
              <View style={{ flex: 1 }}>
                <Text variant="heading" style={{ fontSize: 19 }}>{d.display_name}</Text>
                <Text variant="caption" color="muted">{d.headline}</Text>
                <Text variant="caption" color="muted">{[[d.location, d.country].filter(Boolean).join(", "), `${d.years_experience} years experience`].filter(Boolean).join(" · ")}</Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              <PillButton label={tr("jobs.candidate.message")} icon={<MessageSquare size={14} color="#FFF" />} onPress={() => message.mutate()} loading={message.isPending} style={{ height: 36 }} />
              {d.cv_url ? <PillButton label={tr("jobs.candidate.cv")} tone="outline" icon={<FileText size={14} color={colors.ink} />} onPress={() => Linking.openURL(d.cv_url)} style={{ height: 36 }} /> : null}
              {d.email ? <PillButton label={tr("jobs.candidate.email")} tone="outline" icon={<Mail size={14} color={colors.ink} />} onPress={() => Linking.openURL(`mailto:${d.email}`)} style={{ height: 36 }} /> : null}
              {d.phone ? <PillButton label={tr("jobs.candidate.call")} tone="outline" icon={<Phone size={14} color={colors.ink} />} onPress={() => Linking.openURL(`tel:${d.phone}`)} style={{ height: 36 }} /> : null}
            </View>
            <ErrorNote>{error}</ErrorNote>
          </Card>
          {d.summary ? <Card><Text variant="title">{tr("jobs.candidate.summary")}</Text><Text variant="body" style={{ marginTop: 6, lineHeight: 21 }}>{d.summary}</Text></Card> : null}
          {d.skills.length ? (
            <Card><Text variant="title">{tr("jobs.candidate.skills")}</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 }}>{d.skills.map((s) => <View key={s} style={{ paddingHorizontal: 9, paddingVertical: 4, borderRadius: 7, backgroundColor: colors.mist }}><Text variant="caption">{s}</Text></View>)}</View>
            </Card>
          ) : null}
          {d.experience.length ? (
            <Card style={{ gap: 10 }}><Text variant="title">{tr("jobs.candidate.experience")}</Text>
              {d.experience.map((x, i) => <View key={i}><Text variant="label">{x.title} · {x.company}</Text><Text variant="caption" color="muted">{[x.start, x.end].filter(Boolean).join(" – ")}</Text>{x.description ? <Text variant="caption" style={{ marginTop: 3 }}>{x.description}</Text> : null}</View>)}
            </Card>
          ) : null}
        </>
      )}
      <UpgradeSheet reason={upgrade ?? blockedBy} onClose={() => { setUpgrade(null); setDismissed(true); }} />
    </JobsScreen>
  );
}
