import { useState } from "react";
import { View, Pressable, ScrollView, Modal, Linking } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Lock, X, FileText, MessageSquare, Star, Mail, Phone, Sparkles, PartyPopper, Pencil } from "lucide-react-native";
import { Text } from "@/shared/ui";
import { colors, fonts } from "@/shared/theme";
import { apiErrorMessage } from "@/shared/api";
import {
  jobsApi, jobsErrorCode, useJobsSocket, timeAgo, UPGRADE_CODES, STATUS_LABEL,
  type ApplicationStatus, type EmployerApplication, type Pipeline, type CandidateFull, type ScreeningQuestion,
} from "@/features/jobs";
import { JobsScreen, Loading, Card, Chip, Avatar, MatchBadge, JobStatusPill, PillButton, ErrorNote, TextBox, EmptyState, useActionSheet } from "@/features/jobs/ui/kit";
import { UpgradeSheet } from "@/features/jobs/ui/UpgradeSheet";

type Tab = "pipeline" | "matches" | "analytics";

/** Applicants for one job: stage tabs, tap to review, "Move to" to change stage. */
export default function PipelineScreen() {
  const { id = "", published } = useLocalSearchParams<{ id: string; published?: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const key = ["jobs", "pipeline", id];
  const [tab, setTab] = useState<Tab>("pipeline");
  const [stage, setStage] = useState<ApplicationStatus>("applied");
  const [open, setOpen] = useState<string | null>(null);
  const [upgrade, setUpgrade] = useState<string | null>(null);
  const sheet = useActionSheet();
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState(published === "1");

  const job = useQuery({ queryKey: ["jobs", "owned", id], queryFn: () => jobsApi.ownedJob(id), enabled: Boolean(id) });
  const pipe = useQuery({ queryKey: key, queryFn: () => jobsApi.pipeline(id), enabled: Boolean(id) });
  useJobsSocket((e) => {
    if (e.type.startsWith("application.") && e.data.job_id === id) qc.invalidateQueries({ queryKey: key });
  });

  function fail(err: unknown) {
    const code = jobsErrorCode(err);
    if (code && UPGRADE_CODES.has(code)) setUpgrade(code);
    else setError(apiErrorMessage(err, "Couldn't move that applicant."));
  }

  const move = useMutation({
    mutationFn: ({ appId, status }: { appId: string; status: ApplicationStatus }) => jobsApi.moveApplication(appId, { status }),
    onMutate: async ({ appId, status }) => {
      setError(null);
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Pipeline>(key);
      if (prev) {
        let card: EmployerApplication | undefined;
        const cols = prev.columns.map((c) => {
          const f = c.results.find((a) => a.id === appId);
          if (f) card = { ...f, status };
          return { ...c, results: c.results.filter((a) => a.id !== appId) };
        }).map((c) => (c.status === status && card ? { ...c, results: [card, ...c.results] } : c)).map((c) => ({ ...c, count: c.results.length }));
        qc.setQueryData(key, { ...prev, columns: cols });
      }
      return { prev };
    },
    onError: (err, _v, ctx) => { if (ctx?.prev) qc.setQueryData(key, ctx.prev); fail(err); },
    onSettled: () => { qc.invalidateQueries({ queryKey: key }); qc.invalidateQueries({ queryKey: ["jobs", "application"] }); },
  });

  const cols = pipe.data?.columns ?? [];
  const current = cols.find((c) => c.status === stage);

  function moveMenu(app: EmployerApplication) {
    if (app.locked) { setUpgrade("upgrade_required"); return; }
    const targets = cols.map((c) => c.status).filter((s) => s !== app.status);
    const labels = targets.map((s) => STATUS_LABEL[s]);
    const title = `Move ${app.candidate.display_name} to…`;
    sheet.show(title, targets.map((s) => ({ label: STATUS_LABEL[s], run: () => move.mutate({ appId: app.id, status: s }) })));
  }

  const j = job.data;
  return (
    <JobsScreen title={j?.title ?? "Applicants"} subtitle={`${cols.reduce((n, c) => n + c.count, 0)} applicants${j ? ` · ${j.views_count} views` : ""}`} side="employer"
                right={<Pressable onPress={() => router.push({ pathname: "/jobs-post", params: { id } } as never)} hitSlop={8} accessibilityLabel="Edit job"
                                  style={{ height: 40, width: 40, borderRadius: 20, borderWidth: 1, borderColor: colors.hairline, alignItems: "center", justifyContent: "center" }}>
                         <Pencil size={17} color={colors.ink} /></Pressable>}>
      {banner ? (
        <View style={{ flexDirection: "row", gap: 10, alignItems: "center", borderRadius: 14, borderWidth: 1, borderColor: "rgba(11,115,39,0.25)", backgroundColor: "rgba(11,115,39,0.05)", padding: 12 }}>
          <PartyPopper size={20} color={colors.brand.green} />
          <Text variant="caption" style={{ flex: 1 }}><Text variant="label" style={{ fontSize: 13 }}>Your job is live.</Text> Candidates with matching alerts are being notified.</Text>
          <Pressable onPress={() => setBanner(false)} hitSlop={8}><X size={16} color={colors.muted} /></Pressable>
        </View>
      ) : null}
      {j ? <JobStatusPill status={j.status} /> : null}
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Chip label="Pipeline" active={tab === "pipeline"} onPress={() => setTab("pipeline")} />
        <Chip label="Smart matches" active={tab === "matches"} onPress={() => setTab("matches")} />
        <Chip label="Analytics" active={tab === "analytics"} onPress={() => setTab("analytics")} />
      </View>
      <ErrorNote>{error}</ErrorNote>

      {tab === "pipeline" ? (
        pipe.isLoading ? <Loading /> : (
          <>
            {(pipe.data?.locked_count ?? 0) > 0 ? (
              <Card style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Lock size={16} color={colors.muted} />
                <Text variant="caption" style={{ flex: 1 }}>{pipe.data!.locked_count} more applicants are hidden on the Free plan.</Text>
                <PillButton label="Unlock" onPress={() => setUpgrade("upgrade_required")} style={{ height: 34 }} />
              </Card>
            ) : null}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {cols.map((c) => <Chip key={c.status} label={`${c.label} · ${c.count}`} active={stage === c.status} onPress={() => setStage(c.status)} />)}
            </ScrollView>
            <Text variant="caption" color="muted">Tap an applicant to review · press and hold to move them</Text>
            {!current || current.results.length === 0 ? (
              <EmptyState icon={<Sparkles size={20} color={colors.muted} />} title={`No one in ${STATUS_LABEL[stage]}`} />
            ) : current.results.map((a) => (
              <Pressable key={a.id} onPress={() => (a.locked ? setUpgrade("upgrade_required") : setOpen(a.id))} onLongPress={() => moveMenu(a)} delayLongPress={300}
                         style={{ borderRadius: 14, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper, padding: 12, opacity: a.locked ? 0.7 : 1 }}>
                {a.locked ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><Lock size={14} color={colors.muted} /><Text variant="caption" color="muted">Upgrade to view this applicant</Text></View>
                ) : (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <Avatar name={a.candidate.display_name} url={"photo_url" in a.candidate ? a.candidate.photo_url : undefined} size={40} />
                    <View style={{ flex: 1 }}>
                      <Text variant="label" numberOfLines={1}>{a.candidate.display_name}</Text>
                      <Text variant="caption" color="muted" numberOfLines={1}>{"headline" in a.candidate ? a.candidate.headline : ""}</Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 5 }}>
                        <MatchBadge score={a.match_score} compact />
                        {!a.viewed_by_employer_at ? <Text variant="caption" color="red" style={{ fontFamily: fonts.bold, fontSize: 11 }}>NEW</Text> : null}
                        {a.employer_rating ? <Text variant="caption" style={{ color: colors.warn }}>★ {a.employer_rating}</Text> : null}
                        <Text variant="caption" color="muted" style={{ fontSize: 11 }}>{timeAgo(a.created_at)}</Text>
                      </View>
                    </View>
                    <Pressable onPress={() => moveMenu(a)} hitSlop={8} style={{ paddingHorizontal: 10, height: 32, borderRadius: 999, borderWidth: 1, borderColor: colors.hairline, justifyContent: "center" }}>
                      <Text variant="caption">Move</Text>
                    </Pressable>
                  </View>
                )}
              </Pressable>
            ))}
          </>
        )
      ) : tab === "matches" ? <Matches jobId={id} onUpgrade={setUpgrade} /> : <Stats jobId={id} />}

      <ApplicantModal appId={open} statuses={cols.map((c) => c.status)} questions={j?.screening_questions ?? []}
                      onClose={() => setOpen(null)} onMove={(s) => open && move.mutate({ appId: open, status: s })} onError={fail} />
      <UpgradeSheet reason={upgrade} onClose={() => setUpgrade(null)} />
      {sheet.sheet}
    </JobsScreen>
  );
}

