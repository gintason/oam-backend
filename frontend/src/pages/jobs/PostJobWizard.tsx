import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronLeft, ChevronRight, Plus, Trash2, MapPin, Briefcase } from "lucide-react";
import {
  JobsShell, Spinner, Field, TextInput, TextArea, Select, Chip, Toggle, Button, ErrorNote,
} from "../../components/jobs/ui";
import SkillInput from "../../components/jobs/SkillInput";
import UpgradeSheet from "../../components/jobs/UpgradeSheet";
import {
  jobsApi, jobsErrorCode, jobsFieldErrors, formatSalary, UPGRADE_CODES, LOCATION_LABEL,
  EMPLOYMENT_LABEL, type JobDraft, type ScreeningQuestion,
} from "../../services/jobs";
import { apiErrorMessage } from "../../lib/api";
import { useUserScope } from "../../auth/useUserScope";
import { useTranslation } from "react-i18next";
import { useJobsMeta } from "../../services/jobsI18n";

const STEPS = ["Basics", "Description", "Location & pay", "Applications", "Review"] as const;

// Which step owns which field — so a server error can jump to the right place.
const FIELD_STEP: Record<string, number> = {
  title: 0, category: 0, employment_type: 0, experience_level: 0, openings: 0,
  description: 1, responsibilities: 1, requirements: 1, benefits: 1, skills: 1,
  location_type: 2, location: 2, country: 2, salary_min: 2, salary_max: 2, min_years_experience: 2,
  apply_method: 3, external_apply_url: 3, screening_questions: 3,
};

const BLANK: JobDraft = {
  title: "", category: "technology", employment_type: "full_time", experience_level: "mid",
  openings: 1, description: "", responsibilities: "", requirements: "", benefits: "", skills: [],
  location_type: "on_site", location: "", country: "NG", salary_min: null, salary_max: null,
  salary_currency: "NGN", salary_period: "month", salary_visible: true, min_years_experience: 0,
  apply_method: "in_app", external_apply_url: "", screening_questions: [],
};

