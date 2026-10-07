import { useState } from "react";
import { View, Pressable, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Upload, ShieldCheck, Clock, CheckCircle2 } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/shared/ui";
import { colors } from "@/shared/theme";
import { apiErrorMessage } from "@/shared/api";
import { jobsApi, jobsErrorCode, jobsFieldErrors, uploadJobsFile, type EmployerProfile } from "@/features/jobs";
import { pickImage, pickDocument } from "@/features/jobs/pickers";
import { JobsScreen, Loading, Card, Field, TextBox, ChipGroup, PillButton, ErrorNote, CompanyLogo } from "@/features/jobs/ui/kit";
import { useTranslation } from "react-i18next";
import { useJobsMeta } from "@/features/jobs/i18n";

const SIZES = ["1", "2-10", "11-50", "51-200", "201-1000", "1000+"].map((s) => ({ value: s, label: s }));
const EMPTY: Partial<EmployerProfile> = { company_name: "", tagline: "", description: "", industry: "", company_size: "", website: "", contact_email: "", headquarters: "", country: "NG", logo_url: "" };

/** Create or edit the company page, and submit verification. */
export default function JobsCompany() {
  const { t } = useTranslation();
  const router = useRouter();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ new?: string }>();
  const company = useQuery({ queryKey: ["jobs", "company"], queryFn: jobsApi.myCompany, retry: false });
  const meta = useJobsMeta();
  const isNew = company.isError && jobsErrorCode(company.error) === "no_employer_profile";
  const [edited, setForm] = useState<Partial<EmployerProfile> | null>(null);
  const form = edited ?? company.data ?? EMPTY;
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const save = useMutation({
    mutationFn: () => {
      const body = { ...form };
      delete body.usage;
      return isNew ? jobsApi.createCompany(body) : jobsApi.updateCompany(body);
    },
    onSuccess: (d) => {
      qc.setQueryData(["jobs", "company"], d);
      qc.invalidateQueries({ queryKey: ["jobs", "company"] });
      setErrors({}); setSaved(true);
      if (isNew || params.new) router.replace("/jobs-employer" as never);
    },
    onError: (err) => { setErrors(jobsFieldErrors(err)); setError(apiErrorMessage(err, t("jobs.company.couldnTSave"))); },
  });
  const verify = useMutation({
    mutationFn: (doc: string) => jobsApi.submitVerification({ verification_document_url: doc, registration_number: form.registration_number }),
    onSuccess: (d) => qc.setQueryData(["jobs", "company"], d),
    onError: (err) => setError(apiErrorMessage(err, t("jobs.company.couldnTSubmitForVerification"))),
  });

  async function uploadLogo() {
    const f = await pickImage(); if (!f) return;
    setUploading("logo");
    try { const url = await uploadJobsFile("company_logo", f); set("logo_url", url); } catch (e) { setError((e as Error).message); } finally { setUploading(null); }
  }
  async function uploadDoc() {
    const f = await pickDocument(["application/pdf", "image/*"]); if (!f) return;
    setUploading("doc");
    try { const url = await uploadJobsFile("company_document", f); verify.mutate(url); } catch (e) { setError((e as Error).message); } finally { setUploading(null); }
  }

  if (company.isLoading) return <JobsScreen title={t("jobs.company.companyProfile")} side="employer"><Loading /></JobsScreen>;
  function set(k: keyof EmployerProfile, v: string) { setSaved(false); setForm((f) => ({ ...(f ?? form), [k]: v })); }
  const status = company.data?.verification_status;

  const footer = (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, paddingBottom: 14 + insets.bottom, borderTopWidth: 1, borderTopColor: colors.hairline, backgroundColor: colors.paper }}>
      {saved ? <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}><CheckCircle2 size={16} color={colors.brand.green} /><Text variant="caption" color="green">{t("jobs.company.saved")}</Text></View> : null}
      <PillButton label={isNew ? t("jobs.company.createCompany") : t("jobs.company.saveChanges")} onPress={() => { setError(null); save.mutate(); }} loading={save.isPending}
                  disabled={!form.company_name?.trim()} style={{ flex: 1, height: 48 }} />
    </View>
  );

  return (
    <JobsScreen title={isNew ? t("jobs.company.setUpYourCompany") : t("jobs.company.companyProfile")} subtitle={t("jobs.company.whatCandidatesSeeOnYour")} side={isNew ? undefined : "employer"} footer={footer}>
      <Card style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <CompanyLogo url={form.logo_url} name={form.company_name || "?"} size={60} />
        <PillButton label={uploading === "logo" ? t("jobs.company.uploading") : t("jobs.company.uploadLogo")} tone="outline"
                    icon={uploading === "logo" ? <ActivityIndicator size="small" color={colors.brand.green} /> : <Upload size={15} color={colors.ink} />}
                    onPress={uploadLogo} disabled={Boolean(uploading)} />
      </Card>
      <Card style={{ gap: 14 }}>
        <Field label={t("jobs.company.companyName")} error={errors.company_name}><TextBox value={form.company_name ?? ""} onChangeText={(v) => set("company_name", v)} /></Field>
        <Field label={t("jobs.company.tagline")} hint={t("jobs.company.oneLineOnWhatYou")}><TextBox value={form.tagline ?? ""} onChangeText={(v) => set("tagline", v)} maxLength={200} /></Field>
        <Field label={t("jobs.company.aboutTheCompany")}><TextBox multiline value={form.description ?? ""} onChangeText={(v) => set("description", v)} /></Field>
        <Field label={t("jobs.company.industry")}><ChipGroup options={meta.data?.choices.categories ?? []} value={form.industry || undefined} onToggle={(v) => set("industry", form.industry === v ? "" : v)} /></Field>
        <Field label={t("jobs.company.companySizePeople")}><ChipGroup options={SIZES} value={form.company_size || undefined} onToggle={(v) => set("company_size", form.company_size === v ? "" : v)} /></Field>
        <Field label={t("jobs.company.website")} error={errors.website}><TextBox autoCapitalize="none" keyboardType="url" placeholder="https://" value={form.website ?? ""} onChangeText={(v) => set("website", v)} /></Field>
        <Field label={t("jobs.company.hiringContactEmail")} error={errors.contact_email}><TextBox autoCapitalize="none" keyboardType="email-address" value={form.contact_email ?? ""} onChangeText={(v) => set("contact_email", v)} /></Field>
        <Field label={t("jobs.company.headquarters")}><TextBox value={form.headquarters ?? ""} onChangeText={(v) => set("headquarters", v)} /></Field>
      </Card>
      {!isNew ? (
        <Card style={{ gap: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><ShieldCheck size={18} color={colors.brand.green} /><Text variant="title">{t("jobs.company.verification")}</Text></View>
          {status === "verified" ? <Text variant="body" color="green">{t("jobs.company.yourCompanyIsVerified")}</Text>
            : status === "pending" ? (
              <View style={{ flexDirection: "row", gap: 6 }}><Clock size={15} color={colors.ink} /><Text variant="caption" style={{ flex: 1 }}>{t("jobs.company.documentsReceivedUsuallyReviewedWithin")}</Text></View>
            ) : (
              <>
                {status === "rejected" && company.data?.verification_note ? <ErrorNote>{t("jobs.company.notApprovedVerificationNote", { verification_note: company.data.verification_note })}</ErrorNote> : null}
                <Text variant="caption" color="muted">{t("jobs.company.uploadYourCacCertificateOr")}</Text>
                <Field label={t("jobs.company.registrationNumber")}><TextBox placeholder={t("jobs.company.eGRc1234567")} value={form.registration_number ?? ""} onChangeText={(v) => set("registration_number", v)} /></Field>
                <PillButton label={uploading === "doc" || verify.isPending ? t("jobs.company.submitting") : t("jobs.company.uploadDocumentSubmit")} tone="dark"
                            onPress={uploadDoc} disabled={Boolean(uploading) || verify.isPending} />
              </>
            )}
        </Card>
      ) : null}
      <ErrorNote>{error}</ErrorNote>
      <Pressable onPress={() => router.back()} style={{ alignSelf: "center", padding: 6 }}><Text variant="caption" color="muted">{t("jobs.company.cancel")}</Text></Pressable>
    </JobsScreen>
  );
}
