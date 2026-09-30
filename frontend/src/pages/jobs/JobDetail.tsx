import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, MapPin, Briefcase, GraduationCap, Users, Bookmark, BookmarkCheck, Flag,
  ExternalLink, CheckCircle2, BadgeCheck, Share2, X, FileText, Upload,
} from "lucide-react";
import {
  JobsShell, Spinner, Button, CompanyLogo, MatchBadge, ErrorNote, TextArea, Field, TextInput,
} from "../../components/jobs/ui";
import {
  jobsApi, uploadJobsFile, formatSalary, timeAgo, jobsErrorCode, LOCATION_LABEL,
  EMPLOYMENT_LABEL, LEVEL_LABEL, type JobDetail as Job, type Answer,
} from "../../services/jobs";
import { apiErrorMessage } from "../../lib/api";
import { useUserScope } from "../../auth/useUserScope";

export default function JobDetail() {
  const { id = "" } = useParams();
  const scope = useUserScope();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [applyOpen, setApplyOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [applied, setApplied] = useState(false);
  const [error, setError] = useState<string>();

  const job = useQuery({ queryKey: ["jobs", scope, "job", id], queryFn: () => jobsApi.job(id) });
  const me = useQuery({ queryKey: ["jobs", scope, "candidate"], queryFn: jobsApi.me });
  const [saved, setSaved] = useState<boolean | null>(null);
  const isSaved = saved ?? Boolean(job.data?.is_saved);

  const save = useMutation({
    mutationFn: () => (isSaved ? jobsApi.unsave(id) : jobsApi.save(id)),
    onMutate: () => setSaved(!isSaved),
    onError: () => setSaved(isSaved),
  });

  const quickApply = useMutation({
    mutationFn: () => jobsApi.apply({ job: id }),
    onSuccess: () => {
      setApplied(true);
      qc.invalidateQueries({ queryKey: ["jobs"] });
    },
    onError: (err) => {
      if (jobsErrorCode(err) === "cv_required" || jobsErrorCode(err) === "answers_required") setApplyOpen(true);
      else setError(apiErrorMessage(err, "Couldn't send your application."));
    },
  });

  if (job.isLoading) return <JobsShell><Spinner /></JobsShell>;
  if (!job.data) {
    return (
      <JobsShell>
        <p className="rounded-2xl border border-hairline bg-paper p-6 text-center text-[14px] text-muted">
          This job is no longer available.
        </p>
      </JobsShell>
    );
  }
  const j = job.data;
  const hasApplied = applied || Boolean(j.has_applied);
  const needsForm = (j.screening_questions?.length ?? 0) > 0 || !me.data?.cv_url;
  const salary = formatSalary(j.salary);
  const place = [j.location, j.country].filter(Boolean).join(", ");

  function onApply() {
    setError(undefined);
    if (j.apply_method === "external") {
      window.open(j.external_apply_url, "_blank", "noopener,noreferrer");
      return;
    }
    if (needsForm) setApplyOpen(true);
    else quickApply.mutate();
  }

  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: j.title, text: `${j.title} at ${j.employer.company_name}`, url }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(url);
    }
  }

  const ApplyButton = (
    hasApplied ? (
      <Button variant="secondary" to="/jobs/applications" className="w-full sm:w-auto">
        <CheckCircle2 size={16} className="text-brand-green" /> Applied · Track status
      </Button>
    ) : (
      <Button onClick={onApply} loading={quickApply.isPending} className="w-full sm:w-auto">
        {j.apply_method === "external" ? <>Apply on company site <ExternalLink size={14} /></>
          : needsForm ? "Apply now" : "1-click apply"}
      </Button>
    )
  );

  return (
    <JobsShell>
      <button onClick={() => navigate(-1)} className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink">
        <ArrowLeft size={15} /> Back
      </button>

      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <article className="space-y-4">
          <header className="rounded-2xl border border-hairline bg-paper p-5 sm:p-6">
            <div className="flex gap-4">
              <CompanyLogo url={j.employer.logo_url} name={j.employer.company_name} size={56} />
              <div className="min-w-0 flex-1">
                <h1 className="font-display text-[21px] font-semibold leading-tight text-ink sm:text-[24px]">{j.title}</h1>
                <Link to={`/jobs/company/${j.employer.slug}`} className="mt-1 inline-flex items-center gap-1 text-[14px] font-medium text-ink hover:underline">
                  {j.employer.company_name}
                  {j.employer.is_verified && <BadgeCheck size={15} className="text-brand-green" aria-label="Verified employer" />}
                </Link>
                <p className="mt-0.5 text-[12.5px] text-muted">Posted {timeAgo(j.published_at)} · {j.applications_count} applicant{j.applications_count === 1 ? "" : "s"}</p>
              </div>
            </div>

            <dl className="mt-5 grid grid-cols-2 gap-3 text-[13px] sm:grid-cols-4">
              <Fact icon={<MapPin size={15} />} label="Location" value={`${LOCATION_LABEL[j.location_type]}${place ? ` · ${place}` : ""}`} />
              <Fact icon={<Briefcase size={15} />} label="Type" value={EMPLOYMENT_LABEL[j.employment_type]} />
              <Fact icon={<GraduationCap size={15} />} label="Level" value={`${LEVEL_LABEL[j.experience_level]}${j.min_years_experience ? ` · ${j.min_years_experience}+ yrs` : ""}`} />
              <Fact icon={<Users size={15} />} label="Openings" value={String(j.openings)} />
            </dl>

            {salary && <p className="mt-4 text-[17px] font-semibold text-ink tabular">{salary}</p>}

            <div className="mt-5 hidden flex-wrap items-center gap-2 sm:flex">
              {ApplyButton}
              <Button variant="secondary" onClick={() => save.mutate()} aria-pressed={isSaved}>
                {isSaved ? <><BookmarkCheck size={16} className="text-brand-green" /> Saved</> : <><Bookmark size={16} /> Save</>}
              </Button>
              <Button variant="ghost" onClick={share}><Share2 size={15} /> Share</Button>
            </div>
            <div className="mt-3"><ErrorNote>{error}</ErrorNote></div>
          </header>

          <Section title="About the role" body={j.description} />
          <Section title="Responsibilities" body={j.responsibilities} />
          <Section title="Requirements" body={j.requirements} />
          <Section title="Benefits" body={j.benefits} />

          {j.skills.length > 0 && (
            <section className="rounded-2xl border border-hairline bg-paper p-5">
              <h2 className="font-display text-[16px] font-semibold text-ink">Skills</h2>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {j.skills.map((s) => (
                  <span key={s} className="rounded-md bg-mist px-2.5 py-1 text-[12.5px] font-medium text-ink">{s}</span>
                ))}
              </div>
            </section>
          )}

          <button onClick={() => setReportOpen(true)} className="inline-flex items-center gap-1.5 text-[12.5px] text-muted hover:text-danger">
            <Flag size={13} /> Report this listing
          </button>
        </article>

        <aside className="space-y-4 lg:sticky lg:top-[130px] lg:self-start">
          {j.match && <MatchPanel job={j} />}
          <section className="rounded-2xl border border-hairline bg-paper p-5">
            <div className="flex items-center gap-3">
              <CompanyLogo url={j.employer.logo_url} name={j.employer.company_name} size={40} />
              <div>
                <p className="text-[14px] font-semibold text-ink">{j.employer.company_name}</p>
                <p className="text-[12px] text-muted">{[j.employer.headquarters, j.employer.company_size && `${j.employer.company_size} people`].filter(Boolean).join(" · ")}</p>
              </div>
            </div>
            {j.employer.tagline && <p className="mt-3 text-[13px] leading-relaxed text-muted">{j.employer.tagline}</p>}
            <Button to={`/jobs/company/${j.employer.slug}`} variant="secondary" size="sm" className="mt-3 w-full">
              View company{j.employer.active_jobs ? ` · ${j.employer.active_jobs} jobs` : ""}
            </Button>
          </section>
        </aside>
      </div>

      {/* sticky apply bar on phones */}
      {/* pr-20 leaves room for the floating assistant button */}
      <div className="fixed inset-x-0 bottom-[62px] z-40 flex gap-2 border-t border-hairline bg-paper py-3 pl-3 pr-20 sm:hidden"
           style={{ marginBottom: "env(safe-area-inset-bottom)" }}>
        <div className="flex-1">{ApplyButton}</div>
        <Button variant="secondary" onClick={() => save.mutate()} aria-label={isSaved ? "Saved" : "Save"}>
          {isSaved ? <BookmarkCheck size={17} className="text-brand-green" /> : <Bookmark size={17} />}
        </Button>
      </div>

      {applyOpen && (
        <ApplyModal
          job={j}
          cvUrl={me.data?.cv_url ?? ""}
          cvName={me.data?.cv_filename ?? ""}
          onClose={() => setApplyOpen(false)}
          onDone={() => {
            setApplyOpen(false);
            setApplied(true);
            qc.invalidateQueries({ queryKey: ["jobs"] });
          }}
        />
      )}
      {reportOpen && <ReportModal jobId={j.id} onClose={() => setReportOpen(false)} />}
    </JobsShell>
  );
}