function ApplicantModal({ appId, statuses, questions, onClose, onMove, onError }: {
  appId: string | null; statuses: ApplicationStatus[]; questions: ScreeningQuestion[];
  onClose: () => void; onMove: (s: ApplicationStatus) => void; onError: (e: unknown) => void;
}) {
  const router = useRouter();
  const qc = useQueryClient();
  const app = useQuery({ queryKey: ["jobs", "application", appId], queryFn: () => jobsApi.application(appId!), enabled: Boolean(appId) });
  const [notesDraft, setNotes] = useState<string | null>(null);
  const a = app.data;
  const notes = notesDraft ?? a?.employer_notes ?? "";
  const saveNotes = useMutation({
    mutationFn: (b: { employer_rating?: number | null; employer_notes?: string }) => jobsApi.saveNotes(appId!, b),
    onSuccess: (d) => qc.setQueryData(["jobs", "application", appId], d),
    onError,
  });
  const chat = useMutation({
    mutationFn: () => jobsApi.threadForApplication(appId!),
    onSuccess: (t) => { onClose(); router.push({ pathname: "/jobs-chat", params: { id: t.id } } as never); },
    onError,
  });
  const c = a && !a.locked ? (a.candidate as CandidateFull) : null;
  const has = a?.match_details?.matched_skills ?? [];
  const missing = a?.match_details?.missing_skills ?? [];

  return (
    <Modal visible={Boolean(appId)} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => { setNotes(null); onClose(); }}>
      <View style={{ flex: 1, backgroundColor: colors.paper }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: colors.hairline }}>
          <Text variant="title">Applicant</Text>
          <Pressable onPress={() => { setNotes(null); onClose(); }} hitSlop={10}><X size={22} color={colors.ink} /></Pressable>
        </View>
        {!a || !c ? <Loading /> : (
          <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Avatar name={c.display_name} url={c.photo_url} size={54} />
              <View style={{ flex: 1 }}>
                <Text variant="heading" style={{ fontSize: 19 }}>{c.display_name}</Text>
                <Text variant="caption" color="muted">{c.headline}</Text>
                <Text variant="caption" color="muted">{[[c.location, c.country].filter(Boolean).join(", "), `${c.years_experience} yrs experience`].filter(Boolean).join(" · ")}</Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {a.cv_url ? <PillButton label="CV" tone="outline" icon={<FileText size={14} color={colors.ink} />} onPress={() => Linking.openURL(a.cv_url!)} style={{ height: 36 }} /> : null}
              <PillButton label="Message" tone="outline" icon={<MessageSquare size={14} color={colors.ink} />} onPress={() => chat.mutate()} loading={chat.isPending} style={{ height: 36 }} />
              {c.email ? <PillButton label="Email" tone="outline" icon={<Mail size={14} color={colors.ink} />} onPress={() => Linking.openURL(`mailto:${c.email}`)} style={{ height: 36 }} /> : null}
              {c.phone ? <PillButton label="Call" tone="outline" icon={<Phone size={14} color={colors.ink} />} onPress={() => Linking.openURL(`tel:${c.phone}`)} style={{ height: 36 }} /> : null}
            </View>
            <View style={{ gap: 8 }}>
              <Text variant="label">Stage</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {statuses.map((s) => <Chip key={s} label={STATUS_LABEL[s]} active={a.status === s} onPress={() => a.status !== s && onMove(s)} />)}
              </View>
            </View>
            <Card style={{ backgroundColor: colors.mist, borderWidth: 0 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><Text variant="label">Match</Text><MatchBadge score={a.match_score} /></View>
              {has.length ? <Text variant="caption" style={{ marginTop: 6 }}>Has: {has.join(", ")}</Text> : null}
              {missing.length ? <Text variant="caption" color="muted" style={{ marginTop: 2 }}>Missing: {missing.join(", ")}</Text> : null}
            </Card>
            {a.cover_letter ? <View style={{ gap: 4 }}><Text variant="label">Cover note</Text><Text variant="body" style={{ lineHeight: 21 }}>{a.cover_letter}</Text></View> : null}
            {(a.answers?.length ?? 0) > 0 ? (
              <View style={{ gap: 8 }}>
                <Text variant="label">Screening answers</Text>
                {a.answers!.map((x) => (
                  <View key={x.id}><Text variant="caption" color="muted">{questions.find((q) => q.id === x.id)?.question ?? "Question"}</Text><Text variant="body">{x.answer || "—"}</Text></View>
                ))}
              </View>
            ) : null}
            {c.skills?.length ? (
              <View style={{ gap: 6 }}><Text variant="label">Skills</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>{c.skills.map((s) => <View key={s} style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: colors.mist }}><Text variant="caption">{s}</Text></View>)}</View>
              </View>
            ) : null}
            {c.experience?.length ? (
              <View style={{ gap: 6 }}><Text variant="label">Experience</Text>
                {c.experience.map((x, i) => <View key={i}><Text variant="label" style={{ fontSize: 14 }}>{x.title} · {x.company}</Text><Text variant="caption" color="muted">{[x.start, x.end].filter(Boolean).join(" – ")}</Text></View>)}
              </View>
            ) : null}
            <View style={{ gap: 8, borderTopWidth: 1, borderTopColor: colors.hairline, paddingTop: 14 }}>
              <Text variant="label">Your rating (private)</Text>
              <View style={{ flexDirection: "row", gap: 6 }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Pressable key={n} onPress={() => saveNotes.mutate({ employer_rating: a.employer_rating === n ? null : n })} hitSlop={4} accessibilityLabel={`${n} star${n > 1 ? "s" : ""}`}>
                    <Star size={26} color={colors.warn} fill={(a.employer_rating ?? 0) >= n ? colors.warn : "none"} />
                  </Pressable>
                ))}
              </View>
              <Text variant="label" style={{ marginTop: 6 }}>Notes (private)</Text>
              <TextBox multiline value={notes} onChangeText={setNotes} onBlur={() => notes !== a.employer_notes && saveNotes.mutate({ employer_notes: notes })} />
            </View>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

