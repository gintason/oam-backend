import { useState } from "react";
import { View, Pressable, Alert, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, MessageSquare, ChevronDown, CalendarClock } from "lucide-react-native";
import { Text } from "@/shared/ui";
import { colors } from "@/shared/theme";
import { apiErrorMessage } from "@/shared/api";
import { jobsApi, useJobsSocket, timeAgo, STATUS_LABEL, type ApplicationStatus, type CandidateApplication } from "@/features/jobs";
import { JobsScreen, Loading, EmptyState, StatusPill, CompanyLogo, Chip, PillButton, ErrorNote, Card } from "@/features/jobs/ui/kit";
import { useTranslation } from "react-i18next";

const STEPS: ApplicationStatus[] = ["applied", "under_review", "shortlisted", "interview", "offer", "hired"];
const FILTERS = [
  { key: "all", label: "jobs.applications.filter.all", statuses: undefined },
  { key: "active", label: "jobs.applications.filter.inProgress", statuses: "applied,under_review,shortlisted,interview,offer" },
  { key: "hired", label: "jobs.applications.filter.hired", statuses: "hired" },
  { key: "closed", label: "jobs.applications.filter.closed", statuses: "rejected,withdrawn" },
] as const;

export default function MyApplications() {
  const { t: tr } = useTranslation();
  const router = useRouter();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("all");
  const statuses = FILTERS.find((f) => f.key === filter)?.statuses;
  const apps = useQuery({ queryKey: ["jobs", "applications", filter], queryFn: () => jobsApi.myApplications(statuses) });
  useJobsSocket((e) => { if (e.type === "application.updated") qc.invalidateQueries({ queryKey: ["jobs", "applications"] }); });

  return (
    <JobsScreen title={tr("jobs.applications.myApplications")} side="seeker">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {FILTERS.map((f) => <Chip key={f.key} label={tr(f.label)} active={filter === f.key} onPress={() => setFilter(f.key)} />)}
      </ScrollView>
      {apps.isLoading ? <Loading /> : (apps.data?.results.length ?? 0) === 0 ? (
        <EmptyState icon={<ClipboardList size={20} color={colors.muted} />} title={tr("jobs.applications.noApplicationsHere")}
                    body={tr("jobs.applications.whenYouApplyYouLl")}
                    action={<PillButton label={tr("jobs.applications.findJobs")} onPress={() => router.push("/jobs-search" as never)} />} />
      ) : apps.data!.results.map((a) => <Row key={a.id} app={a} />)}
    </JobsScreen>
  );
}

function Row({ app }: { app: CandidateApplication }) {
  const { t: tr } = useTranslation();
  const router = useRouter();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const closed = app.status === "rejected" || app.status === "withdrawn";
  const step = STEPS.indexOf(app.status);
  const withdraw = useMutation({
    mutationFn: () => jobsApi.withdraw(app.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["jobs"] }),
    onError: (err) => setError(apiErrorMessage(err, tr("jobs.applications.couldnTWithdraw"))),
  });
  const chat = useMutation({
    mutationFn: () => jobsApi.threadForApplication(app.id),
    onSuccess: (t) => router.push({ pathname: "/jobs-chat", params: { id: t.id } } as never),
    onError: (err) => setError(apiErrorMessage(err, tr("jobs.applications.couldnTOpenTheChat"))),
  });

  return (
    <Card>
      <Pressable onPress={() => router.push({ pathname: "/job", params: { id: app.job.id } } as never)} style={{ flexDirection: "row", gap: 12 }}>
        <CompanyLogo url={app.job.employer.logo_url} name={app.job.employer.company_name} size={42} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="title" numberOfLines={2}>{app.job.title}</Text>
          <Text variant="caption" color="muted">{app.job.employer.company_name}{" "}{tr("jobs.applications.applied")}{" "}{timeAgo(app.created_at)}</Text>
          <View style={{ marginTop: 4 }}><StatusPill status={app.status} /></View>
        </View>
      </Pressable>
      {!closed ? (
        <>
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 14 }} accessibilityLabel={tr("jobs.applications.stepOfStatus", { step: step + 1, total: STEPS.length, status: STATUS_LABEL[app.status] })}>
            {STEPS.map((s, i) => (
              <View key={s} style={{ flex: i < STEPS.length - 1 ? 1 : 0, flexDirection: "row", alignItems: "center" }}>
                <View style={{ height: 10, width: 10, borderRadius: 5, backgroundColor: i <= step ? colors.brand.green : colors.hairline }} />
                {i < STEPS.length - 1 ? <View style={{ flex: 1, height: 2, backgroundColor: i < step ? colors.brand.green : colors.hairline }} /> : null}
              </View>
            ))}
          </View>
          <Text variant="caption" color="muted" style={{ marginTop: 6 }}>{tr("jobs.applications.stepOf", { step: step + 1, total: STEPS.length })}{" "}<Text variant="caption">{STATUS_LABEL[app.status]}</Text></Text>
        </>
      ) : null}
      {app.interview_at && app.status === "interview" ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10, padding: 8, borderRadius: 10, backgroundColor: "rgba(11,115,39,0.08)" }}>
          <CalendarClock size={14} color={colors.brand.green} />
          <Text variant="caption" color="green">{tr("jobs.applications.interview")}{" "}{new Date(app.interview_at).toLocaleString()}</Text>
        </View>
      ) : null}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
        <PillButton label={app.thread_id ? tr("jobs.applications.openChat") : tr("jobs.applications.messageEmployer")} tone="outline" icon={<MessageSquare size={14} color={colors.ink} />}
                    onPress={() => chat.mutate()} loading={chat.isPending} style={{ height: 36 }} />
        <PillButton label={tr("jobs.applications.timeline")} tone="outline" icon={<ChevronDown size={14} color={colors.ink} />} onPress={() => setOpen((o) => !o)} style={{ height: 36 }} />
        {!closed && app.status !== "hired" ? (
          <PillButton label={tr("jobs.applications.withdraw")} tone="outline" loading={withdraw.isPending} style={{ height: 36 }}
                      onPress={() => Alert.alert(tr("jobs.applications.withdrawApplication"), tr("jobs.applications.theEmployerWillSeeThat"), [
                        { text: tr("jobs.applications.cancel"), style: "cancel" }, { text: tr("jobs.applications.withdraw"), style: "destructive", onPress: () => withdraw.mutate() }])} />
        ) : null}
      </View>
      <ErrorNote>{error}</ErrorNote>
      {open ? (
        <View style={{ marginTop: 12, gap: 8, borderLeftWidth: 1, borderLeftColor: colors.hairline, paddingLeft: 12 }}>
          {app.events.map((e, i) => (
            <Text key={i} variant="caption"><Text variant="label" style={{ fontSize: 13 }}>{STATUS_LABEL[e.to_status]}</Text>  ·  {new Date(e.created_at).toLocaleString()}</Text>
          ))}
        </View>
      ) : null}
    </Card>
  );
}
