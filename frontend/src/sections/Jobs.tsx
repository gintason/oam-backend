import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ArrowRight, BadgeCheck, BriefcaseBusiness, Loader2 } from "lucide-react";
import JobCard from "../components/jobs/JobCard";
import { jobsApi } from "../services/jobs";

/**
 * Landing-page jobs preview (sits after Marketplace).
 *
 * First: live jobs from employers on an active Premium or Pro plan — the
 * placement is part of what those plans buy. Then: the latest other posts, so
 * the section is never just ads. Both come from the public home-feed endpoint.
 */
export default function Jobs() {
  const { t } = useTranslation();
  const feed = useQuery({
    queryKey: ["jobs-home-feed"],
    queryFn: () => jobsApi.homeFeed(6),
    staleTime: 5 * 60_000,
    retry: false,
  });

  // Backend not updated yet (404) or offline: leave the rest of the page alone.
  if (feed.isError) return null;

  const featured = feed.data?.featured ?? [];
  const latest = feed.data?.latest ?? [];
  const empty = !feed.isLoading && featured.length === 0 && latest.length === 0;

  return (
    <section id="jobs" className="scroll-mt-20">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-24">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div className="max-w-2xl">
            <p className="mb-2 text-sm font-medium uppercase tracking-wider text-brand-green">
              {t("landing.jobs.eyebrow", "Jobs & careers")}
            </p>
            <h2 className="font-display text-2xl font-medium text-ink sm:text-3xl lg:text-4xl">
              {t("landing.jobs.title", "Hiring now on OAM")}
            </h2>
            <p className="mt-3 text-base leading-relaxed text-muted">
              {t("landing.jobs.subtitle", "Apply in one tap with your OAM CV, or post a job and meet candidates today.")}
            </p>
          </div>
          <Link
            to="/jobs/search"
            className="inline-flex shrink-0 items-center gap-2 text-[15px] font-medium text-brand-red transition-all hover:gap-3"
          >
            {t("landing.jobs.viewAll", "View all jobs")}
            {feed.data?.total_live ? ` (${feed.data.total_live.toLocaleString()})` : ""}
            <ArrowRight size={18} strokeWidth={1.75} />
          </Link>
        </div>

        {feed.isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={22} className="animate-spin text-muted" />
          </div>
        ) : empty ? (
          <div className="rounded-2xl border border-hairline bg-paper py-14 text-center">
            <BriefcaseBusiness size={30} strokeWidth={1.5} className="mx-auto text-muted" />
            <p className="mt-3 text-[15px] font-medium text-ink">
              {t("landing.jobs.emptyTitle", "No open jobs yet")}
            </p>
            <p className="mx-auto mt-1.5 max-w-md text-[13px] leading-relaxed text-muted">
              {t("landing.jobs.emptyBody", "Be the first employer to post — your job goes live in minutes.")}
            </p>
            <Link
              to="/jobs/employer/post"
              className="mt-4 inline-flex h-11 items-center rounded-xl bg-brand-red px-5 text-[13.5px] font-semibold text-white transition hover:brightness-95"
            >
              {t("landing.jobs.postJob", "Post a job")}
            </Link>
          </div>
        ) : (
          <div className="space-y-10">
            {featured.length > 0 && (
              <div>
                <h3 className="mb-3 flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-wider text-muted">
                  <BadgeCheck size={15} className="text-brand-green" />
                  {t("landing.jobs.featured", "From Premium & Pro employers")}
                </h3>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {featured.map((j) => <JobCard key={j.id} job={j} />)}
                </div>
              </div>
            )}
            {latest.length > 0 && (
              <div>
                <h3 className="mb-3 text-[13px] font-semibold uppercase tracking-wider text-muted">
                  {t("landing.jobs.latest", "Latest jobs")}
                </h3>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {latest.map((j) => <JobCard key={j.id} job={j} />)}
                </div>
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-green/[0.18] bg-[linear-gradient(150deg,rgba(11,115,39,0.10),rgba(17,17,17,0.03))] p-5">
              <p className="text-[14px] text-ink">
                <span className="font-semibold">{t("landing.jobs.hiringTitle", "Hiring?")}</span>{" "}
                {t("landing.jobs.hiringBody", "Post your first job free and manage applicants on one board.")}
              </p>
              <Link to="/jobs/employer/post"
                    className="inline-flex h-10 items-center rounded-xl bg-ink px-4 text-[13.5px] font-semibold text-white transition hover:brightness-110">
                {t("landing.jobs.postJob", "Post a job")}
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
