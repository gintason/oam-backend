import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus, MoreHorizontal, Eye, Users, Pencil, Pause, Play, XCircle, RefreshCw, Star, Rocket,
  Trash2, Lock, BriefcaseBusiness, Building2, ShieldCheck,
} from "lucide-react";
import { DarkPanel, Stat, SectionTitle } from "../../components/Surface";
import { JobsShell, Spinner, Button, JobStatusPill, EmptyState, ErrorNote, CompanyLogo } from "../../components/jobs/ui";
import { ApplicationsChart, FunnelChart } from "../../components/jobs/Charts";
import UpgradeSheet from "../../components/jobs/UpgradeSheet";
import {
  jobsApi, jobsErrorCode, UPGRADE_CODES, timeAgo, type JobOwned,
} from "../../services/jobs";
import { apiErrorMessage } from "../../lib/api";
import { useJobsSocket } from "../../lib/jobsSocket";
import { useUserScope } from "../../auth/useUserScope";

/** /jobs/employer — the hiring home: numbers, charts, and every listing. */
export default function EmployerDashboard() {
  const scope = useUserScope();
  const qc = useQueryClient();
  const [days, setDays] = useState(30);
  const [upgrade, setUpgrade] = useState<string | null>(null);
  const [error, setError] = useState<string>();

  const company = useQuery({ queryKey: ["jobs", scope, "company"], queryFn: jobsApi.myCompany, retry: false });
  const hasCompany = company.isSuccess;
  const dash = useQuery({
    queryKey: ["jobs", scope, "employer-dashboard", days],
    queryFn: () => jobsApi.employerDashboard(days),
    enabled: hasCompany,
  });
  const jobs = useQuery({ queryKey: ["jobs", scope, "mine"], queryFn: () => jobsApi.myJobs(), enabled: hasCompany });

  useJobsSocket((e) => {
    if (e.type === "application.created" || e.type === "application.updated") {
      qc.invalidateQueries({ queryKey: ["jobs", scope, "employer-dashboard"] });
      qc.invalidateQueries({ queryKey: ["jobs", scope, "mine"] });
    }
  }, hasCompany);

  function onError(err: unknown) {
    const code = jobsErrorCode(err);
    if (code && UPGRADE_CODES.has(code)) setUpgrade(code);
    else setError(apiErrorMessage(err, "That didn't work."));
  }

  if (company.isLoading) return <JobsShell side="employer" wide><Spinner /></JobsShell>;
  if (company.isError && jobsErrorCode(company.error) === "no_employer_profile") {
    return <Navigate to="/jobs/employer/company?new=1" replace />;
  }
  if (!company.data) {
    return <JobsShell side="employer" wide><ErrorNote>{apiErrorMessage(company.error, "Couldn't load your company.")}</ErrorNote></JobsShell>;
  }

  const c = company.data;
  const d = dash.data;
  const u = d?.usage ?? c.usage;
  const list = jobs.data?.results ?? [];

  return (
    <JobsShell side="employer" wide>
      <DarkPanel className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CompanyLogo url={c.logo_url} name={c.company_name} size={48} />
            <div>
              <h1 className="flex items-center gap-1.5 font-display text-[20px] font-semibold">
                {c.company_name}
                {c.is_verified && <ShieldCheck size={17} className="text-brand-green" aria-label="Verified" />}
              </h1>
              <p className="text-[12.5px] text-white/60">
                {u?.plan.label ?? "Free"} plan
                {u?.subscription.current_period_end && u.subscription.active_plan !== "free"
                  ? ` · renews ${new Date(u.subscription.current_period_end).toLocaleDateString()}` : ""}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link to="/jobs/employer/company" className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-white/15 px-3.5 text-[13px] font-medium text-white hover:bg-white/10">
              <Building2 size={15} /> Company
            </Link>
            <Link to="/jobs/employer/post" className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-brand-green px-4 text-[13.5px] font-semibold text-white hover:brightness-95">
              <Plus size={16} /> Post a job
            </Link>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-5 sm:grid-cols-4">
          <Stat label="Live jobs" value={`${u?.active_jobs ?? 0}${u?.active_job_limit != null ? ` / ${u.active_job_limit}` : ""}`}
                hint={u?.job_credits ? `+${u.job_credits} job credit${u.job_credits === 1 ? "" : "s"}` : undefined} />
          <Stat label="Applicants" value={(d?.applications.total ?? 0).toLocaleString()}
                hint={d?.applications.last_period != null ? `${d.applications.last_period} in ${days} days` : undefined} />
          <Stat label="Listing views" value={(d?.views ?? list.reduce((n, j) => n + j.views_count, 0)).toLocaleString()} />
          <Stat label="Avg. days to hire" value={d?.avg_days_to_hire ?? "—"} />
        </div>
      </DarkPanel>

      {c.verification_status !== "verified" && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-hairline bg-paper p-4">
          <p className="text-[13.5px] text-ink">
            <span className="font-semibold">{c.verification_status === "pending" ? "Verification in review." : "Get the verified badge."}</span>{" "}
            <span className="text-muted">Verified employers get more applicants and skip manual review.</span>
          </p>
          {c.verification_status !== "pending" && <Button size="sm" variant="secondary" to="/jobs/employer/company#verify">Verify company</Button>}
        </div>
      )}

      <div className="mt-4"><ErrorNote>{error}</ErrorNote></div>

      {/* Analytics */}
      <div className="mt-5">
        <SectionTitle action={
          !d?.locked && (
            <div className="flex gap-1" role="radiogroup" aria-label="Period">
              {[7, 30, 90].map((n) => (
                <button key={n} role="radio" aria-checked={days === n} onClick={() => setDays(n)}
                        className={`h-8 rounded-full px-3 text-[12.5px] font-medium ${days === n ? "bg-ink text-white" : "text-muted hover:bg-paper"}`}>
                  {n}d
                </button>
              ))}
            </div>
          )
        }>Recruitment analytics</SectionTitle>
        {dash.isLoading ? <Spinner /> : d?.locked ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-hairline bg-paper p-5">
            <p className="flex items-center gap-2 text-[13.5px] text-ink">
              <Lock size={16} className="text-muted" /> Charts, the hiring funnel and time-to-hire are on Premium and Pro.
            </p>
            <Button size="sm" onClick={() => setUpgrade("upgrade_required")}>See plans</Button>
          </div>
        ) : d?.series ? (
          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <ApplicationsChart series={d.series} />
            <FunnelChart funnel={d.funnel ?? []} />
          </div>
        ) : null}
      </div>

      {/* Jobs */}
      <div className="mt-7">
        <SectionTitle>Your jobs</SectionTitle>
        {jobs.isLoading ? <Spinner /> : list.length === 0 ? (
          <EmptyState icon={<BriefcaseBusiness size={20} />} title="No jobs yet"
                      body="Post your first job — it takes about three minutes."
                      action={<Button to="/jobs/employer/post"><Plus size={15} /> Post a job</Button>} />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-hairline bg-paper">
            <ul className="divide-y divide-hairline">
              {list.map((j) => <JobRow key={j.id} job={j} onError={onError} />)}
            </ul>
          </div>
        )}
      </div>

      <UpgradeSheet open={Boolean(upgrade)} reason={upgrade ?? undefined} onClose={() => setUpgrade(null)} />
    </JobsShell>
  );
}

