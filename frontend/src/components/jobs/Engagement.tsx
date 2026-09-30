/**
 * Views · likes · comments · share for job posts — mirrors the marketplace.
 *  - <CardEngagement job>        compact row on job cards (like + share work in place;
 *                                the rest of the row still opens the job)
 *  - <EngagementBar job onComments>  pill buttons on the job page
 *  - <JobComments jobId>         the comments list + "Write a comment…"
 */
import { useRef, useState, type MouseEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Heart, MessageCircle, Send, Share2, BadgeCheck, Loader2 } from "lucide-react";
import { jobsApi, timeAgo, type JobCardData, type JobComment } from "../../services/jobs";
import { apiErrorMessage } from "../../lib/api";
import { useUserScope } from "../../auth/useUserScope";

type Engageable = Pick<JobCardData, "id" | "title" | "views_count" | "likes_count" | "comments_count" | "liked">
  & { employer?: { company_name?: string } };

/** Native share sheet where available, otherwise copy the link. */
async function shareJob(job: Engageable): Promise<"shared" | "copied" | "cancelled"> {
  const url = `${window.location.origin}/jobs/${job.id}`;
  const text = job.employer?.company_name ? `${job.title} at ${job.employer.company_name} — on OAM` : `${job.title} — on OAM`;
  try {
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
    if (nav.share) { await nav.share({ title: job.title, text, url }); return "shared"; }
    await navigator.clipboard.writeText(url);
    return "copied";
  } catch {
    return "cancelled";
  }
}

/** Optimistic like toggle; keeps its own count so lists don't need refetching. */
function useLike(job: Engageable) {
  const [liked, setLiked] = useState(Boolean(job.liked));
  const [count, setCount] = useState(job.likes_count ?? 0);
  const m = useMutation({
    mutationFn: () => jobsApi.like(job.id),
    onMutate: () => { setLiked((v) => !v); setCount((c) => Math.max(0, c + (liked ? -1 : 1))); },
    onSuccess: (r) => { setLiked(r.liked); setCount(r.likes_count); },
    onError: () => { setLiked(Boolean(job.liked)); setCount(job.likes_count ?? 0); },
  });
  // `liked` is null for signed-out visitors: the API would refuse, so don't offer it.
  return { liked, count, toggle: () => m.mutate(), busy: m.isPending, canLike: job.liked !== null && job.liked !== undefined };
}

export function CardEngagement({ job }: { job: Engageable }) {
  const like = useLike(job);
  const [copied, setCopied] = useState(false);
  const stop = (e: MouseEvent) => { e.preventDefault(); e.stopPropagation(); };
  return (
    <div className="pointer-events-none relative z-10 mt-3 flex items-center gap-4 border-t border-hairline pt-2.5 text-[12px] text-muted">
      <span className="inline-flex items-center gap-1" title="Views"><Eye size={13} strokeWidth={1.75} /> {job.views_count ?? 0}</span>
      <button type="button" disabled={!like.canLike || like.busy} aria-pressed={like.liked} aria-label={like.liked ? "Unlike" : "Like"}
        onClick={(e) => { stop(e); like.toggle(); }}
        className={`pointer-events-auto inline-flex items-center gap-1 transition hover:text-brand-red disabled:cursor-default ${like.liked ? "text-brand-red" : ""}`}>
        <Heart size={13} strokeWidth={1.75} fill={like.liked ? "currentColor" : "none"} /> {like.count}
      </button>
      <span className="inline-flex items-center gap-1" title="Comments"><MessageCircle size={13} strokeWidth={1.75} /> {job.comments_count ?? 0}</span>
      <button type="button" aria-label="Share"
        onClick={async (e) => { stop(e); if ((await shareJob(job)) === "copied") { setCopied(true); setTimeout(() => setCopied(false), 1500); } }}
        className="pointer-events-auto ml-auto inline-flex items-center gap-1 transition hover:text-brand-green">
        <Share2 size={13} strokeWidth={1.75} /> {copied ? "Link copied" : ""}
      </button>
    </div>
  );
}

