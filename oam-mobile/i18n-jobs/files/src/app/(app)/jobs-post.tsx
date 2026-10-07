import { useMemo, useState } from "react";
import { View, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Plus, Trash2, Check } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/shared/ui";
import { colors } from "@/shared/theme";
import { apiErrorMessage } from "@/shared/api";
import { jobsApi, jobsErrorCode, jobsFieldErrors, formatSalary, UPGRADE_CODES, LOCATION_LABEL, EMPLOYMENT_LABEL, type JobDraft } from "@/features/jobs";
import { JobsScreen, Loading, Card, Field, TextBox, ChipGroup, ToggleRow, PillButton, ErrorNote, Chip } from "@/features/jobs/ui/kit";
import { SkillInput } from "@/features/jobs/ui/SkillInput";
import { UpgradeSheet } from "@/features/jobs/ui/UpgradeSheet";
import { useTranslation } from "react-i18next";
import { useJobsMeta } from "@/features/jobs/i18n";

const STEPS = ["basics", "description", "locationPay", "applications", "review"] as const;   // jobs.post.steps.<key>
const FIELD_STEP: Record<string, number> = {
  title: 0, category: 0, employment_type: 0, experience_level: 0, openings: 0,
  description: 1, responsibilities: 1, requirements: 1, benefits: 1, skills: 1,
  location_type: 2, location: 2, country: 2, salary_min: 2, salary_max: 2, min_years_experience: 2,
  apply_method: 3, external_apply_url: 3, screening_questions: 3,
};
const BLANK: JobDraft = {
  title: "", category: "technology", employment_type: "full_time", experience_level: "mid", openings: 1,
  description: "", responsibilities: "", requirements: "", benefits: "", skills: [], location_type: "on_site",
  location: "", country: "NG", salary_min: null, salary_max: null, salary_currency: "NGN", salary_period: "month",
  salary_visible: true, min_years_experience: 0, apply_method: "in_app", external_apply_url: "", screening_questions: [],
};