function Matches({ jobId, onUpgrade }: { jobId: string; onUpgrade: (c: string) => void }) {
  const router = useRouter();
  const m = useQuery({ queryKey: ["jobs", "matches", jobId], queryFn: () => jobsApi.matches(jobId), retry: false });
  if (m.isLoading) return <Loading />;
  if (m.isError) {
    const code = jobsErrorCode(m.error);
    return (
      <Card style={{ gap: 10 }}>
        <Text variant="caption">Smart matching is on Premium and Pro plans.</Text>
        {code && UPGRADE_CODES.has(code) ? <PillButton label="See plans" onPress={() => onUpgrade(code)} /> : null}
      </Card>
    );
  }
  if (!m.data?.results.length) return <Card><Text variant="caption" color="muted">No strong matches yet. Adding skills to the listing helps.</Text></Card>;
  return (
    <>
      {m.data.results.map((c) => (
        <Card key={c.id} onPress={() => router.push({ pathname: "/jobs-candidate", params: { id: c.id, job: jobId } } as never)} style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
          <Avatar name={c.display_name} url={c.photo_url} />
          <View style={{ flex: 1 }}>
            <Text variant="label" numberOfLines={1}>{c.display_name}</Text>
            <Text variant="caption" color="muted" numberOfLines={1}>{c.headline}</Text>
            {c.match.matched_skills?.length ? <Text variant="caption" numberOfLines={1}>Has: {c.match.matched_skills.join(", ")}</Text> : null}
          </View>
          <MatchBadge score={c.match.score} compact />
        </Card>
      ))}
    </>
  );
}

