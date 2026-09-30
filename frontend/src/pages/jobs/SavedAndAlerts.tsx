import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bookmark, BellRing, Trash2, Search } from "lucide-react";
import { JobsShell, Spinner, EmptyState, Chip, Toggle, Select, Button } from "../../components/jobs/ui";
import JobCard from "../../components/jobs/JobCard";
import { jobsApi, toParams, type AlertFrequency, type SavedSearch } from "../../services/jobs";
import { useUserScope } from "../../auth/useUserScope";

/** /jobs/saved — bookmarked jobs and saved searches (job alerts). */
export default function SavedAndAlerts() {
  const scope = useUserScope();
  const [tab, setTab] = useState<"jobs" | "alerts">("jobs");
  const saved = useQuery({ queryKey: ["jobs", scope, "saved"], queryFn: () => jobsApi.savedJobs() });
  const searches = useQuery({ queryKey: ["jobs", scope, "saved-searches"], queryFn: jobsApi.savedSearches });

  return (
    <JobsShell>
      <h1 className="font-display text-[22px] font-semibold text-ink">Saved & alerts</h1>
      <div className="mt-3 flex gap-1.5">
        <Chip active={tab === "jobs"} onClick={() => setTab("jobs")}>Saved jobs{saved.data ? ` (${saved.data.count})` : ""}</Chip>
        <Chip active={tab === "alerts"} onClick={() => setTab("alerts")}>Job alerts{searches.data ? ` (${searches.data.count})` : ""}</Chip>
      </div>

      <div className="mt-4">
        {tab === "jobs" ? (
          saved.isLoading ? <Spinner /> : (saved.data?.results.length ?? 0) === 0 ? (
            <EmptyState icon={<Bookmark size={20} />} title="No saved jobs" body="Tap the bookmark on any job to keep it here." action={<Button to="/jobs/search">Browse jobs</Button>} />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">{saved.data!.results.map((j) => <JobCard key={j.id} job={j} />)}</div>
          )
        ) : searches.isLoading ? <Spinner /> : (searches.data?.results.length ?? 0) === 0 ? (
          <EmptyState icon={<BellRing size={20} />} title="No job alerts yet"
                      body='Run a search and tap "Get alerts" — we’ll notify you when new jobs match.'
                      action={<Button to="/jobs/search">Search jobs</Button>} />
        ) : (
          <div className="space-y-3">{searches.data!.results.map((s) => <AlertRow key={s.id} s={s} />)}</div>
        )}
      </div>
    </JobsShell>
  );
}

function AlertRow({ s }: { s: SavedSearch }) {
  const qc = useQueryClient();
  const scope = useUserScope();
  const update = useMutation({
    mutationFn: (patch: Partial<SavedSearch>) => jobsApi.updateSavedSearch(s.id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["jobs", scope, "saved-searches"] }),
  });
  const remove = useMutation({
    mutationFn: () => jobsApi.deleteSavedSearch(s.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["jobs", scope, "saved-searches"] }),
  });
  const qs = new URLSearchParams(toParams(s.query, s.filters)).toString();
  const summary = [s.query && `“${s.query}”`, ...(s.filters.location_type ?? []), ...(s.filters.employment_type ?? []), s.filters.location]
    .filter(Boolean).join(" · ");

  return (
    <article className="rounded-2xl border border-hairline bg-paper p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-display text-[15.5px] font-semibold text-ink">{s.name}</h3>
          <p className="text-[12.5px] text-muted">{summary || "All jobs"}</p>
        </div>
        <div className="flex gap-1">
          <Link to={`/jobs/search?${qs}`} className="inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-[12.5px] font-medium text-ink hover:bg-mist">
            <Search size={14} /> Run
          </Link>
          <button onClick={() => window.confirm("Delete this alert?") && remove.mutate()}
                  className="rounded-lg p-2 text-muted hover:bg-mist hover:text-danger" aria-label="Delete alert">
            <Trash2 size={15} />
          </button>
        </div>
      </div>
      <div className="mt-3 grid gap-2 border-t border-hairline pt-3 sm:grid-cols-[1fr_180px] sm:items-center">
        <Toggle checked={s.alert_enabled} onChange={(v) => update.mutate({ alert_enabled: v })} label="Send me alerts" />
        <Select value={s.frequency} disabled={!s.alert_enabled}
                onChange={(e) => update.mutate({ frequency: e.target.value as AlertFrequency })} aria-label="How often">
          <option value="instant">Instantly</option>
          <option value="daily">Daily digest</option>
          <option value="weekly">Weekly digest</option>
        </Select>
        <Toggle checked={s.notify_email} onChange={(v) => update.mutate({ notify_email: v })} label="Also email me" />
      </div>
    </article>
  );
}
