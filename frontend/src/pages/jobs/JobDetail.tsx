import { useRef, useState } from "react";
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
import { EngagementBar, JobComments } from "../../components/jobs/Engagement";
import { useTranslation } from "react-i18next";

export default function JobDetail() {
  const { t } = useTranslation();
  const { id = "" } = useParams();
  const scope = useUserScope();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [applyOpen, setApplyOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const commentsRef = useRef<HTMLElement>(null);
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
      else setError(apiErrorMessage(err, t("jobs.jobDetail.couldnTSendYourApplication")));
    },
  });

  if (job.isLoading) return <JobsShell><Spinner /></JobsShell>;
  if (!job.data) {
    return (
      <JobsShell>
        <p className="rounded-2xl border border-hairline bg-paper p-6 text-center text-[14px] text-muted">
          {t("jobs.jobDetail.thisJobIsNoLonger")}
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
      navigator.share({ title: j.title, text: t("jobs.jobDetail.titleAtCompanyName", { title: j.title, company_name: j.employer.company_name }), url }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(url);
    }
  }

  const ApplyButton = (
    hasApplied ? (
      <Button variant="secondary" to="/jobs/applications" className="w-full sm:w-auto">
        <CheckCircle2 size={16} className="text-brand-green" />{" "}{t("jobs.jobDetail.appliedTrackStatus")}
      </Button>
    ) : (
      <Button onClick={onApply} loading={quickApply.isPending} className="w-full sm:w-auto">
        {j.apply_method === "external" ? <>{t("jobs.jobDetail.applyOnCompanySite")}{" "}<ExternalLink size={14} /></>
          : needsForm ? t("jobs.jobDetail.applyNow") : t("jobs.jobDetail.n1ClickApply")}
      </Button>
    )
  );

  return (
    <JobsShell>
      <button onClick={() => navigate(-1)} className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink">
        <ArrowLeft size={15} />{" "}{t("jobs.jobDetail.back")}
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
                  {j.employer.is_verified && <BadgeCheck size={15} className="text-brand-green" aria-label={t("jobs.jobDetail.verifiedEmployer")} />}
                </Link>
                <p className="mt-0.5 text-[12.5px] text-muted">{t("jobs.jobDetail.postedApplicants", { timeAgo: timeAgo(j.published_at), count: j.applications_count })}</p>
              </div>
            </div>

            <dl className="mt-5 grid grid-cols-2 gap-3 text-[13px] sm:grid-cols-4">
              <Fact icon={<MapPin size={15} />} label={t("jobs.jobDetail.location")} value={`${LOCATION_LABEL[j.location_type]}${place ? ` · ${place}` : ""}`} />
              <Fact icon={<Briefcase size={15} />} label={t("jobs.jobDetail.type")} value={EMPLOYMENT_LABEL[j.employment_type]} />
              <Fact icon={<GraduationCap size={15} />} label={t("jobs.jobDetail.level")} value={`${LEVEL_LABEL[j.experience_level]}${j.min_years_experience ? ` · ${j.min_years_experience}+ yrs` : ""}`} />
              <Fact icon={<Users size={15} />} label={t("jobs.jobDetail.openings")} value={String(j.openings)} />
            </dl>

            {salary && <p className="mt-4 text-[17px] font-semibold text-ink tabular">{salary}</p>}

            <div className="mt-5 hidden flex-wrap items-center gap-2 sm:flex">
              {ApplyButton}
              <Button variant="secondary" onClick={() => save.mutate()} aria-pressed={isSaved}>
                {isSaved ? <><BookmarkCheck size={16} className="text-brand-green" />{" "}{t("jobs.jobDetail.saved")}</> : <><Bookmark size={16} />{" "}{t("jobs.jobDetail.save")}</>}
              </Button>
              <Button variant="ghost" onClick={share}><Share2 size={15} />{" "}{t("jobs.jobDetail.share")}</Button>
            </div>
            <EngagementBar job={j} showShare={false} onComments={() => commentsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })} />
            <div className="mt-3"><ErrorNote>{error}</ErrorNote></div>
          </header>

          <Section title={t("jobs.jobDetail.aboutTheRole")} body={j.description} />
          <Section title={t("jobs.jobDetail.responsibilities")} body={j.responsibilities} />
          <Section title={t("jobs.jobDetail.requirements")} body={j.requirements} />
          <Section title={t("jobs.jobDetail.benefits")} body={j.benefits} />

          {j.skills.length > 0 && (
            <section className="rounded-2xl border border-hairline bg-paper p-5">
              <h2 className="font-display text-[16px] font-semibold text-ink">{t("jobs.jobDetail.skills")}</h2>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {j.skills.map((s) => (
                  <span key={s} className="rounded-md bg-mist px-2.5 py-1 text-[12.5px] font-medium text-ink">{s}</span>
                ))}
              </div>
            </section>
          )}

          <JobComments jobId={j.id} anchorRef={commentsRef} />

          <button onClick={() => setReportOpen(true)} className="inline-flex items-center gap-1.5 text-[12.5px] text-muted hover:text-danger">
            <Flag size={13} />{" "}{t("jobs.jobDetail.reportThisListing")}
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
              {t("jobs.jobDetail.viewCompany")}{j.employer.active_jobs ? ` · ${t("jobs.jobDetail.activeJobs", { count: j.employer.active_jobs })}` : ""}
            </Button>
          </section>
        </aside>
      </div>

      {/* sticky apply bar on phones */}
      {/* pr-20 leaves room for the floating assistant button */}
      <div className="fixed inset-x-0 bottom-[62px] z-40 flex gap-2 border-t border-hairline bg-paper py-3 pl-3 pr-20 sm:hidden"
           style={{ marginBottom: "env(safe-area-inset-bottom)" }}>
        <div className="flex-1">{ApplyButton}</div>
        <Button variant="secondary" onClick={() => save.mutate()} aria-label={isSaved ? t("jobs.jobDetail.saved") : t("jobs.jobDetail.save")}>
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
  const { t } = useTranslation();
  const m = job.match!;
  const bars: [string, number][] = [
    [t("jobs.jobDetail.skills"), m.skills], [t("jobs.jobDetail.experience"), m.experience], [t("jobs.jobDetail.preferences"), m.preferences], [t("jobs.jobDetail.profileText"), m.text],
  ];
  return (
    <section className="rounded-2xl border border-hairline bg-paper p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-[15px] font-semibold text-ink">{t("jobs.jobDetail.yourMatch")}</h2>
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
        <p className="mt-3 text-[12.5px] text-ink"><span className="font-semibold">{t("jobs.jobDetail.youHave")}</span> {m.matched_skills.join(", ")}</p>
      )}
      {m.missing_skills.length > 0 && (
        <p className="mt-1 text-[12.5px] text-muted"><span className="font-semibold text-ink">{t("jobs.jobDetail.missing")}</span> {m.missing_skills.join(", ")}</p>
      )}
    </section>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 sm:items-center" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title}
           className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-paper p-5 sm:rounded-2xl sm:p-6"
           onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-[18px] font-semibold text-ink">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted hover:bg-mist" aria-label={t("jobs.jobDetail.close")}><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ApplyModal({
  job, cvUrl, cvName, onClose, onDone,
}: { job: Job; cvUrl: string; cvName: string; onClose: () => void; onDone: () => void }) {
  const { t } = useTranslation();
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
      setError((e as Error).message || t("jobs.jobDetail.uploadFailed"));
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
    onError: (err) => setError(apiErrorMessage(err, t("jobs.jobDetail.couldnTSendYourApplication"))),
  });

  return (
    <Modal title={t("jobs.jobDetail.applyTitle", { title: job.title })} onClose={onClose}>
      <div className="space-y-4">
        <div className="rounded-xl border border-hairline bg-mist p-3">
          {cv.url ? (
            <div className="flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-2 text-[13.5px] text-ink">
                <FileText size={16} className="shrink-0 text-brand-green" />
                <span className="truncate">{cv.name || t("jobs.jobDetail.yourCv")}</span>
              </span>
              <label className="cursor-pointer text-[12.5px] font-semibold text-brand-green">
                {t("jobs.jobDetail.replace")}<input type="file" accept=".pdf,.doc,.docx" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
              </label>
            </div>
          ) : (
            <label className="flex cursor-pointer items-center justify-center gap-2 py-2 text-[13.5px] font-semibold text-ink">
              <Upload size={16} /> {progress != null ? t("jobs.jobDetail.uploadingProgress", { progress }) : t("jobs.jobDetail.uploadYourCvPdfOr")}
              <input type="file" accept=".pdf,.doc,.docx" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
            </label>
          )}
        </div>

        {job.screening_questions.map((q) => (
          <Field key={q.id} label={`${q.question}${q.required ? " *" : ""}`} htmlFor={`q-${q.id}`}>
            <TextInput id={`q-${q.id}`} value={answers[q.id] ?? ""} onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))} />
          </Field>
        ))}

        <Field label={t("jobs.jobDetail.coverNoteOptional")} htmlFor="cover" hint={t("jobs.jobDetail.aFewLinesOnWhy")}>
          <TextArea id="cover" rows={4} value={cover} onChange={(e) => setCover(e.target.value)} maxLength={5000} />
        </Field>

        <ErrorNote>{error}</ErrorNote>
        <Button className="w-full" onClick={() => submit.mutate()} loading={submit.isPending} disabled={!cv.url || progress != null}>
          {t("jobs.jobDetail.sendApplication")}
        </Button>
      </div>
    </Modal>
  );
}

function ReportModal({ jobId, onClose }: { jobId: string; onClose: () => void }) {
  const { t } = useTranslation();
  const [reason, setReason] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string>();
  const send = useMutation({
    mutationFn: () => jobsApi.report(jobId, reason),
    onSuccess: () => setDone(true),
    onError: (err) => setError(apiErrorMessage(err, t("jobs.jobDetail.couldnTSendTheReport"))),
  });
  return (
    <Modal title={t("jobs.jobDetail.reportThisListing")} onClose={onClose}>
      {done ? (
        <p className="text-[14px] text-ink">{t("jobs.jobDetail.thanksOurTeamWillReview")}</p>
      ) : (
        <div className="space-y-3">
          <p className="text-[13px] text-muted">{t("jobs.jobDetail.scamAskingForMoneyMisleading")}</p>
          <TextArea rows={4} value={reason} onChange={(e) => setReason(e.target.value)} aria-label={t("jobs.jobDetail.reason")} />
          <ErrorNote>{error}</ErrorNote>
          <Button variant="danger" className="w-full" onClick={() => send.mutate()} loading={send.isPending} disabled={!reason.trim()}>
            {t("jobs.jobDetail.sendReport")}
          </Button>
        </div>
      )}
    </Modal>
  );
}