/** /jobs/employer/post  and  /jobs/employer/jobs/:id/edit */
export default function PostJobWizard() {
  const { t } = useTranslation();
  const { id } = useParams();
  const scope = useUserScope();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [edited, setDraft] = useState<JobDraft | null>(null);
  const [jobId, setJobId] = useState<string | undefined>(id);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>();
  const [upgrade, setUpgrade] = useState<string | null>(null);

  const meta = useJobsMeta();
  const existing = useQuery({ queryKey: ["jobs", scope, "owned", id], queryFn: () => jobsApi.ownedJob(id!), enabled: Boolean(id) });
  const status = existing.data?.status;

  const loaded = useMemo<JobDraft | null>(() => {
    if (!existing.data) return null;
    const { id: _i, slug: _s, ...rest } = existing.data;
    void _i; void _s;
    return rest;
  }, [existing.data]);
  const draft: JobDraft = edited ?? loaded ?? BLANK;

  const set = <K extends keyof JobDraft>(k: K, v: JobDraft[K]) =>
    setDraft((d) => ({ ...(d ?? draft), [k]: v }));
  const c = meta.data?.choices;

  function fail(err: unknown) {
    const code = jobsErrorCode(err);
    if (code && UPGRADE_CODES.has(code)) { setUpgrade(code); return; }
    const fe = jobsFieldErrors(err);
    setErrors(fe);
    const first = Object.keys(fe).map((k) => FIELD_STEP[k]).filter((n) => n != null).sort()[0];
    if (first != null) setStep(first);
    setError(apiErrorMessage(err, t("jobs.postJobWizard.pleaseCheckTheHighlightedFields")));
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["jobs"] }); navigate("/jobs/employer"); },
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
      navigate(j.status === "active" ? `/jobs/employer/jobs/${j.id}?published=1` : "/jobs/employer");
    },
    onError: fail,
  });

  function next() {
    setError(undefined);
    const e: Record<string, string> = {};
    if (step === 0 && (draft.title ?? "").trim().length < 4) e.title = t("jobs.postJobWizard.addAJobTitle");
    if (step === 1 && (draft.description ?? "").trim().length < 50) e.description = t("jobs.postJobWizard.describeTheRoleInAt");
    if (step === 2 && draft.location_type !== "remote" && !draft.location && !draft.country) e.location = t("jobs.postJobWizard.whereIsTheJob");
    if (step === 2 && draft.salary_min && draft.salary_max && Number(draft.salary_min) > Number(draft.salary_max)) e.salary_max = t("jobs.postJobWizard.mustBeAtLeastThe");
    if (step === 3 && draft.apply_method === "external" && !draft.external_apply_url) e.external_apply_url = t("jobs.postJobWizard.addTheApplicationLink");
    setErrors(e);
    if (!Object.keys(e).length) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  if (id && existing.isLoading) return <JobsShell side="employer"><Spinner /></JobsShell>;
  const isLive = status === "active";
  const questions = draft.screening_questions ?? [];

  return (
    <JobsShell side="employer">
      <h1 className="font-display text-[22px] font-semibold text-ink">{id ? t("jobs.postJobWizard.editJob") : t("jobs.postJobWizard.postAJob")}</h1>

      {/* stepper */}
      <ol className="mt-4 flex gap-1.5 overflow-x-auto" aria-label={t("jobs.postJobWizard.steps")}>
        {STEPS.map((s, i) => (
          <li key={s} className="flex-1">
            <button type="button" onClick={() => i < step && setStep(i)} disabled={i > step}
                    aria-current={i === step ? "step" : undefined}
                    className="w-full text-left disabled:cursor-default">
              <span className={`block h-1 rounded-full ${i <= step ? "bg-brand-green" : "bg-hairline"}`} />
              <span className={`mt-1.5 flex items-center gap-1 whitespace-nowrap text-[12px] font-medium ${i === step ? "text-ink" : "text-muted"}`}>
                {i < step && <Check size={12} className="text-brand-green" />}{s}
              </span>
            </button>
          </li>
        ))}
      </ol>

      <section className="mt-5 rounded-2xl border border-hairline bg-paper p-4 sm:p-6">
        {step === 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label={t("jobs.postJobWizard.jobTitle")} htmlFor="title" error={errors.title} hint={t("jobs.postJobWizard.beSpecificSeniorAccountantNot")}>
                <TextInput id="title" autoFocus value={draft.title} onChange={(e) => set("title", e.target.value)} maxLength={160} />
              </Field>
            </div>
            <Field label={t("jobs.postJobWizard.category")} htmlFor="cat">
              <Select id="cat" value={draft.category} onChange={(e) => set("category", e.target.value)}>
                {(c?.categories ?? []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Select>
            </Field>
            <Field label={t("jobs.postJobWizard.openings")} htmlFor="openings">
              <TextInput id="openings" inputMode="numeric" value={String(draft.openings ?? 1)} onChange={(e) => set("openings", Math.max(1, Number(e.target.value.replace(/\D/g, "")) || 1))} />
            </Field>
            <div className="sm:col-span-2">
              <p className="mb-2 text-[12.5px] font-semibold text-ink">{t("jobs.postJobWizard.jobType")}</p>
              <div className="flex flex-wrap gap-1.5">
                {(c?.employment_types ?? []).map((o) => (
                  <Chip key={o.value} active={draft.employment_type === o.value} onClick={() => set("employment_type", o.value as JobDraft["employment_type"])}>{o.label}</Chip>
                ))}
              </div>
            </div>
            <div className="sm:col-span-2">
              <p className="mb-2 text-[12.5px] font-semibold text-ink">{t("jobs.postJobWizard.experienceLevel")}</p>
              <div className="flex flex-wrap gap-1.5">
                {(c?.experience_levels ?? []).map((o) => (
                  <Chip key={o.value} active={draft.experience_level === o.value} onClick={() => set("experience_level", o.value as JobDraft["experience_level"])}>{o.label}</Chip>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <Field label={t("jobs.postJobWizard.aboutTheRole")} htmlFor="desc" error={errors.description}
                   hint={t("jobs.postJobWizard.charsMinimum", { n: (draft.description ?? "").trim().length })}>
              <TextArea id="desc" rows={7} value={draft.description} onChange={(e) => set("description", e.target.value)} />
            </Field>
            <Field label={t("jobs.postJobWizard.responsibilities")} htmlFor="resp" hint={t("jobs.postJobWizard.onePerLineWorksWell")}>
              <TextArea id="resp" rows={4} value={draft.responsibilities} onChange={(e) => set("responsibilities", e.target.value)} />
            </Field>
            <Field label={t("jobs.postJobWizard.requirements")} htmlFor="req">
              <TextArea id="req" rows={4} value={draft.requirements} onChange={(e) => set("requirements", e.target.value)} />
            </Field>
            <Field label={t("jobs.postJobWizard.benefits")} htmlFor="ben">
              <TextArea id="ben" rows={3} value={draft.benefits} onChange={(e) => set("benefits", e.target.value)} />
            </Field>
            <Field label={t("jobs.postJobWizard.skills")} htmlFor="skills" hint={t("jobs.postJobWizard.usedToMatchCandidatesAdd")} error={errors.skills}>
              <SkillInput id="skills" value={draft.skills ?? []} onChange={(v) => set("skills", v)} />
            </Field>
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <p className="mb-2 text-[12.5px] font-semibold text-ink">{t("jobs.postJobWizard.workSetting")}</p>
              <div className="flex flex-wrap gap-1.5">
                {(c?.location_types ?? []).map((o) => (
                  <Chip key={o.value} active={draft.location_type === o.value} onClick={() => set("location_type", o.value as JobDraft["location_type"])}>{o.label}</Chip>
                ))}
              </div>
            </div>
            <Field label={draft.location_type === "remote" ? t("jobs.postJobWizard.cityOptional") : t("jobs.postJobWizard.city")} htmlFor="loc" error={errors.location}>
              <TextInput id="loc" value={draft.location} onChange={(e) => set("location", e.target.value)} placeholder={t("jobs.postJobWizard.eGLagos")} />
            </Field>
            <Field label={t("jobs.postJobWizard.countryCode")} htmlFor="country" hint={t("jobs.postJobWizard.eGNg")}>
              <TextInput id="country" maxLength={2} value={draft.country} onChange={(e) => set("country", e.target.value.toUpperCase())} />
            </Field>
            <Field label={t("jobs.postJobWizard.minimumYearsOfExperience")} htmlFor="yrs">
              <TextInput id="yrs" inputMode="numeric" value={String(draft.min_years_experience ?? 0)} onChange={(e) => set("min_years_experience", Number(e.target.value.replace(/\D/g, "")) || 0)} />
            </Field>
            <div />
            <Field label={t("jobs.postJobWizard.salaryFrom")} htmlFor="smin" error={errors.salary_min}>
              <TextInput id="smin" inputMode="numeric" value={draft.salary_min ?? ""} onChange={(e) => set("salary_min", e.target.value.replace(/[^\d.]/g, "") || null)} />
            </Field>
            <Field label={t("jobs.postJobWizard.salaryTo")} htmlFor="smax" error={errors.salary_max}>
              <TextInput id="smax" inputMode="numeric" value={draft.salary_max ?? ""} onChange={(e) => set("salary_max", e.target.value.replace(/[^\d.]/g, "") || null)} />
            </Field>
            <Field label={t("jobs.postJobWizard.currency")} htmlFor="sccy">
              <Select id="sccy" value={draft.salary_currency} onChange={(e) => set("salary_currency", e.target.value)}>
                {["NGN", "USD", "GBP", "EUR"].map((x) => <option key={x}>{x}</option>)}
              </Select>
            </Field>
            <Field label={t("jobs.postJobWizard.per")} htmlFor="sper">
              <Select id="sper" value={draft.salary_period} onChange={(e) => set("salary_period", e.target.value as JobDraft["salary_period"])}>
                {(c?.salary_periods ?? []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Select>
            </Field>
            <div className="sm:col-span-2">
              <Toggle checked={Boolean(draft.salary_visible)} onChange={(v) => set("salary_visible", v)} label={t("jobs.postJobWizard.showSalaryOnTheListing")} />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <div>
              <p className="mb-2 text-[12.5px] font-semibold text-ink">{t("jobs.postJobWizard.howShouldPeopleApply")}</p>
              <div className="flex flex-wrap gap-1.5">
                <Chip active={draft.apply_method === "in_app"} onClick={() => set("apply_method", "in_app")}>{t("jobs.postJobWizard.onOamRecommended")}</Chip>
                <Chip active={draft.apply_method === "external"} onClick={() => set("apply_method", "external")}>{t("jobs.postJobWizard.onMyWebsite")}</Chip>
              </div>
              <p className="mt-2 text-[12.5px] text-muted">
                {draft.apply_method === "in_app"
                  ? t("jobs.postJobWizard.candidatesApplyInOneTap")
                  : t("jobs.postJobWizard.candidatesAreSentToYour")}
              </p>
            </div>
            {draft.apply_method === "external" && (
              <Field label={t("jobs.postJobWizard.applicationLink")} htmlFor="ext" error={errors.external_apply_url}>
                <TextInput id="ext" type="url" placeholder="https://" value={draft.external_apply_url} onChange={(e) => set("external_apply_url", e.target.value)} />
              </Field>
            )}
            {draft.apply_method === "in_app" && (
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[12.5px] font-semibold text-ink">{t("jobs.postJobWizard.screeningQuestionsOptionalUpTo")}</p>
                  <Button size="sm" variant="ghost" disabled={questions.length >= 10}
                          onClick={() => set("screening_questions", [...questions, { id: String(Date.now()), question: "", required: false }])}>
                    <Plus size={14} />{" "}{t("jobs.postJobWizard.addQuestion")}
                  </Button>
                </div>
                <div className="space-y-2">
                  {questions.map((q, i) => (
                    <div key={q.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-hairline p-2.5">
                      <TextInput className="min-w-[12rem] flex-1" placeholder={t("jobs.postJobWizard.eGDoYouHave")}
                                 value={q.question} aria-label={t("jobs.postJobWizard.questionN", { n: i + 1 })}
                                 onChange={(e) => set("screening_questions", questions.map((x, j) => j === i ? { ...x, question: e.target.value } : x))} />
                      <label className="flex items-center gap-1.5 text-[12.5px] text-ink">
                        <input type="checkbox" checked={q.required}
                               onChange={(e) => set("screening_questions", questions.map((x, j) => j === i ? { ...x, required: e.target.checked } : x))} />
                        {t("jobs.postJobWizard.required")}
                      </label>
                      <button type="button" onClick={() => set("screening_questions", questions.filter((_, j) => j !== i) as ScreeningQuestion[])}
                              className="rounded-lg p-1.5 text-muted hover:bg-mist hover:text-danger" aria-label={t("jobs.postJobWizard.removeQuestion")}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {step === 4 && (
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-wide text-muted">{t("jobs.postJobWizard.preview")}</p>
            <h2 className="mt-1 font-display text-[20px] font-semibold text-ink">{draft.title || t("jobs.postJobWizard.untitledJob")}</h2>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted">
              <span className="inline-flex items-center gap-1"><MapPin size={14} /> {LOCATION_LABEL[draft.location_type ?? "on_site"]}{draft.location ? ` · ${draft.location}` : ""}</span>
              <span className="inline-flex items-center gap-1"><Briefcase size={14} /> {EMPLOYMENT_LABEL[draft.employment_type ?? "full_time"]}</span>
            </div>
            {draft.salary_visible && (draft.salary_min || draft.salary_max) && (
              <p className="mt-2 text-[15px] font-semibold text-ink">
                {formatSalary({ min: draft.salary_min ?? null, max: draft.salary_max ?? null, currency: draft.salary_currency ?? "NGN", period: draft.salary_period ?? "month" })}
              </p>
            )}
            <p className="mt-4 line-clamp-6 whitespace-pre-line text-[14px] leading-relaxed text-ink/90">{draft.description}</p>
            {(draft.skills?.length ?? 0) > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">{draft.skills!.map((s) => <span key={s} className="rounded-md bg-mist px-2 py-1 text-[12px] text-ink">{s}</span>)}</div>
            )}
            <p className="mt-5 rounded-xl bg-mist p-3 text-[12.5px] text-muted">
              {t("jobs.postJobWizard.listingsAreScreenedAutomaticallyAnything")}
            </p>
          </div>
        )}
      </section>

      <div className="mt-3"><ErrorNote>{error}</ErrorNote></div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
          <ChevronLeft size={15} />{" "}{t("jobs.postJobWizard.back")}
        </Button>
        <div className="flex gap-2">
          {!isLive && (
            <Button variant="secondary" onClick={() => saveDraft.mutate()} loading={saveDraft.isPending}>{t("jobs.postJobWizard.saveDraft")}</Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button onClick={next}>{t("jobs.postJobWizard.next")}{" "}<ChevronRight size={15} /></Button>
          ) : (
            <Button onClick={() => publish.mutate()} loading={publish.isPending}>
              {isLive ? t("jobs.postJobWizard.saveChanges") : t("jobs.postJobWizard.publishJob")}
            </Button>
          )}
        </div>
      </div>

      <UpgradeSheet open={Boolean(upgrade)} reason={upgrade ?? undefined}
                    onClose={() => { setUpgrade(null); navigate("/jobs/employer"); }} />
    </JobsShell>
  );
}