function Stats({ jobId }: { jobId: string }) {
  const s = useQuery({ queryKey: ["jobs", "job-analytics", jobId], queryFn: () => jobsApi.jobAnalytics(jobId) });
  if (!s.data) return <Loading />;
  const d = s.data;
  const buckets = Object.entries(d.match_distribution);
  const max = Math.max(1, ...buckets.map(([, n]) => n));
  return (
    <>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {([["Views", d.views], ["Applicants", d.applications], ["View → apply", `${d.conversion}%`], ["Saves", d.saves]] as const).map(([l, v]) => (
          <Card key={l} style={{ width: "48%" }}><Text variant="caption" color="muted">{l}</Text><Text variant="heading" style={{ marginTop: 2 }}>{String(v)}</Text></Card>
        ))}
      </View>
      <Card style={{ gap: 10 }}>
        <Text variant="title">Applicant match scores</Text>
        {buckets.map(([label, n]) => (
          <View key={label} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Text variant="caption" color="muted" style={{ width: 56 }}>{label}%</Text>
            <View style={{ flex: 1, height: 14 }}><View style={{ height: 14, width: `${(n / max) * 100}%`, minWidth: n ? 4 : 0, backgroundColor: colors.brand.green, borderTopRightRadius: 4, borderBottomRightRadius: 4 }} /></View>
            <Text variant="label" style={{ width: 26, textAlign: "right" }}>{n}</Text>
          </View>
        ))}
      </Card>
    </>
  );
}
