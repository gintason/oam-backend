import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, LayoutGrid, List, Lock, X, FileText, MessageSquare, Star, Mail, Phone,
  Sparkles, PartyPopper, Pencil, ExternalLink,
} from "lucide-react";
import {
  JobsShell, Spinner, Button, Avatar, MatchBadge, StatusPill, JobStatusPill, ErrorNote, Select,
  TextArea, Chip,
} from "../../components/jobs/ui";
import UpgradeSheet from "../../components/jobs/UpgradeSheet";
import {
  jobsApi, jobsErrorCode, UPGRADE_CODES, STATUS_LABEL, timeAgo,
  type ApplicationStatus, type EmployerApplication, type Pipeline as PipelineData, type CandidateFull,
  type ScreeningQuestion,
} from "../../services/jobs";
import { apiErrorMessage } from "../../lib/api";
import { useJobsSocket } from "../../lib/jobsSocket";
import { useUserScope } from "../../auth/useUserScope";
import { useTranslation } from "react-i18next";

type Tab = "pipeline" | "matches" | "analytics";

/** /jobs/employer/jobs/:id — applicants for one job: kanban or list, plus matches and stats. */
export default function Pipeline() {
  const { t: tr } = useTranslation();
  const { id = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const scope = useUserScope();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("pipeline");
  const [view, setView] = useState<"board" | "list">(() => (window.innerWidth < 768 ? "list" : "board"));
  const [openApp, setOpenApp] = useState<string | null>(null);
  const [upgrade, setUpgrade] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  const [dragOver, setDragOver] = useState<ApplicationStatus | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const justPublished = params.get("published") === "1";

  const key = ["jobs", scope, "pipeline", id];
  const job = useQuery({ queryKey: ["jobs", scope, "owned", id], queryFn: () => jobsApi.ownedJob(id) });
  const pipe = useQuery({ queryKey: key, queryFn: () => jobsApi.pipeline(id) });

  useJobsSocket((e) => {
    if ((e.type === "application.created" || e.type === "application.updated") && e.data.job_id === id) {
      qc.invalidateQueries({ queryKey: key });
    }
  });

  function fail(err: unknown) {
    const code = jobsErrorCode(err);
    if (code && UPGRADE_CODES.has(code)) setUpgrade(code);
    else setError(apiErrorMessage(err, tr("jobs.pipeline.couldnTMoveThatApplicant")));
  }

  // Optimistic move: shift the card between columns now, reconcile on reply.
  const move = useMutation({
    mutationFn: ({ appId, status }: { appId: string; status: ApplicationStatus }) =>
      jobsApi.moveApplication(appId, { status }),
    onMutate: async ({ appId, status }) => {
      setError(undefined);
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<PipelineData>(key);
      if (prev) {
        let card: EmployerApplication | undefined;
        const cols = prev.columns.map((c) => {
          const found = c.results.find((a) => a.id === appId);
          if (found) card = { ...found, status };
          return { ...c, results: c.results.filter((a) => a.id !== appId) };
        });
        const next = cols.map((c) => (c.status === status && card ? { ...c, results: [card, ...c.results] } : c))
          .map((c) => ({ ...c, count: c.results.length }));
        qc.setQueryData(key, { ...prev, columns: next });
      }
      return { prev };
    },
    onError: (err, _v, ctx) => { if (ctx?.prev) qc.setQueryData(key, ctx.prev); fail(err); },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: key });
      qc.invalidateQueries({ queryKey: ["jobs", scope, "application"] });
    },
  });

  const bulk = useMutation({
    mutationFn: (status: ApplicationStatus) => jobsApi.bulkMove([...selected], status),
    onSuccess: (r) => {
      setSelected(new Set());
      if (r.failed.length) setError(tr("jobs.pipeline.couldntMove", { n: r.failed.length, detail: r.failed[0].detail }));
      qc.invalidateQueries({ queryKey: key });
    },
    onError: fail,
  });

  const j = job.data;
  const cols = pipe.data?.columns ?? [];
  const all = cols.flatMap((c) => c.results);

  return (
    <JobsShell side="employer" wide>
      <Link to="/jobs/employer" className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink">
        <ArrowLeft size={15} />{" "}{tr("jobs.pipeline.allJobs")}
      </Link>

      {justPublished && (
        <div className="mb-4 flex items-start justify-between gap-3 rounded-2xl border border-brand-green/25 bg-brand-green/5 p-4">
          <p className="flex items-center gap-2 text-[14px] text-ink">
            <PartyPopper size={18} className="text-brand-green" />
            <span><span className="font-semibold">{tr("jobs.pipeline.yourJobIsLive")}</span>{" "}{tr("jobs.pipeline.candidatesWithMatchingAlertsAre")}</span>
          </p>
          <button onClick={() => { params.delete("published"); setParams(params, { replace: true }); }} aria-label={tr("jobs.pipeline.dismiss")} className="text-muted hover:text-ink"><X size={16} /></button>
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-[22px] font-semibold text-ink">{j?.title ?? "…"}</h1>
            {j && <JobStatusPill status={j.status} />}
          </div>
          <p className="text-[13px] text-muted">{tr("jobs.pipeline.applicantCount", { count: all.length })}{j ? ` · ${tr("jobs.pipeline.viewCount", { count: j.views_count })}` : ""}</p>
        </div>
        <div className="flex gap-2">
          {j?.status === "active" && (
            <Button size="sm" variant="secondary" to={`/jobs/${id}`}><ExternalLink size={14} />{" "}{tr("jobs.pipeline.viewListing")}</Button>
          )}
          <Button size="sm" variant="secondary" to={`/jobs/employer/jobs/${id}/edit`}><Pencil size={14} />{" "}{tr("jobs.pipeline.edit")}</Button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-b border-hairline">
        <div className="flex gap-1">
          {(["pipeline", "matches", "analytics"] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)}
                    className={`border-b-2 px-3 py-2.5 text-[13.5px] font-medium capitalize ${tab === t ? "border-brand-green text-ink" : "border-transparent text-muted hover:text-ink"}`}>
              {t === "matches" ? <span className="inline-flex items-center gap-1"><Sparkles size={14} />{" "}{tr("jobs.pipeline.smartMatches")}</span> : t}
            </button>
          ))}
        </div>
        {tab === "pipeline" && (
          <div className="mb-2 flex gap-1 rounded-lg bg-paper p-0.5">
            <button onClick={() => setView("board")} aria-pressed={view === "board"} className={`rounded-md px-2.5 py-1.5 ${view === "board" ? "bg-mist text-ink" : "text-muted"}`} aria-label={tr("jobs.pipeline.boardView")}><LayoutGrid size={15} /></button>
            <button onClick={() => setView("list")} aria-pressed={view === "list"} className={`rounded-md px-2.5 py-1.5 ${view === "list" ? "bg-mist text-ink" : "text-muted"}`} aria-label={tr("jobs.pipeline.listView")}><List size={15} /></button>
          </div>
        )}
      </div>

      <div className="mt-4"><ErrorNote>{error}</ErrorNote></div>

      {tab === "pipeline" && (
        pipe.isLoading ? <Spinner /> : (
          <>
            {(pipe.data?.locked_count ?? 0) > 0 && (
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-hairline bg-paper p-3.5">
                <p className="flex items-center gap-2 text-[13.5px] text-ink">
                  <Lock size={15} className="text-muted" />{" "}{tr("jobs.pipeline.lockedApplicants", { count: pipe.data!.locked_count })}
                </p>
                <Button size="sm" onClick={() => setUpgrade("upgrade_required")}>{tr("jobs.pipeline.unlockAll")}</Button>
              </div>
            )}

            {view === "board" ? (
              <div className="-mx-3 flex gap-3 overflow-x-auto px-3 pb-3 sm:-mx-5 sm:px-5">
                {cols.map((col) => (
                  <section
                    key={col.status}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(col.status); }}
                    onDragLeave={() => setDragOver((d) => (d === col.status ? null : d))}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOver(null);
                      const appId = e.dataTransfer.getData("text/plain");
                      const from = all.find((a) => a.id === appId);
                      if (from && from.status !== col.status) move.mutate({ appId, status: col.status });
                    }}
                    className={`flex w-[264px] shrink-0 flex-col rounded-2xl border p-2.5 transition ${dragOver === col.status ? "border-brand-green bg-brand-green/5" : "border-hairline bg-paper/60"}`}
                    aria-label={tr("jobs.pipeline.labelColumn", { label: col.label })}
                  >
                    <header className="mb-2 flex items-center justify-between px-1">
                      <h2 className="text-[13px] font-semibold text-ink">{col.label}</h2>
                      <span className="rounded-full bg-mist px-2 text-[12px] font-semibold text-muted tabular">{col.count}</span>
                    </header>
                    <div className="flex min-h-[120px] flex-col gap-2">
                      {col.results.map((a) => (
                        <ApplicantCard key={a.id} app={a} onOpen={() => setOpenApp(a.id)} />
                      ))}
                      {col.results.length === 0 && (
                        <p className="rounded-xl border border-dashed border-hairline p-3 text-center text-[12px] text-muted">{tr("jobs.pipeline.dropHere")}</p>
                      )}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-hairline bg-paper">
                {selected.size > 0 && (
                  <div className="flex flex-wrap items-center gap-2 border-b border-hairline bg-mist px-4 py-2.5">
                    <span className="text-[13px] font-medium text-ink">{selected.size}{" "}{tr("jobs.pipeline.selected")}</span>
                    <Select className="h-8 w-auto text-[13px]" defaultValue="" aria-label={tr("jobs.pipeline.moveSelectedTo")}
                            onChange={(e) => { if (e.target.value) bulk.mutate(e.target.value as ApplicationStatus); e.target.value = ""; }}>
                      <option value="" disabled>{tr("jobs.pipeline.moveTo")}</option>
                      {cols.map((c) => <option key={c.status} value={c.status}>{c.label}</option>)}
                    </Select>
                  </div>
                )}
                {all.length === 0 ? (
                  <p className="p-6 text-center text-[13.5px] text-muted">{tr("jobs.pipeline.noApplicantsYet")}</p>
                ) : (
                  <ul className="divide-y divide-hairline">
                    {all.map((a) => (
                      <li key={a.id} className="flex items-center gap-3 px-4 py-3">
                        <input type="checkbox" disabled={a.locked} checked={selected.has(a.id)} aria-label={tr("jobs.pipeline.selectDisplayName", { display_name: a.candidate.display_name })}
                               onChange={(e) => setSelected((s) => { const n = new Set(s); if (e.target.checked) n.add(a.id); else n.delete(a.id); return n; })} />
                        <button onClick={() => setOpenApp(a.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                          <Avatar name={a.candidate.display_name} url={"photo_url" in a.candidate ? a.candidate.photo_url : undefined} size={36} />
                          <span className="min-w-0">
                            <span className="block truncate text-[14px] font-semibold text-ink">{a.candidate.display_name}</span>
                            <span className="block truncate text-[12.5px] text-muted">{"headline" in a.candidate ? a.candidate.headline : ""}</span>
                          </span>
                        </button>
                        <span className="hidden sm:block"><MatchBadge score={a.match_score} /></span>
                        <StatusPill status={a.status} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </>
        )
      )}

      {tab === "matches" && <Matches jobId={id} onUpgrade={setUpgrade} />}
      {tab === "analytics" && <JobStats jobId={id} />}

      {openApp && (
        <ApplicantDrawer
          appId={openApp}
          statuses={cols.map((c) => c.status)}
          questions={j?.screening_questions ?? []}
          onClose={() => setOpenApp(null)}
          onMove={(status) => move.mutate({ appId: openApp, status })}
          onError={fail}
        />
      )}
      <UpgradeSheet open={Boolean(upgrade)} reason={upgrade ?? undefined} onClose={() => setUpgrade(null)} />
    </JobsShell>
  );
}

function ApplicantCard({ app, onOpen }: { app: EmployerApplication; onOpen: () => void }) {
  const { t: tr } = useTranslation();
  const c = app.candidate;
  return (
    <button
      type="button"
      draggable={!app.locked}
      onDragStart={(e) => { e.dataTransfer.setData("text/plain", app.id); e.dataTransfer.effectAllowed = "move"; }}
      onClick={onOpen}
      className={`rounded-xl border border-hairline bg-paper p-3 text-left shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:border-brand-green/40 ${app.locked ? "cursor-default opacity-70" : "cursor-grab active:cursor-grabbing"}`}
    >
      {app.locked ? (
        <p className="flex items-center gap-1.5 text-[12.5px] text-muted"><Lock size={13} />{" "}{tr("jobs.pipeline.upgradeToView")}</p>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <Avatar name={c.display_name} url={"photo_url" in c ? c.photo_url : undefined} size={30} />
            <div className="min-w-0">
              <p className="truncate text-[13.5px] font-semibold text-ink">{c.display_name}</p>
              <p className="truncate text-[11.5px] text-muted">{"headline" in c ? c.headline : ""}</p>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <MatchBadge score={app.match_score} compact />
            <span className="flex items-center gap-1.5 whitespace-nowrap text-[11px] text-muted">
              {app.employer_rating ? <span className="inline-flex items-center gap-0.5"><Star size={11} className="fill-current" />{app.employer_rating}</span> : null}
              {!app.viewed_by_employer_at && <span className="rounded bg-brand-red/10 px-1 font-semibold text-brand-red">{tr("jobs.pipeline.new")}</span>}
              {timeAgo(app.created_at)}
            </span>
          </div>
        </>
      )}
    </button>
  );
}

function ApplicantDrawer({
  appId, statuses, questions, onClose, onMove, onError,
}: { appId: string; statuses: ApplicationStatus[]; questions: ScreeningQuestion[]; onClose: () => void; onMove: (s: ApplicationStatus) => void; onError: (e: unknown) => void }) {
  const { t: tr } = useTranslation();
  const scope = useUserScope();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const app = useQuery({ queryKey: ["jobs", scope, "application", appId], queryFn: () => jobsApi.application(appId) });
  const [notesDraft, setNotes] = useState<string | null>(null);
  const notes = notesDraft ?? app.data?.employer_notes ?? "";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const saveNotes = useMutation({
    mutationFn: (body: { employer_rating?: number | null; employer_notes?: string }) => jobsApi.saveNotes(appId, body),
    onSuccess: (d) => qc.setQueryData(["jobs", scope, "application", appId], d),
    onError,
  });
  const chat = useMutation({
    mutationFn: () => jobsApi.threadForApplication(appId),
    onSuccess: (t) => navigate(`/jobs/messages/${t.id}`),
    onError,
  });

  const a = app.data;
  const c = a && !a.locked ? (a.candidate as CandidateFull) : null;

  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-black/40" onClick={onClose}>
      <aside role="dialog" aria-modal="true" aria-label={tr("jobs.pipeline.applicant2")}
             className="h-full w-full max-w-md overflow-y-auto bg-paper shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 flex items-center justify-between border-b border-hairline bg-paper px-5 py-3">
          <p className="text-[13px] font-medium text-muted">{tr("jobs.pipeline.applicant2")}</p>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted hover:bg-mist" aria-label={tr("jobs.pipeline.close")}><X size={18} /></button>
        </div>
        {!a ? <Spinner /> : a.locked || !c ? (
          <p className="p-5 text-[14px] text-muted">{tr("jobs.pipeline.thisApplicantIsHiddenOn")}</p>
        ) : (
          <div className="space-y-5 p-5">
            <div className="flex items-center gap-3">
              <Avatar name={c.display_name} url={c.photo_url} size={52} />
              <div className="min-w-0">
                <h2 className="font-display text-[18px] font-semibold text-ink">{c.display_name}</h2>
                <p className="text-[13px] text-muted">{c.headline}</p>
                <p className="text-[12px] text-muted">{[[c.location, c.country].filter(Boolean).join(", "), `${c.years_experience} yrs experience`].filter(Boolean).join(" · ")}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {a.cv_url && <Button size="sm" variant="secondary" onClick={() => window.open(a.cv_url!, "_blank", "noopener")}><FileText size={14} />{" "}{tr("jobs.pipeline.cv")}</Button>}
              <Button size="sm" variant="secondary" onClick={() => chat.mutate()} loading={chat.isPending}><MessageSquare size={14} />{" "}{tr("jobs.pipeline.message")}</Button>
              {c.email && <a href={`mailto:${c.email}`} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-hairline px-3 text-[12.5px] font-semibold text-ink hover:bg-mist"><Mail size={14} />{" "}{tr("jobs.pipeline.email")}</a>}
              {c.phone && <a href={`tel:${c.phone}`} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-hairline px-3 text-[12.5px] font-semibold text-ink hover:bg-mist"><Phone size={14} />{" "}{tr("jobs.pipeline.call")}</a>}
            </div>

            <div>
              <p className="mb-1.5 text-[12.5px] font-semibold text-ink">{tr("jobs.pipeline.stage")}</p>
              <div className="flex flex-wrap gap-1.5">
                {statuses.map((s) => (
                  <Chip key={s} active={a.status === s} onClick={() => a.status !== s && onMove(s)}>{STATUS_LABEL[s]}</Chip>
                ))}
              </div>
            </div>

            {(() => {
              const has = a.match_details?.matched_skills ?? [];
              const missing = a.match_details?.missing_skills ?? [];
              return (
                <div className="rounded-xl bg-mist p-3">
                  <div className="flex items-center justify-between"><p className="text-[13px] font-semibold text-ink">{tr("jobs.pipeline.match")}</p><MatchBadge score={a.match_score} /></div>
                  {has.length > 0 && <p className="mt-1.5 text-[12.5px] text-ink">{tr("jobs.pipeline.has")}{" "}{has.join(", ")}</p>}
                  {missing.length > 0 && <p className="mt-0.5 text-[12.5px] text-muted">{tr("jobs.pipeline.missing")}{" "}{missing.join(", ")}</p>}
                </div>
              );
            })()}

            {a.cover_letter && (
              <div><p className="mb-1 text-[12.5px] font-semibold text-ink">{tr("jobs.pipeline.coverNote")}</p><p className="whitespace-pre-line text-[13.5px] leading-relaxed text-ink/90">{a.cover_letter}</p></div>
            )}
            {(a.answers?.length ?? 0) > 0 && (
              <div><p className="mb-1 text-[12.5px] font-semibold text-ink">{tr("jobs.pipeline.screeningAnswers")}</p>
                <ul className="space-y-2 text-[13px]">{a.answers!.map((x) => <li key={x.id}><p className="text-muted">{questions.find((q) => q.id === x.id)?.question ?? tr("jobs.pipeline.question")}</p><p className="text-ink">{x.answer || "—"}</p></li>)}</ul>
              </div>
            )}
            {(c.skills?.length ?? 0) > 0 && (
              <div><p className="mb-1.5 text-[12.5px] font-semibold text-ink">{tr("jobs.pipeline.skills")}</p>
                <div className="flex flex-wrap gap-1">{c.skills.map((s) => <span key={s} className="rounded bg-mist px-2 py-0.5 text-[12px] text-ink">{s}</span>)}</div>
              </div>
            )}
            {(c.experience?.length ?? 0) > 0 && (
              <div><p className="mb-1.5 text-[12.5px] font-semibold text-ink">{tr("jobs.pipeline.experience")}</p>
                <ul className="space-y-2">{c.experience.map((x, i) => (
                  <li key={i} className="text-[13px]"><p className="font-medium text-ink">{x.title} · {x.company}</p><p className="text-muted">{[x.start, x.end].filter(Boolean).join(" – ")}</p></li>
                ))}</ul>
              </div>
            )}

            <div className="border-t border-hairline pt-4">
              <p className="mb-1.5 text-[12.5px] font-semibold text-ink">{tr("jobs.pipeline.yourRatingPrivate")}</p>
              <div className="flex gap-1" role="radiogroup" aria-label={tr("jobs.pipeline.rating")}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} role="radio" aria-checked={a.employer_rating === n} aria-label={tr("jobs.pipeline.stars", { count: n })}
                          onClick={() => saveNotes.mutate({ employer_rating: a.employer_rating === n ? null : n })}
                          className="p-0.5 text-warn">
                    <Star size={20} className={(a.employer_rating ?? 0) >= n ? "fill-current" : ""} />
                  </button>
                ))}
              </div>
              <p className="mb-1.5 mt-3 text-[12.5px] font-semibold text-ink">{tr("jobs.pipeline.notesPrivate")}</p>
              <TextArea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
                        onBlur={() => notes !== a.employer_notes && saveNotes.mutate({ employer_notes: notes })} aria-label={tr("jobs.pipeline.notes")} />
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

function Matches({ jobId, onUpgrade }: { jobId: string; onUpgrade: (c: string) => void }) {
  const { t: tr } = useTranslation();
  const scope = useUserScope();
  const navigate = useNavigate();
  const m = useQuery({ queryKey: ["jobs", scope, "matches", jobId], queryFn: () => jobsApi.matches(jobId), retry: false });
  useEffect(() => {
    const code = m.error ? jobsErrorCode(m.error) : undefined;
    if (code && UPGRADE_CODES.has(code)) onUpgrade(code);
  }, [m.error]); // eslint-disable-line react-hooks/exhaustive-deps
  if (m.isLoading) return <Spinner />;
  if (m.isError) return <p className="rounded-2xl border border-hairline bg-paper p-5 text-[13.5px] text-muted">{tr("jobs.pipeline.smartMatchingIsOnPremium")}</p>;
  if (!m.data?.results.length) return <p className="rounded-2xl border border-hairline bg-paper p-5 text-[13.5px] text-muted">{tr("jobs.pipeline.noStrongMatchesInThe")}</p>;
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {m.data.results.map((c) => (
        <button key={c.id} onClick={() => navigate(`/jobs/employer/candidates/${c.id}?job=${jobId}`)}
                className="flex items-start gap-3 rounded-2xl border border-hairline bg-paper p-4 text-left hover:border-brand-green/40">
          <Avatar name={c.display_name} url={c.photo_url} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2"><p className="truncate font-semibold text-ink">{c.display_name}</p><MatchBadge score={c.match.score} /></div>
            <p className="truncate text-[12.5px] text-muted">{c.headline}</p>
            {(c.match.matched_skills?.length ?? 0) > 0 && <p className="mt-1 truncate text-[12px] text-ink">{tr("jobs.pipeline.has")}{" "}{c.match.matched_skills.join(", ")}</p>}
          </div>
        </button>
      ))}
    </div>
  );
}

function JobStats({ jobId }: { jobId: string }) {
  const { t: tr } = useTranslation();
  const scope = useUserScope();
  const s = useQuery({ queryKey: ["jobs", scope, "job-analytics", jobId], queryFn: () => jobsApi.jobAnalytics(jobId) });
  if (s.isLoading || !s.data) return <Spinner />;
  const d = s.data;
  const buckets = Object.entries(d.match_distribution);
  const max = Math.max(1, ...buckets.map(([, n]) => n));
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="grid grid-cols-2 gap-3">
        {[[tr("jobs.pipeline.views"), d.views], [tr("jobs.pipeline.applicants"), d.applications], [tr("jobs.pipeline.viewApply"), `${d.conversion}%`], [tr("jobs.pipeline.saves"), d.saves]].map(([l, v]) => (
          <div key={String(l)} className="rounded-2xl border border-hairline bg-paper p-4">
            <p className="text-[11.5px] font-semibold uppercase tracking-wide text-muted">{l}</p>
            <p className="mt-1 font-display text-[22px] font-bold text-ink tabular">{v}</p>
          </div>
        ))}
      </div>
      <section className="rounded-2xl border border-hairline bg-paper p-4">
        <h3 className="font-display text-[15px] font-semibold text-ink">{tr("jobs.pipeline.applicantMatchScores")}</h3>
        <ul className="mt-3 space-y-2.5">
          {buckets.map(([label, n]) => (
            <li key={label} className="grid grid-cols-[64px_1fr_32px] items-center gap-2 text-[12.5px]">
              <span className="text-muted">{label}%</span>
              <div className="h-[16px]"><div className="h-full rounded-r-[4px] bg-brand-green" style={{ width: `${(n / max) * 100}%`, minWidth: n ? 4 : 0 }} /></div>
              <span className="text-right font-semibold text-ink tabular">{n}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
