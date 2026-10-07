import { Link } from "react-router-dom";
import { Bookmark, BookmarkCheck, MapPin, Briefcase, Sparkles, BadgeCheck } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  jobsApi, formatSalary, timeAgo, LOCATION_LABEL, EMPLOYMENT_LABEL, type JobCardData,
} from "../../services/jobs";
import { CompanyLogo, MatchBadge } from "./ui";
import { CardEngagement } from "./Engagement";
import { useTranslation } from "react-i18next";

/** One search result. The whole card links to the job; the bookmark doesn't. */
export default function JobCard({ job, showMatch = false }: { job: JobCardData; showMatch?: boolean }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [saved, setSaved] = useState<boolean>(Boolean(job.is_saved));
  const toggle = useMutation({
    mutationFn: () => (saved ? jobsApi.unsave(job.id) : jobsApi.save(job.id)),
    onMutate: () => setSaved((s) => !s),
    onError: () => setSaved((s) => !s),
    onSettled: () =>
      qc.invalidateQueries({ queryKey: ["jobs"], predicate: (q) => q.queryKey.includes("saved") }),
  });
  const salary = formatSalary(job.salary);
  const place = [job.location, job.country].filter(Boolean).join(", ");

  return (
    <article className="group relative rounded-2xl border border-hairline bg-paper p-4 transition hover:border-brand-green/40 hover:shadow-[0_8px_24px_rgba(10,10,10,0.06)] sm:p-5">
      <div className="flex gap-3.5">
        <CompanyLogo url={job.employer.logo_url} name={job.employer.company_name} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {job.is_promoted && (
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-red/10 px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-brand-red">
                <Sparkles size={11} />{" "}{t("jobs.jobCard.featured")}
              </span>
            )}
            {job.has_applied && (
              <span className="rounded-full bg-brand-green/10 px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-brand-green">
                {t("jobs.jobCard.applied")}
              </span>
            )}
          </div>
          <h3 className="mt-0.5 pr-8 font-display text-[16px] font-semibold leading-snug text-ink">
            <Link to={`/jobs/${job.id}`} className="after:absolute after:inset-0 after:rounded-2xl focus:outline-none">
              {job.title}
            </Link>
          </h3>
          <p className="mt-0.5 flex items-center gap-1 text-[13px] text-muted">
            {job.employer.company_name}
            {job.employer.is_verified && (
              <BadgeCheck size={14} className="text-brand-green" aria-label={t("jobs.jobCard.verifiedEmployer")} />
            )}
          </p>

          <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-muted">
            <span className="inline-flex items-center gap-1">
              <MapPin size={13} /> {LOCATION_LABEL[job.location_type]}{place ? ` · ${place}` : ""}
            </span>
            <span className="inline-flex items-center gap-1">
              <Briefcase size={13} /> {EMPLOYMENT_LABEL[job.employment_type]}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {salary && <span className="text-[13.5px] font-semibold text-ink tabular">{salary}</span>}
              {showMatch && job.match && <MatchBadge score={job.match.score} />}
            </div>
            <span className="text-[12px] text-muted">{timeAgo(job.published_at)}</span>
          </div>
        </div>
      </div>

      <CardEngagement job={job} />

      {job.is_saved !== null && (
        <button
          type="button"
          onClick={() => toggle.mutate()}
          className="absolute right-3 top-3 z-10 rounded-lg p-2 text-muted transition hover:bg-mist hover:text-ink"
          aria-label={saved ? t("jobs.jobCard.removeFromSavedJobs") : t("jobs.jobCard.saveJob")}
          aria-pressed={saved}
        >
          {saved ? <BookmarkCheck size={18} className="text-brand-green" /> : <Bookmark size={18} />}
        </button>
      )}
    </article>
  );
}