/** Five-step posting wizard (also used to edit: /jobs-post?id=…). */
export default function PostJob() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [edited, setDraft] = useState<JobDraft | null>(null);
  const [jobId, setJobId] = useState<string | undefined>(id);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [upgrade, setUpgrade] = useState<string | null>(null);

  const meta = useJobsMeta();
  const existing = useQuery({ queryKey: ["jobs", "owned", id], queryFn: () => jobsApi.ownedJob(id!), enabled: Boolean(id) });
  const loaded = useMemo<JobDraft | null>(() => {
    if (!existing.data) return null;
    const { id: _i, slug: _s, ...rest } = existing.data;
    void _i; void _s;
    return rest;
  }, [existing.data]);
  const draft: JobDraft = edited ?? loaded ?? BLANK;
  const status = existing.data?.status;
  const set = <K extends keyof JobDraft>(k: K, v: JobDraft[K]) => setDraft((d) => ({ ...(d ?? draft), [k]: v }));
  const c = meta.data?.choices;
  const questions = draft.screening_questions ?? [];

  function fail(err: unknown) {
    const code = jobsErrorCode(err);
    if (code && UPGRADE_CODES.has(code)) { setUpgrade(code); return; }
    const fe = jobsFieldErrors(err);
    setErrors(fe);
    const first = Object.keys(fe).map((k) => FIELD_STEP[k]).filter((n) => n != null).sort()[0];
    if (first != null) setStep(first);
    setError(apiErrorMessage(err, t("jobs.post.pleaseCheckTheHighlightedFields")));
  }

  async function persist() {
    const body = { ...draft, salary_min: draft.salary_min || null, salary_max: draft.salary_max || null };
    if (jobId) return jobsApi.updateJob(jobId, body);
    const created = await jobsApi.createJob(body);
    setJobId(created.id);
    return created;
  }
  const saveDraft = useMutation({
    mutationFn: persist,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["jobs"] }); router.replace("/jobs-employer" as never); },
    onError: fail,
  });
  const publish = useMutation({
    mutationFn: async () => {
      const saved = await persist();
      if (saved.status === "active") return saved;
      return jobsApi.jobAction(saved.id, status === "expired" || status === "closed" ? "renew" : "publish");
    },
    onSuccess: (j) => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      router.replace((j.status === "active" ? { pathname: "/jobs-pipeline", params: { id: j.id, published: "1" } } : "/jobs-employer") as never);
    },
    onError: fail,
  });

  function next() {
    setError(null);
    const e: Record<string, string> = {};
    if (step === 0 && (draft.title ?? "").trim().length < 4) e.title = t("jobs.post.addAJobTitle");
    if (step === 1 && (draft.description ?? "").trim().length < 50) e.description = t("jobs.post.describeTheRoleInAt");
    if (step === 2 && draft.location_type !== "remote" && !draft.location && !draft.country) e.location = t("jobs.post.whereIsTheJob");
    if (step === 2 && draft.salary_min && draft.salary_max && Number(draft.salary_min) > Number(draft.salary_max)) e.salary_max = t("jobs.post.mustBeAtLeastThe");
    if (step === 3 && draft.apply_method === "external" && !draft.external_apply_url) e.external_apply_url = t("jobs.post.addTheApplicationLink");
    setErrors(e);
    if (!Object.keys(e).length) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  if (id && existing.isLoading) return <JobsScreen title={t("jobs.post.editJob")} side="employer"><Loading /></JobsScreen>;
  const isLive = status === "active";

  const footer = (
    <View style={{ flexDirection: "row", gap: 8, padding: 14, paddingBottom: 14 + insets.bottom, borderTopWidth: 1, borderTopColor: colors.hairline, backgroundColor: colors.paper }}>
      <PillButton label={t("jobs.post.back")} tone="outline" icon={<ChevronLeft size={15} color={colors.ink} />} onPress={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} />
      {!isLive ? <PillButton label={t("jobs.post.saveDraft")} tone="outline" onPress={() => saveDraft.mutate()} loading={saveDraft.isPending} style={{ flex: 1 }} /> : null}
      {step < STEPS.length - 1
        ? <PillButton label={t("jobs.post.next")} icon={<ChevronRight size={15} color="#FFF" />} onPress={next} style={{ flex: 1 }} />
        : <PillButton label={isLive ? t("jobs.post.saveChanges") : t("jobs.post.publish")} onPress={() => publish.mutate()} loading={publish.isPending} style={{ flex: 1 }} />}
    </View>
  );

  return (
    <JobsScreen title={id ? t("jobs.post.editJob") : t("jobs.post.postAJob")} subtitle={t("jobs.post.stepOf", { step: step + 1, total: STEPS.length, name: t(`jobs.post.steps.${STEPS[step]}`) })} side="employer" footer={footer}>
      <View style={{ flexDirection: "row", gap: 4 }}>
        {STEPS.map((s, i) => (
          <Pressable key={s} onPress={() => i < step && setStep(i)} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i <= step ? colors.brand.green : colors.hairline }}
                     accessibilityLabel={`${s}${i < step ? ", done" : i === step ? ", current" : ""}`} />
        ))}
      </View>

      <Card style={{ gap: 16 }}>
        {step === 0 ? (
          <>
            <Field label={t("jobs.post.jobTitle")} error={errors.title} hint={t("jobs.post.beSpecificSeniorAccountantNot")}>
              <TextBox value={draft.title} onChangeText={(v) => set("title", v)} maxLength={160} />
            </Field>
            <Field label={t("jobs.post.category")}><ChipGroup options={c?.categories ?? []} value={draft.category} onToggle={(v) => set("category", v)} /></Field>
            <Field label={t("jobs.post.jobType")}><ChipGroup options={c?.employment_types ?? []} value={draft.employment_type} onToggle={(v) => set("employment_type", v as JobDraft["employment_type"])} /></Field>
            <Field label={t("jobs.post.experienceLevel")}><ChipGroup options={c?.experience_levels ?? []} value={draft.experience_level} onToggle={(v) => set("experience_level", v as JobDraft["experience_level"])} /></Field>
            <Field label={t("jobs.post.openings")}><TextBox keyboardType="number-pad" value={String(draft.openings ?? 1)} onChangeText={(v) => set("openings", Math.max(1, Number(v.replace(/\D/g, "")) || 1))} /></Field>
          </>
        ) : step === 1 ? (
          <>
            <Field label={t("jobs.post.aboutTheRole")} error={errors.description} hint={t("jobs.post.charsMinimum", { n: (draft.description ?? "").trim().length })}>
              <TextBox multiline style={{ minHeight: 140 }} value={draft.description} onChangeText={(v) => set("description", v)} />
            </Field>
            <Field label={t("jobs.post.responsibilities")} hint={t("jobs.post.onePerLineWorksWell")}><TextBox multiline value={draft.responsibilities} onChangeText={(v) => set("responsibilities", v)} /></Field>
            <Field label={t("jobs.post.requirements")}><TextBox multiline value={draft.requirements} onChangeText={(v) => set("requirements", v)} /></Field>
            <Field label={t("jobs.post.benefits")}><TextBox multiline value={draft.benefits} onChangeText={(v) => set("benefits", v)} /></Field>
            <Field label={t("jobs.post.skills")} hint={t("jobs.post.the38ThatMatter")}><SkillInput value={draft.skills ?? []} onChange={(v) => set("skills", v)} /></Field>
          </>
        ) : step === 2 ? (
          <>
            <Field label={t("jobs.post.workSetting")}><ChipGroup options={c?.location_types ?? []} value={draft.location_type} onToggle={(v) => set("location_type", v as JobDraft["location_type"])} /></Field>
            <Field label={draft.location_type === "remote" ? t("jobs.post.cityOptional") : t("jobs.post.city")} error={errors.location}>
              <TextBox value={draft.location} onChangeText={(v) => set("location", v)} placeholder={t("jobs.post.eGLagos")} />
            </Field>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}><Field label={t("jobs.post.country")} hint={t("jobs.post.eGNg")}><TextBox autoCapitalize="characters" maxLength={2} value={draft.country} onChangeText={(v) => set("country", v.toUpperCase())} /></Field></View>
              <View style={{ flex: 1 }}><Field label={t("jobs.post.minYears")}><TextBox keyboardType="number-pad" value={String(draft.min_years_experience ?? 0)} onChangeText={(v) => set("min_years_experience", Number(v.replace(/\D/g, "")) || 0)} /></Field></View>
            </View>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}><Field label={t("jobs.post.salaryFrom")} error={errors.salary_min}><TextBox keyboardType="number-pad" value={draft.salary_min ?? ""} onChangeText={(v) => set("salary_min", v.replace(/[^\d.]/g, "") || null)} /></Field></View>
              <View style={{ flex: 1 }}><Field label={t("jobs.post.salaryTo")} error={errors.salary_max}><TextBox keyboardType="number-pad" value={draft.salary_max ?? ""} onChangeText={(v) => set("salary_max", v.replace(/[^\d.]/g, "") || null)} /></Field></View>
            </View>
            <Field label={t("jobs.post.currency")}><ChipGroup options={["NGN", "USD", "GBP", "EUR"].map((x) => ({ value: x, label: x }))} value={draft.salary_currency} onToggle={(v) => set("salary_currency", v)} /></Field>
            <Field label={t("jobs.post.per")}><ChipGroup options={c?.salary_periods ?? []} value={draft.salary_period} onToggle={(v) => set("salary_period", v as JobDraft["salary_period"])} /></Field>
            <ToggleRow label={t("jobs.post.showSalaryListingsWithPay")} value={Boolean(draft.salary_visible)} onChange={(v) => set("salary_visible", v)} />
          </>
        ) : step === 3 ? (
          <>
            <Field label={t("jobs.post.howShouldPeopleApply")}>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <Chip label={t("jobs.post.onOamRecommended")} active={draft.apply_method === "in_app"} onPress={() => set("apply_method", "in_app")} />
                <Chip label={t("jobs.post.onMyWebsite")} active={draft.apply_method === "external"} onPress={() => set("apply_method", "external")} />
              </View>
            </Field>
            {draft.apply_method === "external" ? (
              <Field label={t("jobs.post.applicationLink")} error={errors.external_apply_url}>
                <TextBox autoCapitalize="none" keyboardType="url" placeholder="https://" value={draft.external_apply_url} onChangeText={(v) => set("external_apply_url", v)} />
              </Field>
            ) : (
              <View style={{ gap: 10 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text variant="label">{t("jobs.post.screeningQuestionsOptional")}</Text>
                  {questions.length < 10 ? (
                    <Pressable onPress={() => set("screening_questions", [...questions, { id: String(Date.now()), question: "", required: false }])} hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <Plus size={15} color={colors.brand.green} /><Text variant="label" color="green">{t("jobs.post.add")}</Text>
                    </Pressable>
                  ) : null}
                </View>
                {questions.map((q, i) => (
                  <View key={q.id} style={{ gap: 6, borderRadius: 12, borderWidth: 1, borderColor: colors.hairline, padding: 10 }}>
                    <TextBox placeholder={t("jobs.post.eGDoYouHave")} value={q.question}
                             onChangeText={(v) => set("screening_questions", questions.map((x, j) => (j === i ? { ...x, question: v } : x)))} />
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                      <Pressable onPress={() => set("screening_questions", questions.map((x, j) => (j === i ? { ...x, required: !x.required } : x)))} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <View style={{ height: 20, width: 20, borderRadius: 5, borderWidth: 1, borderColor: q.required ? colors.brand.green : colors.hairline, backgroundColor: q.required ? colors.brand.green : colors.paper, alignItems: "center", justifyContent: "center" }}>
                          {q.required ? <Check size={13} color="#FFF" /> : null}
                        </View>
                        <Text variant="caption">{t("jobs.post.required")}</Text>
                      </Pressable>
                      <Pressable onPress={() => set("screening_questions", questions.filter((_, j) => j !== i))} hitSlop={8} accessibilityLabel={t("jobs.post.removeQuestion")}>
                        <Trash2 size={17} color={colors.muted} />
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        ) : (
          <>
            <Text variant="caption" color="muted">{t("jobs.post.preview")}</Text>
            <Text variant="heading" style={{ fontSize: 20 }}>{draft.title || t("jobs.post.untitledJob")}</Text>
            <Text variant="caption" color="muted">
              {LOCATION_LABEL[draft.location_type ?? "on_site"]}{draft.location ? ` · ${draft.location}` : ""} · {EMPLOYMENT_LABEL[draft.employment_type ?? "full_time"]}
            </Text>
            {draft.salary_visible && (draft.salary_min || draft.salary_max) ? (
              <Text variant="title">{formatSalary({ min: draft.salary_min ?? null, max: draft.salary_max ?? null, currency: draft.salary_currency ?? "NGN", period: draft.salary_period ?? "month" })}</Text>
            ) : null}
            <Text variant="body" numberOfLines={6} style={{ lineHeight: 21 }}>{draft.description}</Text>
            <View style={{ borderRadius: 12, backgroundColor: colors.mist, padding: 12 }}>
              <Text variant="caption" color="muted">{t("jobs.post.listingsAreScreenedAutomaticallyAnything")}</Text>
            </View>
          </>
        )}
      </Card>
      <ErrorNote>{error}</ErrorNote>
      <UpgradeSheet reason={upgrade} onClose={() => { setUpgrade(null); router.replace("/jobs-employer" as never); }} />
    </JobsScreen>
  );
}