function Fact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <dt className="flex items-center gap-1 text-[11.5px] font-medium uppercase tracking-wide text-muted">{icon}{label}</dt>
      <dd className="mt-0.5 font-medium text-ink">{value}</dd>
    </div>
  );
}

function Section({ title, body }: { title: string; body: string }) {
  if (!body?.trim()) return null;
  return (
    <section className="rounded-2xl border border-hairline bg-paper p-5">
      <h2 className="font-display text-[16px] font-semibold text-ink">{title}</h2>
      <div className="mt-2 whitespace-pre-line text-[14px] leading-relaxed text-ink/90">{body}</div>
    </section>
  );
}

function MatchPanel({ job }: { job: Job }) {
  const m = job.match!;
  const bars: [string, number][] = [
    ["Skills", m.skills], ["Experience", m.experience], ["Preferences", m.preferences], ["Profile text", m.text],
  ];
  return (
    <section className="rounded-2xl border border-hairline bg-paper p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-[15px] font-semibold text-ink">Your match</h2>
        <MatchBadge score={m.score} />
      </div>
      <ul className="mt-3 space-y-2">
        {bars.map(([label, v]) => (
          <li key={label}>
            <div className="flex justify-between text-[12px]"><span className="text-muted">{label}</span><span className="font-semibold text-ink tabular">{Math.round(v * 100)}%</span></div>
            <div className="mt-1 h-1.5 rounded-full bg-mist"><div className="h-full rounded-full bg-brand-green" style={{ width: `${Math.round(v * 100)}%` }} /></div>
          </li>
        ))}
      </ul>
      {m.matched_skills.length > 0 && (
        <p className="mt-3 text-[12.5px] text-ink"><span className="font-semibold">You have:</span> {m.matched_skills.join(", ")}</p>
      )}
      {m.missing_skills.length > 0 && (
        <p className="mt-1 text-[12.5px] text-muted"><span className="font-semibold text-ink">Missing:</span> {m.missing_skills.join(", ")}</p>
      )}
    </section>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 sm:items-center" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title}
           className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-paper p-5 sm:rounded-2xl sm:p-6"
           onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-[18px] font-semibold text-ink">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted hover:bg-mist" aria-label="Close"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ApplyModal({
  job, cvUrl, cvName, onClose, onDone,
}: { job: Job; cvUrl: string; cvName: string; onClose: () => void; onDone: () => void }) {
  const qc = useQueryClient();
  const [cover, setCover] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [cv, setCv] = useState({ url: cvUrl, name: cvName });
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string>();

  async function onFile(f: File | undefined) {
    if (!f) return;
    setError(undefined);
    try {
      setProgress(0);
      const r = await uploadJobsFile(f, "candidate_cv", setProgress);
      await jobsApi.updateMe({ cv_url: r.url, cv_filename: f.name });
      qc.invalidateQueries({ queryKey: ["jobs"] });
      setCv({ url: r.url, name: f.name });
    } catch (e) {
      setError((e as Error).message || "Upload failed.");
    } finally {
      setProgress(null);
    }
  }

  const submit = useMutation({
    mutationFn: () =>
      jobsApi.apply({
        job: job.id,
        cover_letter: cover,
        answers: Object.entries(answers).map(([id, answer]) => ({ id, answer })) as Answer[],
      }),
    onSuccess: onDone,
    onError: (err) => setError(apiErrorMessage(err, "Couldn't send your application.")),
  });

  return (
    <Modal title={`Apply · ${job.title}`} onClose={onClose}>
      <div className="space-y-4">
        <div className="rounded-xl border border-hairline bg-mist p-3">
          {cv.url ? (
            <div className="flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-2 text-[13.5px] text-ink">
                <FileText size={16} className="shrink-0 text-brand-green" />
                <span className="truncate">{cv.name || "Your CV"}</span>
              </span>
              <label className="cursor-pointer text-[12.5px] font-semibold text-brand-green">
                Replace<input type="file" accept=".pdf,.doc,.docx" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
              </label>
            </div>
          ) : (
            <label className="flex cursor-pointer items-center justify-center gap-2 py-2 text-[13.5px] font-semibold text-ink">
              <Upload size={16} /> {progress != null ? `Uploading… ${progress}%` : "Upload your CV (PDF or Word)"}
              <input type="file" accept=".pdf,.doc,.docx" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
            </label>
          )}
        </div>

        {job.screening_questions.map((q) => (
          <Field key={q.id} label={`${q.question}${q.required ? " *" : ""}`} htmlFor={`q-${q.id}`}>
            <TextInput id={`q-${q.id}`} value={answers[q.id] ?? ""} onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))} />
          </Field>
        ))}

        <Field label="Cover note (optional)" htmlFor="cover" hint="A few lines on why you're a fit.">
          <TextArea id="cover" rows={4} value={cover} onChange={(e) => setCover(e.target.value)} maxLength={5000} />
        </Field>

        <ErrorNote>{error}</ErrorNote>
        <Button className="w-full" onClick={() => submit.mutate()} loading={submit.isPending} disabled={!cv.url || progress != null}>
          Send application
        </Button>
      </div>
    </Modal>
  );
}

function ReportModal({ jobId, onClose }: { jobId: string; onClose: () => void }) {
  const [reason, setReason] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string>();
  const send = useMutation({
    mutationFn: () => jobsApi.report(jobId, reason),
    onSuccess: () => setDone(true),
    onError: (err) => setError(apiErrorMessage(err, "Couldn't send the report.")),
  });
  return (
    <Modal title="Report this listing" onClose={onClose}>
      {done ? (
        <p className="text-[14px] text-ink">Thanks — our team will review it. Never pay anyone to apply for a job.</p>
      ) : (
        <div className="space-y-3">
          <p className="text-[13px] text-muted">Scam, asking for money, misleading, or duplicate? Tell us what's wrong.</p>
          <TextArea rows={4} value={reason} onChange={(e) => setReason(e.target.value)} aria-label="Reason" />
          <ErrorNote>{error}</ErrorNote>
          <Button variant="danger" className="w-full" onClick={() => send.mutate()} loading={send.isPending} disabled={!reason.trim()}>
            Send report
          </Button>
        </div>
      )}
    </Modal>
  );
}
