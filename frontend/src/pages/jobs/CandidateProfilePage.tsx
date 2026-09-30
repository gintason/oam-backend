import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Upload, Plus, Trash2, CheckCircle2 } from "lucide-react";
import {
  JobsShell, Spinner, Field, TextInput, TextArea, Select, Chip, Toggle, Button, ErrorNote,
} from "../../components/jobs/ui";
import SkillInput from "../../components/jobs/SkillInput";
import {
  jobsApi, uploadJobsFile, jobsFieldErrors, type CandidateProfile, type Experience, type Education,
} from "../../services/jobs";
import { apiErrorMessage } from "../../lib/api";
import { useUserScope } from "../../auth/useUserScope";

/** /jobs/profile — the candidate's CV. Everything here feeds matching and 1-click apply. */
export default function CandidateProfilePage() {
  const scope = useUserScope();
  const qc = useQueryClient();
  const me = useQuery({ queryKey: ["jobs", scope, "candidate"], queryFn: jobsApi.me });
  const meta = useQuery({ queryKey: ["jobs-meta"], queryFn: jobsApi.meta, staleTime: 3600_000 });
  const [edited, setForm] = useState<CandidateProfile | null>(null);
  const form = edited ?? me.data ?? null;
  const [progress, setProgress] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>();
  const [savedAt, setSavedAt] = useState<number>();


  const save = useMutation({
    mutationFn: (p: Partial<CandidateProfile>) => jobsApi.updateMe(p),
    onSuccess: (d) => {
      setForm(d);
      setErrors({});
      setSavedAt(Date.now());
      qc.setQueryData(["jobs", scope, "candidate"], d);
      qc.invalidateQueries({ queryKey: ["jobs", scope, "recommended"] });
    },
    onError: (err) => {
      setErrors(jobsFieldErrors(err));
      setError(apiErrorMessage(err, "Couldn't save your profile."));
    },
  });

  if (!form) return <JobsShell><Spinner /></JobsShell>;
  const c = meta.data?.choices;
  const set = <K extends keyof CandidateProfile>(k: K, v: CandidateProfile[K]) =>
    setForm((f) => ({ ...(f ?? form), [k]: v }));
  const toggleIn = <K extends "desired_location_types" | "desired_employment_types" | "desired_categories">(k: K, v: string) =>
    setForm((f) => {
      const base = f ?? form;
      const cur = base[k] as string[];
      return { ...base, [k]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] };
    });

  async function onCv(file: File | undefined) {
    if (!file) return;
    setError(undefined);
    try {
      setProgress(0);
      const r = await uploadJobsFile(file, "candidate_cv", setProgress);
      save.mutate({ cv_url: r.url, cv_filename: file.name });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setProgress(null);
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    const f = form!;
    save.mutate({
      headline: f.headline, summary: f.summary, skills: f.skills,
      years_experience: Number(f.years_experience) || 0, experience_level: f.experience_level,
      experience: f.experience.filter((x) => x.title || x.company),
      education: f.education.filter((x) => x.school),
      location: f.location, country: f.country,
      desired_titles: f.desired_titles, desired_categories: f.desired_categories,
      desired_location_types: f.desired_location_types, desired_employment_types: f.desired_employment_types,
      desired_salary_min: f.desired_salary_min || null, desired_salary_currency: f.desired_salary_currency,
      desired_salary_period: f.desired_salary_period, willing_to_relocate: f.willing_to_relocate,
      open_to_work: f.open_to_work, is_searchable: f.is_searchable,
    });
  }

  return (
    <JobsShell>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-[22px] font-semibold text-ink">My CV</h1>
          <p className="text-[13.5px] text-muted">Used for 1-click apply and job matching.</p>
        </div>
        <div className="w-48">
          <div className="flex justify-between text-[12px]"><span className="text-muted">Profile strength</span><span className="font-semibold text-ink tabular">{form.completeness}%</span></div>
          <div className="mt-1 h-2 rounded-full bg-hairline"><div className="h-full rounded-full bg-brand-green transition-all" style={{ width: `${form.completeness}%` }} /></div>
        </div>
      </div>

      <form onSubmit={submit} className="mt-5 space-y-4">
        <Card title="CV file">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-hairline bg-mist p-4">
            {form.cv_url ? (
              <a href={form.cv_url} target="_blank" rel="noreferrer" className="flex min-w-0 items-center gap-2 text-[14px] font-medium text-ink hover:underline">
                <FileText size={18} className="shrink-0 text-brand-green" />
                <span className="truncate">{form.cv_filename || "Your CV"}</span>
              </a>
            ) : (
              <p className="text-[13.5px] text-muted">No CV yet — upload a PDF or Word file (max 10MB).</p>
            )}
            <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-ink px-3.5 text-[13px] font-semibold text-white hover:brightness-110">
              <Upload size={15} /> {progress != null ? `Uploading ${progress}%` : form.cv_url ? "Replace" : "Upload CV"}
              <input type="file" accept=".pdf,.doc,.docx" className="sr-only" onChange={(e) => onCv(e.target.files?.[0])} disabled={progress != null} />
            </label>
          </div>
        </Card>

        <Card title="About you">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Headline" htmlFor="headline" hint='e.g. "React Native developer · 5 years in fintech"' error={errors.headline}>
                <TextInput id="headline" value={form.headline} onChange={(e) => set("headline", e.target.value)} maxLength={160} />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Summary" htmlFor="summary" error={errors.summary}>
                <TextArea id="summary" rows={4} value={form.summary} onChange={(e) => set("summary", e.target.value)} />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Skills" htmlFor="skills" hint="Add at least 3 — they drive your match score." error={errors.skills}>
                <SkillInput id="skills" value={form.skills} onChange={(v) => set("skills", v)} max={50} />
              </Field>
            </div>
            <Field label="Years of experience" htmlFor="years">
              <TextInput id="years" inputMode="numeric" value={String(form.years_experience)}
                         onChange={(e) => set("years_experience", Number(e.target.value.replace(/\D/g, "")) || 0)} />
            </Field>
            <Field label="Level" htmlFor="level">
              <Select id="level" value={form.experience_level} onChange={(e) => set("experience_level", e.target.value as CandidateProfile["experience_level"])}>
                <option value="">Select…</option>
                {(c?.experience_levels ?? []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Select>
            </Field>
            <Field label="City" htmlFor="city"><TextInput id="city" value={form.location} onChange={(e) => set("location", e.target.value)} /></Field>
            <Field label="Country code" htmlFor="country" hint="Two letters, e.g. NG">
              <TextInput id="country" value={form.country} maxLength={2} onChange={(e) => set("country", e.target.value.toUpperCase())} />
            </Field>
          </div>
        </Card>

        <Card title="Experience" action={
          <Button size="sm" variant="ghost" onClick={() => set("experience", [...form.experience, { title: "", company: "" }])}>
            <Plus size={14} /> Add role
          </Button>}>
          {form.experience.length === 0 && <p className="text-[13px] text-muted">Add your recent roles.</p>}
          <div className="space-y-3">
            {form.experience.map((x, i) => (
              <Repeat key={i} onRemove={() => set("experience", form.experience.filter((_, j) => j !== i))}>
                <TextInput placeholder="Job title" value={x.title} onChange={(e) => set("experience", upd(form.experience, i, { title: e.target.value }))} aria-label="Job title" />
                <TextInput placeholder="Company" value={x.company} onChange={(e) => set("experience", upd(form.experience, i, { company: e.target.value }))} aria-label="Company" />
                <TextInput placeholder="Start (e.g. 2021)" value={x.start ?? ""} onChange={(e) => set("experience", upd(form.experience, i, { start: e.target.value }))} aria-label="Start" />
                <TextInput placeholder="End (or 'Present')" value={x.end ?? ""} onChange={(e) => set("experience", upd(form.experience, i, { end: e.target.value }))} aria-label="End" />
                <div className="sm:col-span-2">
                  <TextArea rows={2} placeholder="What you did" value={x.description ?? ""} onChange={(e) => set("experience", upd(form.experience, i, { description: e.target.value }))} aria-label="Description" />
                </div>
              </Repeat>
            ))}
          </div>
        </Card>

        <Card title="Education" action={
          <Button size="sm" variant="ghost" onClick={() => set("education", [...form.education, { school: "" }])}><Plus size={14} /> Add</Button>}>
          {form.education.length === 0 && <p className="text-[13px] text-muted">Schools, degrees, certificates.</p>}
          <div className="space-y-3">
            {form.education.map((x, i) => (
              <Repeat key={i} onRemove={() => set("education", form.education.filter((_, j) => j !== i))}>
                <TextInput placeholder="School" value={x.school} onChange={(e) => set("education", upd<Education>(form.education, i, { school: e.target.value }))} aria-label="School" />
                <TextInput placeholder="Qualification" value={x.qualification ?? ""} onChange={(e) => set("education", upd<Education>(form.education, i, { qualification: e.target.value }))} aria-label="Qualification" />
              </Repeat>
            ))}
          </div>
        </Card>

        <Card title="What you're looking for">
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-[12.5px] font-semibold text-ink">Work setting</p>
              <div className="flex flex-wrap gap-1.5">
                {(c?.location_types ?? []).map((o) => (
                  <Chip key={o.value} active={form.desired_location_types.includes(o.value as never)} onClick={() => toggleIn("desired_location_types", o.value)}>{o.label}</Chip>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-[12.5px] font-semibold text-ink">Job type</p>
              <div className="flex flex-wrap gap-1.5">
                {(c?.employment_types ?? []).map((o) => (
                  <Chip key={o.value} active={form.desired_employment_types.includes(o.value as never)} onClick={() => toggleIn("desired_employment_types", o.value)}>{o.label}</Chip>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-[12.5px] font-semibold text-ink">Categories</p>
              <div className="flex flex-wrap gap-1.5">
                {(c?.categories ?? []).map((o) => (
                  <Chip key={o.value} active={form.desired_categories.includes(o.value)} onClick={() => toggleIn("desired_categories", o.value)}>{o.label}</Chip>
                ))}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Minimum pay" htmlFor="minpay">
                <TextInput id="minpay" inputMode="numeric" value={form.desired_salary_min ?? ""} onChange={(e) => set("desired_salary_min", e.target.value.replace(/[^\d.]/g, ""))} />
              </Field>
              <Field label="Currency" htmlFor="ccy">
                <Select id="ccy" value={form.desired_salary_currency} onChange={(e) => set("desired_salary_currency", e.target.value)}>
                  {["NGN", "USD", "GBP", "EUR"].map((x) => <option key={x}>{x}</option>)}
                </Select>
              </Field>
              <Field label="Per" htmlFor="per">
                <Select id="per" value={form.desired_salary_period} onChange={(e) => set("desired_salary_period", e.target.value as CandidateProfile["desired_salary_period"])}>
                  {(c?.salary_periods ?? []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </Select>
              </Field>
            </div>
            <div className="divide-y divide-hairline">
              <Toggle checked={form.open_to_work} onChange={(v) => set("open_to_work", v)} label="Open to work" />
              <Toggle checked={form.is_searchable} onChange={(v) => set("is_searchable", v)} label="Let employers find my profile" />
              <Toggle checked={form.willing_to_relocate} onChange={(v) => set("willing_to_relocate", v)} label="Willing to relocate" />
            </div>
          </div>
        </Card>

        <ErrorNote>{error}</ErrorNote>
        <div className="sticky bottom-[70px] z-20 flex items-center justify-end gap-3 rounded-xl border border-hairline bg-paper/95 p-3 backdrop-blur md:bottom-3">
          {savedAt && !save.isPending && (
            <span className="inline-flex items-center gap-1 text-[13px] text-brand-green"><CheckCircle2 size={15} /> Saved</span>
          )}
          <Button type="submit" loading={save.isPending}>Save CV</Button>
        </div>
      </form>
    </JobsShell>
  );
}

function upd<T extends Experience | Education>(list: T[], i: number, patch: Partial<T>): T[] {
  return list.map((x, j) => (j === i ? { ...x, ...patch } : x));
}

function Card({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-hairline bg-paper p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-[16px] font-semibold text-ink">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Repeat({ children, onRemove }: { children: React.ReactNode; onRemove: () => void }) {
  return (
    <div className="relative grid gap-2 rounded-xl border border-hairline p-3 pr-10 sm:grid-cols-2">
      {children}
      <button type="button" onClick={onRemove} className="absolute right-2 top-2 rounded-lg p-1.5 text-muted hover:bg-mist hover:text-danger" aria-label="Remove">
        <Trash2 size={15} />
      </button>
    </div>
  );
}
