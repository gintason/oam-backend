import { useState } from "react";
import { View, Pressable, ScrollView, Modal, Share, Linking, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  MapPin, Briefcase, GraduationCap, Users, Bookmark, BookmarkCheck, Share2, Flag, BadgeCheck,
  CheckCircle2, ExternalLink, FileText, Upload, X,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/shared/ui";
import { colors, fonts } from "@/shared/theme";
import { apiErrorMessage } from "@/shared/api";
import {
  jobsApi, jobsErrorCode, formatSalary, timeAgo, uploadJobsFile, LOCATION_LABEL, EMPLOYMENT_LABEL,
  LEVEL_LABEL, type JobDetail, type Answer,
} from "@/features/jobs";
import { pickDocument } from "@/features/jobs/pickers";
import { JobsScreen, Card, Loading, CompanyLogo, MatchBadge, PillButton, ErrorNote, Field, TextBox } from "@/features/jobs/ui/kit";
import { EngagementBar, JobComments } from "@/features/jobs/ui/Engagement";
import { useTranslation } from "react-i18next";

export default function JobDetailScreen() {
  const { t } = useTranslation();
  const { id = "" } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const job = useQuery({ queryKey: ["jobs", "job", id], queryFn: () => jobsApi.job(id), enabled: Boolean(id) });
  const me = useQuery({ queryKey: ["jobs", "candidate"], queryFn: jobsApi.me });
  const [saved, setSaved] = useState<boolean | null>(null);
  const [applied, setApplied] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [commentFocus, setCommentFocus] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const isSaved = saved ?? Boolean(job.data?.is_saved);
  const save = useMutation({
    mutationFn: () => (isSaved ? jobsApi.unsave(id) : jobsApi.save(id)),
    onMutate: () => setSaved(!isSaved),
    onError: () => setSaved(isSaved),
  });
  const quickApply = useMutation({
    mutationFn: () => jobsApi.apply({ job: id }),
    onSuccess: () => { setApplied(true); qc.invalidateQueries({ queryKey: ["jobs"] }); },
    onError: (err) => {
      const code = jobsErrorCode(err);
      if (code === "cv_required" || code === "answers_required") setApplyOpen(true);
      else setError(apiErrorMessage(err, t("jobs.jobDetail.couldnTSendYourApplication")));
    },
  });

  if (job.isLoading) return <JobsScreen title={t("jobs.jobDetail.job")}><Loading /></JobsScreen>;
  if (!job.data) return <JobsScreen title={t("jobs.jobDetail.job")}><Card><Text variant="body" color="muted">{t("jobs.jobDetail.thisJobIsNoLonger")}</Text></Card></JobsScreen>;

  const j = job.data;
  const hasApplied = applied || Boolean(j.has_applied);
  const needsForm = (j.screening_questions?.length ?? 0) > 0 || !me.data?.cv_url;
  const salary = formatSalary(j.salary);
  const place = [j.location, j.country].filter(Boolean).join(", ");

  function onApply() {
    setError(null);
    if (j.apply_method === "external") { Linking.openURL(j.external_apply_url); return; }
    if (needsForm) setApplyOpen(true); else quickApply.mutate();
  }

  const footer = (
    <View style={{ flexDirection: "row", gap: 10, padding: 14, paddingBottom: 14 + insets.bottom, borderTopWidth: 1, borderTopColor: colors.hairline, backgroundColor: colors.paper }}>
      {hasApplied ? (
        <PillButton label={t("jobs.jobDetail.appliedTrackStatus")} tone="outline" icon={<CheckCircle2 size={16} color={colors.brand.green} />}
                    onPress={() => router.push("/jobs-applications" as never)} style={{ flex: 1, height: 48 }} />
      ) : (
        <PillButton label={j.apply_method === "external" ? t("jobs.jobDetail.applyOnCompanySite") : needsForm ? t("jobs.jobDetail.applyNow") : t("jobs.jobDetail.n1TapApply")}
                    icon={j.apply_method === "external" ? <ExternalLink size={15} color="#FFF" /> : undefined}
                    loading={quickApply.isPending} onPress={onApply} style={{ flex: 1, height: 48 }} />
      )}
      <Pressable onPress={() => save.mutate()} accessibilityLabel={isSaved ? t("jobs.jobDetail.saved") : t("jobs.jobDetail.saveJob")}
                 style={{ height: 48, width: 48, borderRadius: 12, borderWidth: 1, borderColor: colors.hairline, alignItems: "center", justifyContent: "center" }}>
        {isSaved ? <BookmarkCheck size={20} color={colors.brand.green} /> : <Bookmark size={20} color={colors.ink} />}
      </Pressable>
      <Pressable onPress={() => Share.share({ message: `${t("jobs.jobDetail.shareText", { title: j.title, company_name: j.employer.company_name })} — https://oam-app.com/jobs/${j.id}` }).catch(() => {})}
                 accessibilityLabel={t("jobs.jobDetail.shareJob")}
                 style={{ height: 48, width: 48, borderRadius: 12, borderWidth: 1, borderColor: colors.hairline, alignItems: "center", justifyContent: "center" }}>
        <Share2 size={19} color={colors.ink} />
      </Pressable>
    </View>
  );

  return (
    <JobsScreen title={t("jobs.jobDetail.jobDetails")} footer={footer}>
      <Card>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <CompanyLogo url={j.employer.logo_url} name={j.employer.company_name} size={54} />
          <View style={{ flex: 1 }}>
            <Text variant="heading" style={{ fontSize: 20 }}>{j.title}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
              <Text variant="label">{j.employer.company_name}</Text>
              {j.employer.is_verified ? <BadgeCheck size={14} color={colors.brand.green} /> : null}
            </View>
            <Text variant="caption" color="muted">{t("jobs.jobDetail.postedApplicants", { timeAgo: timeAgo(j.published_at), count: j.applications_count })}</Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 14, rowGap: 12 }}>
          <Fact icon={<MapPin size={14} color={colors.muted} />} label={t("jobs.jobDetail.location")} value={`${LOCATION_LABEL[j.location_type]}${place ? ` · ${place}` : ""}`} />
          <Fact icon={<Briefcase size={14} color={colors.muted} />} label={t("jobs.jobDetail.type")} value={EMPLOYMENT_LABEL[j.employment_type]} />
          <Fact icon={<GraduationCap size={14} color={colors.muted} />} label={t("jobs.jobDetail.level")} value={`${LEVEL_LABEL[j.experience_level]}${j.min_years_experience ? ` · ${j.min_years_experience}+ yrs` : ""}`} />
          <Fact icon={<Users size={14} color={colors.muted} />} label={t("jobs.jobDetail.openings")} value={String(j.openings)} />
        </View>
        {salary ? <Text variant="title" style={{ marginTop: 12, fontFamily: fonts.bold }}>{salary}</Text> : null}
        <EngagementBar job={j} showShare={false} onComments={() => setCommentFocus((n) => n + 1)} />
      </Card>
      <ErrorNote>{error}</ErrorNote>

      {j.match ? <MatchPanel job={j} /> : null}
      <Section title={t("jobs.jobDetail.aboutTheRole")} body={j.description} />
      <Section title={t("jobs.jobDetail.responsibilities")} body={j.responsibilities} />
      <Section title={t("jobs.jobDetail.requirements")} body={j.requirements} />
      <Section title={t("jobs.jobDetail.benefits")} body={j.benefits} />
      {j.skills.length ? (
        <Card>
          <Text variant="title">{t("jobs.jobDetail.skills")}</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
            {j.skills.map((s) => <View key={s} style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: colors.mist }}><Text variant="caption">{s}</Text></View>)}
          </View>
        </Card>
      ) : null}
      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <CompanyLogo url={j.employer.logo_url} name={j.employer.company_name} size={38} />
          <View style={{ flex: 1 }}>
            <Text variant="label">{j.employer.company_name}</Text>
            {j.employer.tagline ? <Text variant="caption" color="muted" numberOfLines={2}>{j.employer.tagline}</Text> : null}
          </View>
        </View>
        {j.employer.description ? <Text variant="caption" color="muted" style={{ marginTop: 10, lineHeight: 18 }} numberOfLines={5}>{j.employer.description}</Text> : null}
      </Card>
      <JobComments jobId={j.id} focusKey={commentFocus} />
      <Pressable onPress={() => setReportOpen(true)} style={{ flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start" }}>
        <Flag size={13} color={colors.muted} /><Text variant="caption" color="muted">{t("jobs.jobDetail.reportThisListing")}</Text>
      </Pressable>

      <ApplyModal visible={applyOpen} job={j} cvUrl={me.data?.cv_url ?? ""} cvName={me.data?.cv_filename ?? ""}
                  onClose={() => setApplyOpen(false)}
                  onDone={() => { setApplyOpen(false); setApplied(true); qc.invalidateQueries({ queryKey: ["jobs"] }); }} />
      <ReportModal visible={reportOpen} jobId={j.id} onClose={() => setReportOpen(false)} />
    </JobsScreen>
  );
}

