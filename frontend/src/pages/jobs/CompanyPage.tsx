import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, Globe, MapPin, Users } from "lucide-react";
import { JobsShell, Spinner, CompanyLogo, EmptyState } from "../../components/jobs/ui";
import JobCard from "../../components/jobs/JobCard";
import { api } from "../../lib/api";
import { jobsApi, type JobCardData, type Page } from "../../services/jobs";
import { useUserScope } from "../../auth/useUserScope";
import { useTranslation } from "react-i18next";

/** /jobs/company/:slug — public company page with its open jobs. */
export default function CompanyPage() {
  const { t } = useTranslation();
  const { slug = "" } = useParams();
  const scope = useUserScope();
  const company = useQuery({ queryKey: ["jobs", scope, "company-page", slug], queryFn: () => jobsApi.company(slug) });
  const jobs = useQuery({
    queryKey: ["jobs", scope, "company-jobs", slug],
    queryFn: async () => (await api.get<Page<JobCardData>>(`/jobs/employers/${slug}/jobs/`)).data,
  });
  if (company.isLoading) return <JobsShell><Spinner /></JobsShell>;
  const c = company.data;
  if (!c) return <JobsShell><EmptyState icon={<Users size={20} />} title={t("jobs.companyPage.companyNotFound")} /></JobsShell>;

  return (
    <JobsShell>
      <section className="overflow-hidden rounded-2xl border border-hairline bg-paper">
        <div className="h-28 sm:h-40" style={c.cover_url
          ? { backgroundImage: `url(${c.cover_url})`, backgroundSize: "cover", backgroundPosition: "center" }
          : { background: `linear-gradient(135deg, ${c.brand_color || "#0B7327"}33, #11111110)` }} />
        <div className="-mt-10 px-5 pb-5">
          <CompanyLogo url={c.logo_url} name={c.company_name} size={76} />
          <h1 className="mt-3 flex items-center gap-1.5 font-display text-[22px] font-semibold text-ink">
            {c.company_name}{c.is_verified && <BadgeCheck size={19} className="text-brand-green" aria-label={t("jobs.companyPage.verifiedEmployer")} />}
          </h1>
          {c.tagline && <p className="text-[14px] text-muted">{c.tagline}</p>}
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted">
            {c.headquarters && <span className="inline-flex items-center gap-1"><MapPin size={14} /> {c.headquarters}</span>}
            {c.company_size && <span className="inline-flex items-center gap-1"><Users size={14} />{" "}{t("jobs.companyPage.companySizePeople", { company_size: c.company_size })}</span>}
            {c.website && <a href={c.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand-green hover:underline"><Globe size={14} />{" "}{t("jobs.companyPage.website")}</a>}
          </div>
          {c.description && <p className="mt-4 whitespace-pre-line text-[14px] leading-relaxed text-ink/90">{c.description}</p>}
        </div>
      </section>
      <h2 className="mb-3 mt-6 font-display text-[17px] font-semibold text-ink">{t("jobs.companyPage.openJobs")}{jobs.data ? ` (${jobs.data.count})` : ""}</h2>
      {jobs.isLoading ? <Spinner /> : (jobs.data?.results.length ?? 0) === 0 ? (
        <p className="rounded-2xl border border-hairline bg-paper p-5 text-[13.5px] text-muted">{t("jobs.companyPage.noOpenJobsRightNow")}</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">{jobs.data!.results.map((j) => <JobCard key={j.id} job={j} />)}</div>
      )}
    </JobsShell>
  );
}
