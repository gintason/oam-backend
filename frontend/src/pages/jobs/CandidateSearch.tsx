import { useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Search, Lock, ArrowLeft, FileText, Mail, Phone, MessageSquare, UsersRound } from "lucide-react";
import {
  JobsShell, Spinner, EmptyState, Button, Avatar, TextInput, Select, ErrorNote,
} from "../../components/jobs/ui";
import UpgradeSheet from "../../components/jobs/UpgradeSheet";
import { jobsApi, jobsErrorCode, UPGRADE_CODES } from "../../services/jobs";
import { apiErrorMessage } from "../../lib/api";
import { useDebounced } from "../../hooks/useDebounced";
import { useUserScope } from "../../auth/useUserScope";
import { useTranslation } from "react-i18next";

/** /jobs/employer/candidates — search the candidate database (Premium/Pro). */
export default function CandidateSearch() {
  const { t: tr } = useTranslation();
  const scope = useUserScope();
  const [q, setQ] = useState("");
  const [skills, setSkills] = useState("");
  const [level, setLevel] = useState("");
  const [location, setLocation] = useState("");
  const dq = useDebounced(`${q}|${skills}|${level}|${location}`, 400);
  const [upgrade, setUpgrade] = useState<string | null>(null);

  const usage = useQuery({ queryKey: ["jobs", scope, "subscription"], queryFn: jobsApi.subscription });
  const allowed = usage.data?.plan.candidate_search;
  const params: Record<string, string> = { open_to_work: "1" };
  if (q.trim()) params.q = q.trim();
  if (skills.trim()) params.skills = skills.trim();
  if (level) params.experience_level = level;
  if (location.trim()) params.location = location.trim();

  const results = useQuery({
    queryKey: ["jobs", scope, "candidate-search", dq],
    queryFn: () => jobsApi.searchCandidates(params),
    enabled: Boolean(allowed),
  });

  return (
    <JobsShell side="employer">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="font-display text-[22px] font-semibold text-ink">{tr("jobs.candidateSearch.candidateDatabase")}</h1>
          <p className="text-[13.5px] text-muted">{tr("jobs.candidateSearch.findPeopleWhoHavenT")}</p>
        </div>
        {usage.data && allowed && usage.data.candidate_views_per_month != null && (
          <p className="text-[12.5px] text-muted tabular">
            {tr("jobs.candidateSearch.profileViewsThisMonth")}{" "}<span className="font-semibold text-ink">{usage.data.candidate_views_used} / {usage.data.candidate_views_per_month}</span>
          </p>
        )}
      </div>

      {usage.isLoading ? <Spinner /> : !allowed ? (
        <div className="mt-5">
          <EmptyState icon={<Lock size={20} />} title={tr("jobs.candidateSearch.searchCandidatesOnPremiumOr")}
                      body={tr("jobs.candidateSearch.searchOpenToWorkCandidates")}
                      action={<Button onClick={() => setUpgrade("upgrade_required")}>{tr("jobs.candidateSearch.seePlans")}</Button>} />
        </div>
      ) : (
        <>
          <div className="mt-4 grid gap-2 sm:grid-cols-[1.5fr_1fr_160px_1fr]">
            <label className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <TextInput className="pl-9" placeholder={tr("jobs.candidateSearch.keywords")} value={q} onChange={(e) => setQ(e.target.value)} aria-label={tr("jobs.candidateSearch.keywords")} />
            </label>
            <TextInput placeholder={tr("jobs.candidateSearch.skillsCommaSeparated")} value={skills} onChange={(e) => setSkills(e.target.value)} aria-label={tr("jobs.candidateSearch.skills")} />
            <Select value={level} onChange={(e) => setLevel(e.target.value)} aria-label={tr("jobs.candidateSearch.level")}>
              <option value="">{tr("jobs.candidateSearch.anyLevel")}</option>
              <option value="entry">{tr("jobs.candidateSearch.entry")}</option><option value="mid">{tr("jobs.candidateSearch.mid")}</option><option value="senior">{tr("jobs.candidateSearch.senior")}</option>
              <option value="lead">{tr("jobs.candidateSearch.lead")}</option><option value="executive">{tr("jobs.candidateSearch.executive")}</option>
            </Select>
            <TextInput placeholder={tr("jobs.candidateSearch.city")} value={location} onChange={(e) => setLocation(e.target.value)} aria-label={tr("jobs.candidateSearch.city")} />
          </div>
          <div className="mt-4">
            {results.isLoading ? <Spinner /> : (results.data?.results.length ?? 0) === 0 ? (
              <EmptyState icon={<UsersRound size={20} />} title={tr("jobs.candidateSearch.noCandidatesMatch")} body={tr("jobs.candidateSearch.tryFewerSkillsOrA")} />
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {results.data!.results.map((c) => (
                  <Link key={c.id} to={`/jobs/employer/candidates/${c.id}`}
                        className="flex items-start gap-3 rounded-2xl border border-hairline bg-paper p-4 hover:border-brand-green/40">
                    <Avatar name={c.display_name} url={c.photo_url} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-ink">{c.display_name}</p>
                      <p className="truncate text-[12.5px] text-muted">{c.headline || "—"}</p>
                      <p className="mt-1 text-[12px] text-muted">{[[c.location, c.country].filter(Boolean).join(", "), `${c.years_experience} yrs`].filter(Boolean).join(" · ")}</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {c.skills.slice(0, 5).map((s) => <span key={s} className="rounded bg-mist px-1.5 py-0.5 text-[11.5px] text-ink">{s}</span>)}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </>
      )}
      <UpgradeSheet open={Boolean(upgrade)} reason={upgrade ?? undefined} onClose={() => setUpgrade(null)} />
    </JobsShell>
  );
}

/** /jobs/employer/candidates/:id — full profile (counts against the monthly view quota). */
export function CandidateView() {
  const { t: tr } = useTranslation();
  const { id = "" } = useParams();
  const [params] = useSearchParams();
  const scope = useUserScope();
  const navigate = useNavigate();
  const [upgrade, setUpgrade] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  const c = useQuery({ queryKey: ["jobs", scope, "candidate-view", id], queryFn: () => jobsApi.candidate(id), retry: false });

  const viewCode = c.error ? jobsErrorCode(c.error) : undefined;
  const [dismissed, setDismissed] = useState(false);
  const blockedBy = viewCode && UPGRADE_CODES.has(viewCode) && !dismissed ? viewCode : null;

  const message = useMutation({
    mutationFn: () => jobsApi.directThread(id, undefined, params.get("job") || undefined),
    onSuccess: (t) => navigate(`/jobs/messages/${t.id}`),
    onError: (err) => {
      const code = jobsErrorCode(err);
      if (code && UPGRADE_CODES.has(code)) setUpgrade(code);
      else setError(apiErrorMessage(err, tr("jobs.candidateSearch.couldnTStartAConversation")));
    },
  });

  return (
    <JobsShell side="employer">
      <button onClick={() => navigate(-1)} className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink"><ArrowLeft size={15} />{" "}{tr("jobs.candidateSearch.back")}</button>
      {c.isLoading ? <Spinner /> : !c.data ? (
        <ErrorNote>{apiErrorMessage(c.error, tr("jobs.candidateSearch.thisProfileIsnTAvailable"))}</ErrorNote>
      ) : (
        <div className="space-y-4">
          <section className="rounded-2xl border border-hairline bg-paper p-5">
            <div className="flex flex-wrap items-center gap-4">
              <Avatar name={c.data.display_name} url={c.data.photo_url} size={60} />
              <div className="min-w-0 flex-1">
                <h1 className="font-display text-[20px] font-semibold text-ink">{c.data.display_name}</h1>
                <p className="text-[13.5px] text-muted">{c.data.headline}</p>
                <p className="text-[12.5px] text-muted">{[[c.data.location, c.data.country].filter(Boolean).join(", "), `${c.data.years_experience} years experience`].filter(Boolean).join(" · ")}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {c.data.cv_url && <Button size="sm" variant="secondary" onClick={() => window.open(c.data!.cv_url, "_blank", "noopener")}><FileText size={14} />{" "}{tr("jobs.candidateSearch.cv")}</Button>}
              <Button size="sm" onClick={() => message.mutate()} loading={message.isPending}><MessageSquare size={14} />{" "}{tr("jobs.candidateSearch.message")}</Button>
              {c.data.email && <a href={`mailto:${c.data.email}`} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-hairline px-3 text-[12.5px] font-semibold text-ink hover:bg-mist"><Mail size={14} /> {c.data.email}</a>}
              {c.data.phone && <a href={`tel:${c.data.phone}`} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-hairline px-3 text-[12.5px] font-semibold text-ink hover:bg-mist"><Phone size={14} /> {c.data.phone}</a>}
            </div>
            <div className="mt-3"><ErrorNote>{error}</ErrorNote></div>
          </section>
          {c.data.summary && <section className="rounded-2xl border border-hairline bg-paper p-5"><h2 className="font-display text-[16px] font-semibold text-ink">{tr("jobs.candidateSearch.summary")}</h2><p className="mt-2 whitespace-pre-line text-[14px] leading-relaxed text-ink/90">{c.data.summary}</p></section>}
          {c.data.skills.length > 0 && <section className="rounded-2xl border border-hairline bg-paper p-5"><h2 className="font-display text-[16px] font-semibold text-ink">{tr("jobs.candidateSearch.skills")}</h2><div className="mt-2 flex flex-wrap gap-1.5">{c.data.skills.map((s) => <span key={s} className="rounded-md bg-mist px-2.5 py-1 text-[12.5px] text-ink">{s}</span>)}</div></section>}
          {c.data.experience.length > 0 && (
            <section className="rounded-2xl border border-hairline bg-paper p-5">
              <h2 className="font-display text-[16px] font-semibold text-ink">{tr("jobs.candidateSearch.experience")}</h2>
              <ul className="mt-3 space-y-3">{c.data.experience.map((x, i) => (
                <li key={i}><p className="text-[14px] font-medium text-ink">{x.title} · {x.company}</p><p className="text-[12.5px] text-muted">{[x.start, x.end].filter(Boolean).join(" – ")}</p>{x.description && <p className="mt-1 text-[13px] text-ink/90">{x.description}</p>}</li>
              ))}</ul>
            </section>
          )}
        </div>
      )}
      <UpgradeSheet open={Boolean(upgrade || blockedBy)} reason={upgrade ?? blockedBy ?? undefined}
                    onClose={() => { setUpgrade(null); setDismissed(true); }} />
    </JobsShell>
  );
}