function Fact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View style={{ width: "50%", paddingRight: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>{icon}<Text variant="caption" color="muted" style={{ fontSize: 11 }}>{label.toUpperCase()}</Text></View>
      <Text variant="label" style={{ marginTop: 2 }}>{value}</Text>
    </View>
  );
}

function Section({ title, body }: { title: string; body: string }) {
  if (!body?.trim()) return null;
  return <Card><Text variant="title">{title}</Text><Text variant="body" style={{ marginTop: 6, lineHeight: 22 }}>{body}</Text></Card>;
}

function MatchPanel({ job }: { job: JobDetail }) {
  const { t } = useTranslation();
  const m = job.match!;
  const bars: [string, number][] = [[t("jobs.jobDetail.skills"), m.skills], [t("jobs.jobDetail.experience"), m.experience], [t("jobs.jobDetail.preferences"), m.preferences], [t("jobs.jobDetail.profileText"), m.text]];
  return (
    <Card>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text variant="title">{t("jobs.jobDetail.yourMatch")}</Text><MatchBadge score={m.score} />
      </View>
      <View style={{ marginTop: 10, gap: 8 }}>
        {bars.map(([label, v]) => (
          <View key={label}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text variant="caption" color="muted">{label}</Text><Text variant="caption" style={{ fontFamily: fonts.bold }}>{Math.round(v * 100)}%</Text>
            </View>
            <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.mist, marginTop: 4 }}>
              <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.brand.green, width: `${Math.round(v * 100)}%` }} />
            </View>
          </View>
        ))}
      </View>
      {m.matched_skills.length ? <Text variant="caption" style={{ marginTop: 10 }}>{t("jobs.jobDetail.youHave")}{" "}{m.matched_skills.join(", ")}</Text> : null}
      {m.missing_skills.length ? <Text variant="caption" color="muted" style={{ marginTop: 3 }}>{t("jobs.jobDetail.missing")}{" "}{m.missing_skills.join(", ")}</Text> : null}
    </Card>
  );
}

