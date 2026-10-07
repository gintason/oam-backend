import { useState } from "react";
import { View, Pressable, ActivityIndicator, Linking } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Upload, Plus, Trash2, CheckCircle2 } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/shared/ui";
import { colors } from "@/shared/theme";
import { apiErrorMessage } from "@/shared/api";
import { jobsApi, jobsFieldErrors, uploadJobsFile, type CandidateProfile, type Experience, type Education } from "@/features/jobs";
import { pickDocument } from "@/features/jobs/pickers";
import { JobsScreen, Loading, Card, Field, TextBox, ChipGroup, ToggleRow, PillButton, ErrorNote } from "@/features/jobs/ui/kit";
import { SkillInput } from "@/features/jobs/ui/SkillInput";
import { useTranslation } from "react-i18next";
import { useJobsMeta } from "@/features/jobs/i18n";

/** The candidate's CV — feeds matching and 1-tap apply. */
export default function JobsProfile() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const me = useQuery({ queryKey: ["jobs", "candidate"], queryFn: jobsApi.me });
  const meta = useJobsMeta();
  const [edited, setForm] = useState<CandidateProfile | null>(null);
  const form = edited ?? me.data ?? null;
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const save = useMutation({
    mutationFn: (p: Partial<CandidateProfile>) => jobsApi.updateMe(p),
    onSuccess: (d) => {
      setForm(d); setErrors({}); setSaved(true);
      qc.setQueryData(["jobs", "candidate"], d);
      qc.invalidateQueries({ queryKey: ["jobs", "recommended"] });
    },
    onError: (err) => { setErrors(jobsFieldErrors(err)); setError(apiErrorMessage(err, t("jobs.profile.couldnTSaveYourCv"))); },
  });

  if (!form) return <JobsScreen title={t("jobs.profile.myCv")} side="seeker"><Loading /></JobsScreen>;
  const c = meta.data?.choices;
  const set = <K extends keyof CandidateProfile>(k: K, v: CandidateProfile[K]) => { setSaved(false); setForm((f) => ({ ...(f ?? form), [k]: v })); };
  const toggleIn = (k: "desired_location_types" | "desired_employment_types" | "desired_categories", v: string) => {
    const cur = form[k] as string[];
    set(k, (cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]) as never);
  };
  const upd = <T extends Experience | Education>(list: T[], i: number, patch: Partial<T>) => list.map((x, j) => (j === i ? { ...x, ...patch } : x));

  async function uploadCv() {
    const file = await pickDocument();
    if (!file) return;
    if ((file.size ?? 0) > 10 * 1024 * 1024) { setError(t("jobs.profile.cvsCanBeUpTo")); return; }
    setError(null); setUploading(true);
    try {
      const url = await uploadJobsFile("candidate_cv", file);
      save.mutate({ cv_url: url, cv_filename: file.fileName ?? "CV" });
    } catch (e) { setError((e as Error).message); } finally { setUploading(false); }
  }

  function submit() {
    setError(null);
    const f = form!;
    save.mutate({
      headline: f.headline, summary: f.summary, skills: f.skills, years_experience: Number(f.years_experience) || 0,
      experience_level: f.experience_level, experience: f.experience.filter((x) => x.title || x.company),
      education: f.education.filter((x) => x.school), location: f.location, country: f.country,
      desired_categories: f.desired_categories, desired_location_types: f.desired_location_types,
      desired_employment_types: f.desired_employment_types, desired_salary_min: f.desired_salary_min || null,
      desired_salary_currency: f.desired_salary_currency, desired_salary_period: f.desired_salary_period,
      willing_to_relocate: f.willing_to_relocate, open_to_work: f.open_to_work, is_searchable: f.is_searchable,
    });
  }

  const footer = (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, paddingBottom: 14 + insets.bottom, borderTopWidth: 1, borderTopColor: colors.hairline, backgroundColor: colors.paper }}>
      {saved ? <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}><CheckCircle2 size={16} color={colors.brand.green} /><Text variant="caption" color="green">{t("jobs.profile.saved")}</Text></View> : null}
      <PillButton label={t("jobs.profile.saveCv")} onPress={submit} loading={save.isPending} style={{ flex: 1, height: 48 }} />
    </View>
  );

  return (
    <JobsScreen title={t("jobs.profile.myCv")} subtitle={t("jobs.profile.usedFor1TapApply")} side="seeker" footer={footer}>
      <Card>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text variant="caption" color="muted">{t("jobs.profile.profileStrength")}</Text><Text variant="label">{form.completeness}%</Text>
        </View>
        <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.hairline, marginTop: 6 }}>
          <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.brand.green, width: `${form.completeness}%` }} />
        </View>
      </Card>

      <Card>
        <Text variant="title">{t("jobs.profile.cvFile")}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 }}>
          {form.cv_url ? (
            <Pressable onPress={() => Linking.openURL(form.cv_url)} style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 8 }}>
              <FileText size={18} color={colors.brand.green} /><Text variant="label" numberOfLines={1} style={{ flex: 1 }}>{form.cv_filename || t("jobs.profile.yourCv")}</Text>
            </Pressable>
          ) : <Text variant="caption" color="muted" style={{ flex: 1 }}>{t("jobs.profile.noCvYetPdfOr")}</Text>}
          <PillButton label={uploading ? t("jobs.profile.uploading") : form.cv_url ? t("jobs.profile.replace") : t("jobs.profile.upload")} tone="dark"
                      icon={uploading ? <ActivityIndicator size="small" color="#FFF" /> : <Upload size={15} color="#FFF" />}
                      onPress={uploadCv} disabled={uploading} style={{ height: 38 }} />
        </View>
      </Card>

      <Card style={{ gap: 14 }}>
        <Text variant="title">{t("jobs.profile.aboutYou")}</Text>
        <Field label={t("jobs.profile.headline")} hint={t("jobs.profile.eGReactNativeDeveloper")} error={errors.headline}>
          <TextBox value={form.headline} onChangeText={(v) => set("headline", v)} maxLength={160} />
        </Field>
        <Field label={t("jobs.profile.summary")}><TextBox multiline value={form.summary} onChangeText={(v) => set("summary", v)} /></Field>
        <Field label={t("jobs.profile.skills")} hint={t("jobs.profile.addAtLeast3They")}>
          <SkillInput value={form.skills} onChange={(v) => set("skills", v)} max={50} />
        </Field>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}><Field label={t("jobs.profile.yearsOfExperience")}>
            <TextBox keyboardType="number-pad" value={String(form.years_experience)} onChangeText={(v) => set("years_experience", Number(v.replace(/\D/g, "")) || 0)} />
          </Field></View>
          <View style={{ flex: 1 }}><Field label={t("jobs.profile.country")} hint={t("jobs.profile.eGNg")}>
            <TextBox autoCapitalize="characters" maxLength={2} value={form.country} onChangeText={(v) => set("country", v.toUpperCase())} />
          </Field></View>
        </View>
        <Field label={t("jobs.profile.city")}><TextBox value={form.location} onChangeText={(v) => set("location", v)} /></Field>
        <Field label={t("jobs.profile.level")}>
          <ChipGroup options={c?.experience_levels ?? []} value={form.experience_level || undefined}
                     onToggle={(v) => set("experience_level", (form.experience_level === v ? "" : v) as CandidateProfile["experience_level"])} />
        </Field>
      </Card>

      <Card style={{ gap: 10 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text variant="title">{t("jobs.profile.experience")}</Text>
          <Pressable onPress={() => set("experience", [...form.experience, { title: "", company: "" }])} hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Plus size={15} color={colors.brand.green} /><Text variant="label" color="green">{t("jobs.profile.addRole")}</Text>
          </Pressable>
        </View>
        {form.experience.map((x, i) => (
          <View key={i} style={{ gap: 8, borderRadius: 12, borderWidth: 1, borderColor: colors.hairline, padding: 10 }}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TextBox style={{ flex: 1 }} placeholder={t("jobs.profile.jobTitle")} value={x.title} onChangeText={(v) => set("experience", upd(form.experience, i, { title: v }))} />
              <Pressable onPress={() => set("experience", form.experience.filter((_, j) => j !== i))} hitSlop={8} style={{ justifyContent: "center", paddingHorizontal: 4 }} accessibilityLabel={t("jobs.profile.removeRole")}>
                <Trash2 size={17} color={colors.muted} />
              </Pressable>
            </View>
            <TextBox placeholder={t("jobs.profile.company")} value={x.company} onChangeText={(v) => set("experience", upd(form.experience, i, { company: v }))} />
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TextBox style={{ flex: 1 }} placeholder={t("jobs.profile.startEG2021")} value={x.start ?? ""} onChangeText={(v) => set("experience", upd(form.experience, i, { start: v }))} />
              <TextBox style={{ flex: 1 }} placeholder={t("jobs.profile.endOrPresent")} value={x.end ?? ""} onChangeText={(v) => set("experience", upd(form.experience, i, { end: v }))} />
            </View>
          </View>
        ))}
      </Card>

      <Card style={{ gap: 10 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text variant="title">{t("jobs.profile.education")}</Text>
          <Pressable onPress={() => set("education", [...form.education, { school: "" }])} hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Plus size={15} color={colors.brand.green} /><Text variant="label" color="green">{t("jobs.profile.add")}</Text>
          </Pressable>
        </View>
        {form.education.map((x, i) => (
          <View key={i} style={{ flexDirection: "row", gap: 8 }}>
            <View style={{ flex: 1, gap: 8 }}>
              <TextBox placeholder={t("jobs.profile.school")} value={x.school} onChangeText={(v) => set("education", upd<Education>(form.education, i, { school: v }))} />
              <TextBox placeholder={t("jobs.profile.qualification")} value={x.qualification ?? ""} onChangeText={(v) => set("education", upd<Education>(form.education, i, { qualification: v }))} />
            </View>
            <Pressable onPress={() => set("education", form.education.filter((_, j) => j !== i))} hitSlop={8} style={{ justifyContent: "center" }} accessibilityLabel={t("jobs.profile.remove")}>
              <Trash2 size={17} color={colors.muted} />
            </Pressable>
          </View>
        ))}
      </Card>

      <Card style={{ gap: 14 }}>
        <Text variant="title">{t("jobs.profile.whatYouReLookingFor")}</Text>
        <Field label={t("jobs.profile.workSetting")}><ChipGroup options={c?.location_types ?? []} value={form.desired_location_types} onToggle={(v) => toggleIn("desired_location_types", v)} /></Field>
        <Field label={t("jobs.profile.jobType")}><ChipGroup options={c?.employment_types ?? []} value={form.desired_employment_types} onToggle={(v) => toggleIn("desired_employment_types", v)} /></Field>
        <Field label={t("jobs.profile.categories")}><ChipGroup options={c?.categories ?? []} value={form.desired_categories} onToggle={(v) => toggleIn("desired_categories", v)} /></Field>
        <Field label={t("jobs.profile.minimumMonthlyPay")}>
          <TextBox keyboardType="number-pad" value={form.desired_salary_min ?? ""} onChangeText={(v) => set("desired_salary_min", v.replace(/[^\d.]/g, ""))} />
        </Field>
        <View>
          <ToggleRow label={t("jobs.profile.openToWork")} value={form.open_to_work} onChange={(v) => set("open_to_work", v)} />
          <ToggleRow label={t("jobs.profile.letEmployersFindMyProfile")} value={form.is_searchable} onChange={(v) => set("is_searchable", v)} />
          <ToggleRow label={t("jobs.profile.willingToRelocate")} value={form.willing_to_relocate} onChange={(v) => set("willing_to_relocate", v)} />
        </View>
      </Card>
      <ErrorNote>{error}</ErrorNote>
    </JobsScreen>
  );
}
