import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, MessageSquare, ChevronDown, CalendarClock } from "lucide-react";
import {
  JobsShell, Spinner, EmptyState, StatusPill, CompanyLogo, Button, Chip, ErrorNote,
} from "../../components/jobs/ui";
import { jobsApi, STATUS_LABEL, timeAgo, type ApplicationStatus, type CandidateApplication } from "../../services/jobs";
import { apiErrorMessage } from "../../lib/api";
import { useJobsSocket } from "../../lib/jobsSocket";
import { useUserScope } from "../../auth/useUserScope";
import { useTranslation } from "react-i18next";

const STEPS: ApplicationStatus[] = ["applied", "under_review", "shortlisted", "interview", "offer", "hired"];
const FILTERS: { key: string; label: string; statuses?: string }[] = [
  { key: "all", label: "jobs.myApplications.filter.all" },
  { key: "active", label: "jobs.myApplications.filter.inProgress", statuses: "applied,under_review,shortlisted,interview,offer" },
  { key: "hired", label: "jobs.myApplications.filter.hired", statuses: "hired" },
  { key: "closed", label: "jobs.myApplications.filter.closed", statuses: "rejected,withdrawn" },
];

/** /jobs/applications — every application with a live status tracker. */
export default function MyApplications() {
  const { t: tr } = useTranslation();
  const scope = useUserScope();
  const qc = useQueryClient();
  const [filter, setFilter] = useState("all");
  const statuses = FILTERS.find((f) => f.key === filter)?.statuses;

  const apps = useQuery({
    queryKey: ["jobs", scope, "applications", filter],
    queryFn: () => jobsApi.myApplications(statuses),
  });

  // Live: an employer moves you on the pipeline -> refresh the list.
  useJobsSocket((e) => {
    if (e.type === "application.updated") qc.invalidateQueries({ queryKey: ["jobs", scope, "applications"] });
  });

  return (
    <JobsShell>
      <h1 className="font-display text-[22px] font-semibold text-ink">{tr("jobs.myApplications.myApplications")}</h1>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <Chip key={f.key} active={filter === f.key} onClick={() => setFilter(f.key)}>{tr(f.label)}</Chip>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {apps.isLoading ? (
          <Spinner />
        ) : (apps.data?.results.length ?? 0) === 0 ? (
          <EmptyState
            icon={<ClipboardList size={20} />}
            title={tr("jobs.myApplications.noApplicationsHere")}
            body={tr("jobs.myApplications.whenYouApplyForJobs")}
            action={<Button to="/jobs/search">{tr("jobs.myApplications.findJobs")}</Button>}
          />
        ) : (
          apps.data!.results.map((a) => <ApplicationRow key={a.id} app={a} />)
        )}
      </div>
    </JobsShell>
  );
}

function ApplicationRow({ app }: { app: CandidateApplication }) {
  const { t: tr } = useTranslation();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const closed = app.status === "rejected" || app.status === "withdrawn";
  const stepIndex = STEPS.indexOf(app.status);

  const withdraw = useMutation({
    mutationFn: () => jobsApi.withdraw(app.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["jobs"] }),
    onError: (err) => setError(apiErrorMessage(err, tr("jobs.myApplications.couldnTWithdraw"))),
  });
  const chat = useMutation({
    mutationFn: () => jobsApi.threadForApplication(app.id),
    onSuccess: (t) => navigate(`/jobs/messages/${t.id}`),
  });

  return (
    <article className="rounded-2xl border border-hairline bg-paper">
      <div className="flex gap-3.5 p-4 sm:p-5">
        <CompanyLogo url={app.job.employer.logo_url} name={app.job.employer.company_name} size={44} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <Link to={`/jobs/${app.job.id}`} className="font-display text-[15.5px] font-semibold text-ink hover:underline">
                {app.job.title}
              </Link>
              <p className="text-[13px] text-muted">{app.job.employer.company_name}{" "}{tr("jobs.myApplications.applied")}{" "}{timeAgo(app.created_at)}</p>
            </div>
            <StatusPill status={app.status} />
          </div>

          {!closed && (
            <ol className="mt-4 flex items-center" aria-label={tr("jobs.myApplications.progress")}>
              {STEPS.map((s, i) => (
                <li key={s} className="flex flex-1 items-center last:flex-none">
                  <span
                    title={STATUS_LABEL[s]}
                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${i <= stepIndex ? "bg-brand-green" : "bg-hairline"}`}
                    aria-current={i === stepIndex ? "step" : undefined}
                  />
                  {i < STEPS.length - 1 && <span className={`h-[2px] flex-1 ${i < stepIndex ? "bg-brand-green" : "bg-hairline"}`} />}
                </li>
              ))}
            </ol>
          )}
          {!closed && (
            <p className="mt-1.5 text-[12px] text-muted">
              {tr("jobs.myApplications.stepOf", { step: stepIndex + 1, total: STEPS.length })}{" "}<span className="font-medium text-ink">{STATUS_LABEL[app.status]}</span>
            </p>
          )}

          {app.interview_at && app.status === "interview" && (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-brand-green/10 px-2.5 py-1.5 text-[12.5px] font-medium text-brand-green">
              <CalendarClock size={14} />{" "}{tr("jobs.myApplications.interviewAt", { date: new Date(app.interview_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) })}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button size="sm" variant="secondary" onClick={() => chat.mutate()} loading={chat.isPending}>
              <MessageSquare size={14} /> {app.thread_id ? tr("jobs.myApplications.openChat") : tr("jobs.myApplications.messageEmployer")}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
              {tr("jobs.myApplications.timeline")}{" "}<ChevronDown size={14} className={open ? "rotate-180" : ""} />
            </Button>
            {!closed && app.status !== "hired" && (
              <Button size="sm" variant="ghost" loading={withdraw.isPending}
                      onClick={() => window.confirm(tr("jobs.myApplications.withdrawThisApplication")) && withdraw.mutate()}>
                {tr("jobs.myApplications.withdraw")}
              </Button>
            )}
          </div>
          <ErrorNote>{error}</ErrorNote>

          {open && (
            <ol className="mt-3 space-y-2 border-l border-hairline pl-4">
              {app.events.map((e, i) => (
                <li key={i} className="relative text-[13px]">
                  <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-brand-green" />
                  <span className="font-medium text-ink">{STATUS_LABEL[e.to_status]}</span>
                  <span className="text-muted"> · {new Date(e.created_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </article>
  );
}
