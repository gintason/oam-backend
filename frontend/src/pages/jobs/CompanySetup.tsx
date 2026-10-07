import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Upload, ShieldCheck, Clock, CheckCircle2 } from "lucide-react";
import {
  JobsShell, Spinner, Field, TextInput, TextArea, Select, Button, ErrorNote, CompanyLogo,
} from "../../components/jobs/ui";
import { jobsApi, uploadJobsFile, jobsFieldErrors, jobsErrorCode, type EmployerProfile } from "../../services/jobs";
import { apiErrorMessage } from "../../lib/api";
import { useUserScope } from "../../auth/useUserScope";
import { useTranslation } from "react-i18next";
import { useJobsMeta } from "../../services/jobsI18n";

const SIZES = ["1", "2-10", "11-50", "51-200", "201-1000", "1000+"];
const EMPTY: Partial<EmployerProfile> = {
  company_name: "", tagline: "", description: "", industry: "", company_size: "", website: "",
  contact_email: "", headquarters: "", country: "NG", logo_url: "", cover_url: "", brand_color: "",
};

/** /jobs/employer/company — create or edit the company page, and submit verification. */
export default function CompanySetup() {
  const { t } = useTranslation();
  const scope = useUserScope();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const company = useQuery({ queryKey: ["jobs", scope, "company"], queryFn: jobsApi.myCompany, retry: false });
  const meta = useJobsMeta();
  const isNew = company.isError && jobsErrorCode(company.error) === "no_employer_profile";
  const [edited, setForm] = useState<Partial<EmployerProfile> | null>(null);
  const form = edited ?? company.data ?? EMPTY;
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>();
  const [uploading, setUploading] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);


  const save = useMutation({
    mutationFn: () => {
      const body = { ...form };
      delete body.usage;
      return isNew ? jobsApi.createCompany(body) : jobsApi.updateCompany(body);
    },
    onSuccess: (d) => {
      qc.setQueryData(["jobs", scope, "company"], d);
      qc.invalidateQueries({ queryKey: ["jobs", scope, "company"] });
      setErrors({});
      setSaved(true);
      if (isNew || params.get("new")) navigate("/jobs/employer", { replace: true });
    },
    onError: (err) => { setErrors(jobsFieldErrors(err)); setError(apiErrorMessage(err, t("jobs.companySetup.couldnTSave"))); },
  });

  const verify = useMutation({
    mutationFn: (doc: string) => jobsApi.submitVerification({
      verification_document_url: doc, registration_number: form.registration_number,
    }),
    onSuccess: (d) => qc.setQueryData(["jobs", scope, "company"], d),
    onError: (err) => setError(apiErrorMessage(err, t("jobs.companySetup.couldnTSubmitForVerification"))),
  });

  async function onUpload(file: File | undefined, kind: "company_logo" | "company_cover" | "company_document") {
    if (!file) return;
    setError(undefined);
    setUploading(kind);
    try {
      const r = await uploadJobsFile(file, kind);
      if (kind === "company_document") verify.mutate(r.url);
      else setForm((f) => ({ ...(f ?? form), [kind === "company_logo" ? "logo_url" : "cover_url"]: r.url }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(null);
    }
  }

  if (company.isLoading) return <JobsShell side="employer"><Spinner /></JobsShell>;
  const set = (k: keyof EmployerProfile, v: string) => { setSaved(false); setForm((f) => ({ ...(f ?? form), [k]: v })); };
  const status = company.data?.verification_status;

  return (
    <JobsShell side={isNew ? "none" : "employer"}>
      <h1 className="font-display text-[22px] font-semibold text-ink">{isNew ? t("jobs.companySetup.setUpYourCompany") : t("jobs.companySetup.companyProfile")}</h1>
      <p className="text-[13.5px] text-muted">{t("jobs.companySetup.thisIsWhatCandidatesSee")}</p>

      <form onSubmit={(e) => { e.preventDefault(); setError(undefined); save.mutate(); }} className="mt-5 space-y-4">
        <section className="rounded-2xl border border-hairline bg-paper p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-4">
            <CompanyLogo url={form.logo_url} name={form.company_name || "?"} size={64} />
            <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-hairline px-3 text-[13px] font-medium text-ink hover:bg-mist">
              <Upload size={14} /> {uploading === "company_logo" ? t("jobs.companySetup.uploading") : t("jobs.companySetup.uploadLogo")}
              <input type="file" accept="image/*" className="sr-only" onChange={(e) => onUpload(e.target.files?.[0], "company_logo")} />
            </label>
            <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-hairline px-3 text-[13px] font-medium text-ink hover:bg-mist">
              <Upload size={14} /> {uploading === "company_cover" ? t("jobs.companySetup.uploading") : form.cover_url ? t("jobs.companySetup.changeCover") : t("jobs.companySetup.uploadCoverImage")}
              <input type="file" accept="image/*" className="sr-only" onChange={(e) => onUpload(e.target.files?.[0], "company_cover")} />
            </label>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label={t("jobs.companySetup.companyName")} htmlFor="cname" error={errors.company_name}>
                <TextInput id="cname" required value={form.company_name ?? ""} onChange={(e) => set("company_name", e.target.value)} />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label={t("jobs.companySetup.tagline")} htmlFor="tagline" hint={t("jobs.companySetup.oneLineOnWhatYou")}>
                <TextInput id="tagline" value={form.tagline ?? ""} onChange={(e) => set("tagline", e.target.value)} maxLength={200} />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label={t("jobs.companySetup.aboutTheCompany")} htmlFor="about">
                <TextArea id="about" rows={5} value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} />
              </Field>
            </div>
            <Field label={t("jobs.companySetup.industry")} htmlFor="industry">
              <Select id="industry" value={form.industry ?? ""} onChange={(e) => set("industry", e.target.value)}>
                <option value="">{t("jobs.companySetup.select")}</option>
                {(meta.data?.choices.categories ?? []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Select>
            </Field>
            <Field label={t("jobs.companySetup.companySize")} htmlFor="size">
              <Select id="size" value={form.company_size ?? ""} onChange={(e) => set("company_size", e.target.value)}>
                <option value="">{t("jobs.companySetup.select")}</option>
                {SIZES.map((s) => <option key={s} value={s}>{s}{" "}{t("jobs.companySetup.people")}</option>)}
              </Select>
            </Field>
            <Field label={t("jobs.companySetup.website")} htmlFor="web" error={errors.website}>
              <TextInput id="web" type="url" placeholder="https://" value={form.website ?? ""} onChange={(e) => set("website", e.target.value)} />
            </Field>
            <Field label={t("jobs.companySetup.hiringContactEmail")} htmlFor="email" error={errors.contact_email}>
              <TextInput id="email" type="email" value={form.contact_email ?? ""} onChange={(e) => set("contact_email", e.target.value)} />
            </Field>
            <Field label={t("jobs.companySetup.headquarters")} htmlFor="hq"><TextInput id="hq" value={form.headquarters ?? ""} onChange={(e) => set("headquarters", e.target.value)} /></Field>
            <Field label={t("jobs.companySetup.countryCode")} htmlFor="cc" hint={t("jobs.companySetup.eGNg")}><TextInput id="cc" maxLength={2} value={form.country ?? ""} onChange={(e) => set("country", e.target.value.toUpperCase())} /></Field>
            <Field label={t("jobs.companySetup.brandColour")} htmlFor="brand" error={errors.brand_color} hint={t("jobs.companySetup.hexEG0b7327")}>
              <div className="flex gap-2">
                <input type="color" aria-label={t("jobs.companySetup.pickColour")} value={form.brand_color || "#0B7327"} onChange={(e) => set("brand_color", e.target.value.toUpperCase())}
                       className="h-10 w-12 cursor-pointer rounded-lg border border-hairline bg-paper" />
                <TextInput id="brand" value={form.brand_color ?? ""} onChange={(e) => set("brand_color", e.target.value)} />
              </div>
            </Field>
          </div>
        </section>

        <ErrorNote>{error}</ErrorNote>
        <div className="flex items-center justify-end gap-3">
          {saved && <span className="inline-flex items-center gap-1 text-[13px] text-brand-green"><CheckCircle2 size={15} />{" "}{t("jobs.companySetup.saved")}</span>}
          <Button type="submit" loading={save.isPending}>{isNew ? t("jobs.companySetup.createCompany") : t("jobs.companySetup.saveChanges")}</Button>
        </div>
      </form>

      {!isNew && (
        <section id="verify" className="mt-6 rounded-2xl border border-hairline bg-paper p-4 sm:p-5">
          <h2 className="flex items-center gap-2 font-display text-[16px] font-semibold text-ink"><ShieldCheck size={18} className="text-brand-green" />{" "}{t("jobs.companySetup.verification")}</h2>
          {status === "verified" ? (
            <p className="mt-2 text-[13.5px] text-brand-green">{t("jobs.companySetup.yourCompanyIsVerified")}</p>
          ) : status === "pending" ? (
            <p className="mt-2 inline-flex items-center gap-1.5 text-[13.5px] text-ink"><Clock size={15} />{" "}{t("jobs.companySetup.documentsReceivedUsuallyReviewedWithin")}</p>
          ) : (
            <div className="mt-3 space-y-3">
              {status === "rejected" && company.data?.verification_note && (
                <ErrorNote>{t("jobs.companySetup.notApproved")}{" "}{company.data.verification_note}</ErrorNote>
              )}
              <p className="text-[13.5px] text-muted">{t("jobs.companySetup.uploadYourCacCertificateOr")}</p>
              <Field label={t("jobs.companySetup.registrationNumber")} htmlFor="rc">
                <TextInput id="rc" placeholder={t("jobs.companySetup.eGRc1234567")} value={form.registration_number ?? ""} onChange={(e) => set("registration_number", e.target.value)} />
              </Field>
              <label className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-lg bg-ink px-4 text-[13.5px] font-semibold text-white">
                <Upload size={15} /> {uploading === "company_document" || verify.isPending ? t("jobs.companySetup.submitting") : t("jobs.companySetup.uploadDocumentSubmit")}
                <input type="file" accept="image/*,.pdf" className="sr-only" onChange={(e) => onUpload(e.target.files?.[0], "company_document")} />
              </label>
            </div>
          )}
        </section>
      )}
    </JobsShell>
  );
}