function JobRow({ job, onError }: { job: JobOwned; onError: (e: unknown) => void }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [menu, setMenu] = useState(false);
  const refresh = () => qc.invalidateQueries({ queryKey: ["jobs"] });

  const act = useMutation({
    mutationFn: (a: "publish" | "pause" | "resume" | "close" | "renew") => jobsApi.jobAction(job.id, a),
    onSuccess: refresh, onError,
  });
  const feature = useMutation({ mutationFn: (on: boolean) => jobsApi.feature(job.id, on), onSuccess: refresh, onError });
  const boost = useMutation({
    mutationFn: (days: number) => jobsApi.checkout({ purpose: "boost", job: job.id, days }),
    onSuccess: (p) => { window.location.href = p.authorization_url; },
    onError,
  });
  const remove = useMutation({ mutationFn: () => jobsApi.deleteJob(job.id), onSuccess: refresh, onError });
  const busy = act.isPending || feature.isPending || boost.isPending || remove.isPending;

  const items: { label: string; icon: React.ReactNode; run: () => void; show: boolean; danger?: boolean }[] = [
    { label: "Edit", icon: <Pencil size={14} />, run: () => navigate(`/jobs/employer/jobs/${job.id}/edit`), show: true },
    { label: "Publish", icon: <Play size={14} />, run: () => act.mutate("publish"), show: job.status === "draft" },
    { label: "Pause", icon: <Pause size={14} />, run: () => act.mutate("pause"), show: job.status === "active" },
    { label: "Resume", icon: <Play size={14} />, run: () => act.mutate("resume"), show: job.status === "paused" },
    { label: job.status === "active" ? "Extend" : "Renew", icon: <RefreshCw size={14} />, run: () => act.mutate("renew"), show: ["active", "expired", "closed"].includes(job.status) },
    { label: job.is_featured ? "Unfeature" : "Feature", icon: <Star size={14} />, run: () => feature.mutate(!job.is_featured), show: job.status === "active" },
    { label: "Boost 7 days", icon: <Rocket size={14} />, run: () => boost.mutate(7), show: job.status === "active" },
    { label: "Boost 30 days", icon: <Rocket size={14} />, run: () => boost.mutate(30), show: job.status === "active" },
    { label: "Close", icon: <XCircle size={14} />, run: () => window.confirm("Close this job? It stops accepting applications.") && act.mutate("close"), show: ["active", "paused"].includes(job.status) },
    { label: job.applications_count ? "Close & archive" : "Delete", icon: <Trash2 size={14} />, danger: true, show: ["draft", "expired", "closed"].includes(job.status),
      run: () => window.confirm("Remove this job?") && remove.mutate() },
  ];

  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-3.5 sm:flex-nowrap sm:px-5">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link to={`/jobs/employer/jobs/${job.id}`} className="font-display text-[15px] font-semibold text-ink hover:underline">{job.title}</Link>
          <JobStatusPill status={job.status} />
          {job.is_boosted && <span className="rounded-full bg-brand-red/10 px-2 py-0.5 text-[11px] font-semibold text-brand-red">Boosted</span>}
          {job.is_featured && <span className="rounded-full bg-ink px-2 py-0.5 text-[11px] font-semibold text-white">Featured</span>}
        </div>
        <p className="mt-0.5 text-[12.5px] text-muted">
          {job.status === "active" && job.expires_at ? `Live until ${new Date(job.expires_at).toLocaleDateString()}` : `Updated ${timeAgo(job.updated_at)}`}
          {job.moderation_note && job.status === "pending_review" ? ` · ${job.moderation_note}` : ""}
        </p>
      </div>
      <div className="flex items-center gap-4 text-[12.5px] text-muted">
        <span className="inline-flex items-center gap-1 tabular" title="Views"><Eye size={14} /> {job.views_count}</span>
        <Link to={`/jobs/employer/jobs/${job.id}`} className="inline-flex items-center gap-1 font-semibold text-ink tabular hover:underline" title="Applicants">
          <Users size={14} /> {job.applications_count}
        </Link>
      </div>
      <div className="relative">
        <button onClick={() => setMenu((m) => !m)} disabled={busy}
                className="rounded-lg p-2 text-muted hover:bg-mist hover:text-ink disabled:opacity-50" aria-label="Job actions" aria-expanded={menu}>
          <MoreHorizontal size={18} />
        </button>
        {menu && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setMenu(false)} />
            <ul className="absolute right-0 z-40 mt-1 w-48 overflow-hidden rounded-xl border border-hairline bg-paper py-1 shadow-lg" role="menu">
              {items.filter((i) => i.show).map((i) => (
                <li key={i.label}>
                  <button role="menuitem" onClick={() => { setMenu(false); i.run(); }}
                          className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] hover:bg-mist ${i.danger ? "text-danger" : "text-ink"}`}>
                    {i.icon} {i.label}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </li>
  );
}