function Sheet({ visible, title, onClose, children }: { visible: boolean; title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)" }} />
        <View style={{ maxHeight: "88%", backgroundColor: colors.paper, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingBottom: 28 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, paddingBottom: 4 }}>
            <Text variant="title" style={{ flex: 1 }} numberOfLines={1}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={10}><X size={22} color={colors.ink} /></Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }} keyboardShouldPersistTaps="handled">{children}</ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function ApplyModal({ visible, job, cvUrl, cvName, onClose, onDone }: {
  visible: boolean; job: JobDetail; cvUrl: string; cvName: string; onClose: () => void; onDone: () => void;
}) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [cover, setCover] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [cv, setCv] = useState<{ url: string; name: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const current = cv ?? { url: cvUrl, name: cvName };

  async function upload() {
    const file = await pickDocument();
    if (!file) return;
    if ((file.size ?? 0) > 10 * 1024 * 1024) { setError(t("jobs.jobDetail.cvsCanBeUpTo")); return; }
    setError(null); setUploading(true);
    try {
      const url = await uploadJobsFile("candidate_cv", file);
      await jobsApi.updateMe({ cv_url: url, cv_filename: file.fileName ?? "CV" });
      qc.invalidateQueries({ queryKey: ["jobs", "candidate"] });
      setCv({ url, name: file.fileName ?? "CV" });
    } catch (e) {
      setError((e as Error).message);
    } finally { setUploading(false); }
  }

  const submit = useMutation({
    mutationFn: () => jobsApi.apply({ job: job.id, cover_letter: cover, answers: Object.entries(answers).map(([id, answer]) => ({ id, answer })) as Answer[] }),
    onSuccess: onDone,
    onError: (err) => setError(apiErrorMessage(err, t("jobs.jobDetail.couldnTSendYourApplication"))),
  });

  return (
    <Sheet visible={visible} title={t("jobs.jobDetail.applyTitle", { title: job.title })} onClose={onClose}>
      <Pressable onPress={upload} disabled={uploading}
                 style={{ flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, borderWidth: 1, borderStyle: "dashed", borderColor: colors.hairline, backgroundColor: colors.mist, padding: 14 }}>
        {uploading ? <ActivityIndicator color={colors.brand.green} /> : current.url ? <FileText size={18} color={colors.brand.green} /> : <Upload size={18} color={colors.ink} />}
        <Text variant="label" style={{ flex: 1 }} numberOfLines={1}>{uploading ? t("jobs.jobDetail.uploading") : current.url ? current.name || t("jobs.jobDetail.yourCv") : t("jobs.jobDetail.uploadYourCvPdfOr")}</Text>
        {current.url && !uploading ? <Text variant="caption" color="green">{t("jobs.jobDetail.replace")}</Text> : null}
      </Pressable>
      {job.screening_questions.map((q) => (
        <Field key={q.id} label={`${q.question}${q.required ? " *" : ""}`}>
          <TextBox value={answers[q.id] ?? ""} onChangeText={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))} />
        </Field>
      ))}
      <Field label={t("jobs.jobDetail.coverNoteOptional")} hint={t("jobs.jobDetail.aFewLinesOnWhy")}>
        <TextBox multiline value={cover} onChangeText={setCover} maxLength={5000} />
      </Field>
      <ErrorNote>{error}</ErrorNote>
      <PillButton label={t("jobs.jobDetail.sendApplication")} onPress={() => submit.mutate()} loading={submit.isPending} disabled={!current.url || uploading} style={{ height: 50 }} />
    </Sheet>
  );
}

function ReportModal({ visible, jobId, onClose }: { visible: boolean; jobId: string; onClose: () => void }) {
  const { t } = useTranslation();
  const [reason, setReason] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const send = useMutation({
    mutationFn: () => jobsApi.report(jobId, reason),
    onSuccess: () => setDone(true),
    onError: (err) => setError(apiErrorMessage(err, t("jobs.jobDetail.couldnTSendTheReport"))),
  });
  return (
    <Sheet visible={visible} title={t("jobs.jobDetail.reportThisListing")} onClose={onClose}>
      {done ? (
        <Text variant="body">{t("jobs.jobDetail.thanksOurTeamWillReview")}</Text>
      ) : (
        <>
          <Text variant="caption" color="muted">{t("jobs.jobDetail.scamAskingForMoneyMisleading")}</Text>
          <TextBox multiline value={reason} onChangeText={setReason} placeholder={t("jobs.jobDetail.whatSWrongWithThis")} />
          <ErrorNote>{error}</ErrorNote>
          <PillButton label={t("jobs.jobDetail.sendReport")} tone="red" onPress={() => send.mutate()} loading={send.isPending} disabled={!reason.trim()} />
        </>
      )}
    </Sheet>
  );
}
