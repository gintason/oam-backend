import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, Briefcase, Users, Sparkles, FileText } from "lucide-react";
import { ChoiceCard, DarkPanel, SectionTitle } from "../../components/Surface";
import { JobsShell, Spinner, Button } from "../../components/jobs/ui";
import JobCard from "../../components/jobs/JobCard";
import { jobsApi } from "../../services/jobs";
import { useUserScope } from "../../auth/useUserScope";

/** /jobs — entry point: search, the two paths (seek / hire), and picks for you. */
export default function JobsHub() {
  const scope = useUserScope();
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  const me = useQuery({ queryKey: ["jobs", scope, "candidate"], queryFn: jobsApi.me });
  const recommended = useQuery({
    queryKey: ["jobs", scope, "recommended"],
    queryFn: () => jobsApi.recommended(6),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    navigate(`/jobs/search${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`);
  }

  const incomplete = me.data && me.data.completeness < 70;

  return (
    <JobsShell side="none">
      <DarkPanel className="p-5 sm:p-8">
        <p className="text-[12px] font-semibold uppercase tracking-wider text-white/55">OAM Jobs</p>
        <h1 className="mt-1 font-display text-[24px] font-semibold leading-tight sm:text-[30px]">
          Find work you'll love. Hire people who fit.
        </h1>
        <form onSubmit={submit} className="mt-5 flex max-w-xl gap-2">
          <label className="relative flex-1">
            <span className="sr-only">Search jobs</span>
            <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Job title, skill or company"
              className="h-11 w-full rounded-lg bg-paper pl-9 pr-3 text-[14px] text-ink outline-none"
            />
          </label>
          <button className="h-11 rounded-lg bg-brand-green px-5 text-[14px] font-semibold text-white hover:brightness-95">
            Search
          </button>
        </form>
      </DarkPanel>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <ChoiceCard
          to="/jobs/search"
          icon={<Briefcase size={20} />}
          title="I'm looking for a job"
          description="Search thousands of roles, apply in one tap with your OAM CV, and track every application."
          action="Find jobs"
        />
        <ChoiceCard
          to="/jobs/employer"
          icon={<Users size={20} />}
          title="I'm hiring"
          description="Post a job in minutes, manage applicants on a pipeline board, and chat with candidates."
          action="Go to employer dashboard"
        />
      </div>

      {incomplete && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-hairline bg-paper p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-green/10 text-brand-green"><FileText size={18} /></span>
            <div>
              <p className="text-[14px] font-semibold text-ink">Your CV is {me.data!.completeness}% complete</p>
              <p className="text-[12.5px] text-muted">Complete profiles get better matches and 1-click apply.</p>
            </div>
          </div>
          <Button to="/jobs/profile" variant="secondary" size="sm">Finish my CV</Button>
        </div>
      )}

      <div className="mt-7">
        <SectionTitle action={<Button to="/jobs/search" variant="ghost" size="sm">See all jobs</Button>}>
          <span className="inline-flex items-center gap-1.5"><Sparkles size={16} className="text-brand-green" /> Recommended for you</span>
        </SectionTitle>
        {recommended.isLoading ? (
          <Spinner />
        ) : (recommended.data?.results.length ?? 0) === 0 ? (
          <p className="rounded-2xl border border-hairline bg-paper p-5 text-[13.5px] text-muted">
            Add skills to your CV and we'll recommend jobs that match.
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {recommended.data!.results.map((j) => <JobCard key={j.id} job={j} showMatch />)}
          </div>
        )}
      </div>
    </JobsShell>
  );
}