/** `showShare={false}` where the page already has its own Share button. */
export function EngagementBar({ job, onComments, showShare = true }: { job: Engageable; onComments: () => void; showShare?: boolean }) {
  const like = useLike(job);
  const [copied, setCopied] = useState(false);
  const pill = "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition";
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-mist px-3 py-1.5 text-[12.5px] text-muted">
        <Eye size={14} /> {job.views_count ?? 0} view{(job.views_count ?? 0) === 1 ? "" : "s"}
      </span>
      <button type="button" onClick={like.toggle} disabled={!like.canLike || like.busy} aria-pressed={like.liked}
        className={`${pill} ${like.liked ? "border-brand-red/40 bg-brand-red/5 text-brand-red" : "border-hairline text-ink hover:bg-mist"}`}>
        <Heart size={15} fill={like.liked ? "currentColor" : "none"} /> {like.count}
      </button>
      <button type="button" onClick={onComments} className={`${pill} border-hairline text-ink hover:bg-mist`}>
        <MessageCircle size={15} /> {job.comments_count ?? 0}
      </button>
      {showShare && (
        <button type="button" className={`${pill} border-hairline text-ink hover:bg-mist`}
          onClick={async () => { if ((await shareJob(job)) === "copied") { setCopied(true); setTimeout(() => setCopied(false), 1500); } }}>
          <Share2 size={15} /> {copied ? "Link copied" : "Share"}
        </button>
      )}
    </div>
  );
}

export function JobComments({ jobId, anchorRef }: { jobId: string; anchorRef?: React.Ref<HTMLElement> }) {
  const scope = useUserScope();
  const qc = useQueryClient();
  const key = ["jobs", scope, "comments", jobId];
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string>();
  const inputRef = useRef<HTMLInputElement>(null);
  const q = useQuery({ queryKey: key, queryFn: () => jobsApi.comments(jobId) });
  const add = useMutation({
    mutationFn: (body: string) => jobsApi.addComment(jobId, body),
    onSuccess: (c) => {
      setDraft(""); setError(undefined);
      qc.setQueryData<JobComment[]>(key, (old) => [c, ...(old ?? [])]);
      qc.invalidateQueries({ queryKey: ["jobs", scope, "job", jobId] });   // refresh the count
    },
    onError: (e) => setError(apiErrorMessage(e, "Couldn't post your comment.")),
  });
  const submit = () => { const b = draft.trim(); if (b && !add.isPending) add.mutate(b); };
  const rows = q.data ?? [];

  return (
    <section ref={anchorRef} id="comments" className="scroll-mt-32 rounded-2xl border border-hairline bg-paper p-5">
      <h2 className="font-display text-[16px] font-semibold text-ink">Comments ({rows.length})</h2>
      <div className="mt-3 flex gap-2">
        <input ref={inputRef} value={draft} maxLength={1000}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
          placeholder="Write a comment…"
          className="h-10 min-w-0 flex-1 rounded-xl border border-hairline bg-mist px-3 text-[14px] outline-none focus:border-brand-green" />
        <button type="button" onClick={submit} disabled={add.isPending || !draft.trim()} aria-label="Post comment"
          className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-brand-green px-3.5 text-[13px] font-semibold text-white transition hover:opacity-90 disabled:opacity-50">
          {add.isPending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Post
        </button>
      </div>
      {error && <p className="mt-2 text-[12.5px] text-danger">{error}</p>}

      <ul className="mt-4 space-y-3">
        {rows.map((c) => (
          <li key={c.id} className="rounded-xl bg-mist px-3.5 py-2.5">
            <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-ink">
              {c.user_name}
              {c.is_employer && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-brand-green/10 px-1.5 py-0.5 text-[10.5px] font-semibold text-brand-green">
                  <BadgeCheck size={11} /> Employer
                </span>
              )}
              <span className="font-normal text-muted">· {timeAgo(c.created_at)}</span>
            </p>
            <p className="mt-0.5 whitespace-pre-wrap break-words text-[13.5px] text-ink">{c.body}</p>
          </li>
        ))}
        {q.isSuccess && rows.length === 0 && (
          <li className="text-[13px] text-muted">No comments yet. Be the first to ask the employer something.</li>
        )}
      </ul>
    </section>
  );
}
