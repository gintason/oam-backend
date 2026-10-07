import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Paperclip, Send, FileText, Loader2, AlertCircle, RotateCw, WifiOff } from "lucide-react";
import AppHeader from "../../components/AppHeader";
import { Avatar, BackToDashboard, CompanyLogo, StatusPill } from "../../components/jobs/ui";
import { jobsApi, uploadJobsFile, type Attachment, type JobChatMessage } from "../../services/jobs";
import { apiErrorMessage } from "../../lib/api";
import { sendJobsEvent, useJobsSocket } from "../../lib/jobsSocket";
import { useAuth } from "../../auth/AuthContext";
import { useUserScope } from "../../auth/useUserScope";
import { friendlyTime } from "../../lib/format";
import { useTranslation } from "react-i18next";

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * /jobs/messages/:id — a live conversation.
 *
 * Messages go over the WebSocket when it's open (instant, with an ack) and
 * fall back to REST when it isn't. Each outgoing message carries a client_id,
 * so the optimistic bubble is swapped for the real one exactly once, whichever
 * way the confirmation arrives, and a retry never double-sends.
 */
export default function JobsChat() {
  const { t: tr } = useTranslation();
  const { id = "" } = useParams();
  const scope = useUserScope();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [msgs, setMsgs] = useState<JobChatMessage[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const [readAt, setOtherReadAt] = useState<string | null>(null);
  const [upload, setUpload] = useState<number | null>(null);
  const [error, setError] = useState<string>();
  const endRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<number | undefined>(undefined);
  const lastTypingSent = useRef(0);

  const thread = useQuery({ queryKey: ["jobs", scope, "thread", id], queryFn: () => jobsApi.thread(id) });
  const t = thread.data;
  const mySide = t?.my_side;

  useEffect(() => {
    let active = true;
    jobsApi.messages(id).then((r) => {
      if (!active) return;
      setMsgs(r.results);
      setHasMore(r.has_more);
    }).catch((e) => setError(apiErrorMessage(e, tr("jobs.jobsChat.couldnTLoadMessages"))));
    return () => { active = false; };
  }, [id, tr]);

  const otherReadAt = readAt ?? (t ? (t.my_side === "employer" ? t.candidate_last_read_at : t.employer_last_read_at) : null);

  const markRead = useCallback(() => {
    if (!sendJobsEvent({ type: "chat.read", thread: id })) jobsApi.markRead(id).catch(() => {});
    qc.invalidateQueries({ queryKey: ["jobs", scope, "threads"] });
  }, [id, qc, scope]);

  useEffect(() => { markRead(); }, [markRead]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [msgs.length, typing]);

  const merge = useCallback((m: JobChatMessage) => {
    setMsgs((cur) => {
      if (cur.some((x) => x.id === m.id)) return cur;
      const i = m.client_id ? cur.findIndex((x) => x.pending && x.client_id === m.client_id) : -1;
      if (i >= 0) { const next = [...cur]; next[i] = m; return next; }
      return [...cur, m];
    });
  }, []);

  const socketState = useJobsSocket((e) => {
    const d = e.data as Record<string, unknown>;
    if (e.type === "chat.message" && d.thread === id) {
      merge(d as unknown as JobChatMessage);
      if ((d.sender_id as string) !== String(user?.id)) {
        setTyping(false);
        if (document.visibilityState === "visible") markRead();
      }
    } else if (e.type === "chat.typing" && d.thread === id) {
      setTyping(true);
      window.clearTimeout(typingTimer.current);
      typingTimer.current = window.setTimeout(() => setTyping(false), 4000);
    } else if (e.type === "chat.read" && d.thread === id && d.side !== mySide) {
      setOtherReadAt(d.at as string);
    } else if (e.type === "error" && d.client_id) {
      setMsgs((cur) => cur.map((x) => (x.client_id === d.client_id && x.pending ? { ...x, pending: false, failed: true } : x)));
      setError(String(d.detail ?? tr("jobs.chat.messageNotSent")));
    }
  });

  async function deliver(m: JobChatMessage) {
    const attachment: Attachment | undefined = m.attachment_url
      ? { url: m.attachment_url, name: m.attachment_name, type: m.attachment_type, size: m.attachment_size ?? 0 }
      : undefined;
    const sentOverSocket = socketState === "open" &&
      sendJobsEvent({ type: "chat.send", thread: id, body: m.body, attachment, client_id: m.client_id });
    if (sentOverSocket) return;
    try {
      merge(await jobsApi.sendMessage(id, { body: m.body, attachment, client_id: m.client_id }));
    } catch (err) {
      setMsgs((cur) => cur.map((x) => (x.client_id === m.client_id ? { ...x, pending: false, failed: true } : x)));
      setError(apiErrorMessage(err, tr("jobs.jobsChat.messageNotSent")));
    }
  }

  function queue(body: string, att?: Attachment) {
    setError(undefined);
    const m: JobChatMessage = {
      id: `local-${uid()}`, thread_id: id, sender_id: String(user?.id ?? ""), sender_name: tr("jobs.jobsChat.you"),
      kind: att ? "attachment" : "text", body, attachment_url: att?.url ?? "", attachment_name: att?.name ?? "",
      attachment_type: att?.type ?? "", attachment_size: att?.size ?? null, client_id: uid(),
      created_at: new Date().toISOString(), pending: true,
    };
    setMsgs((cur) => [...cur, m]);
    deliver(m);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setDraft("");
    queue(body);
  }

  function onType(v: string) {
    setDraft(v);
    const now = Date.now();
    if (v && now - lastTypingSent.current > 3000) {
      lastTypingSent.current = now;
      sendJobsEvent({ type: "chat.typing", thread: id });
    }
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) { setError(tr("jobs.jobsChat.filesCanBeUpTo")); return; }
    try {
      setUpload(0);
      const r = await uploadJobsFile(file, "job_chat_attachment", setUpload);
      queue("", { url: r.url, name: file.name, type: file.type || r.format, size: file.size });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUpload(null);
    }
  }

  async function loadOlder() {
    const first = msgs.find((m) => !m.pending);
    if (!first) return;
    const r = await jobsApi.messages(id, first.created_at);
    setMsgs((cur) => [...r.results, ...cur]);
    setHasMore(r.has_more);
  }

  const lastMineSeen = [...msgs].reverse().find((m) => m.sender_id === String(user?.id) && !m.pending);
  const seen = Boolean(lastMineSeen && otherReadAt && new Date(otherReadAt) >= new Date(lastMineSeen.created_at));
  const other = t ? (t.my_side === "employer" ? t.candidate.display_name : t.employer.company_name) : "";

  return (
    <div className="flex h-[100dvh] flex-col bg-mist">
      <AppHeader />
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col overflow-hidden px-0 sm:px-5 sm:pb-4">
        <div className="px-4 sm:px-0"><BackToDashboard /></div>
        <header className="flex items-center gap-3 border-b border-hairline bg-paper px-4 py-3 sm:rounded-t-2xl sm:border">
          <button onClick={() => navigate("/jobs/messages")} className="rounded-lg p-1 text-muted hover:bg-mist" aria-label={tr("jobs.jobsChat.back")}><ArrowLeft size={18} /></button>
          {t && (t.my_side === "employer"
            ? <Avatar name={other} url={t.candidate.photo_url} size={38} />
            : <CompanyLogo url={t.employer.logo_url} name={other} size={38} />)}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14.5px] font-semibold text-ink">{other}</p>
            <p className="truncate text-[12px] text-muted">
              {typing ? <span className="text-brand-green">{tr("jobs.jobsChat.typing")}</span> : t?.job ? t.job.title : ""}
            </p>
          </div>
          {t?.application_status && <StatusPill status={t.application_status} />}
          {t?.my_side === "employer" && t.job && (
            <Link to={`/jobs/employer/jobs/${t.job.id}`} className="hidden text-[12.5px] font-medium text-brand-green hover:underline sm:inline">{tr("jobs.jobsChat.pipeline")}</Link>
          )}
        </header>

        {socketState !== "open" && (
          <p className="flex items-center gap-1.5 bg-warn/10 px-4 py-1.5 text-[12px] text-warn"><WifiOff size={13} />{" "}{tr("jobs.jobsChat.reconnectingMessagesWillStillSend")}</p>
        )}

        <div className="flex-1 overflow-y-auto border-hairline bg-paper px-3 py-4 sm:border-x" aria-live="polite">
          {hasMore && (
            <div className="mb-3 text-center">
              <button onClick={loadOlder} className="text-[12.5px] font-medium text-muted hover:text-ink">{tr("jobs.jobsChat.loadEarlierMessages")}</button>
            </div>
          )}
          <ul className="space-y-2">
            {msgs.map((m) => {
              if (m.kind === "system") {
                return <li key={m.id} className="py-1 text-center text-[12px] text-muted">{m.body}</li>;
              }
              const mine = m.sender_id === String(user?.id);
              return (
                <li key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 ${mine ? "rounded-br-md bg-brand-green text-white" : "rounded-bl-md bg-mist text-ink"} ${m.pending ? "opacity-70" : ""}`}>
                    {m.attachment_url && <AttachmentView m={m} mine={mine} />}
                    {m.body && <p className="whitespace-pre-wrap break-words text-[14px] leading-relaxed">{m.body}</p>}
                    <p className={`mt-0.5 flex items-center justify-end gap-1 text-[10.5px] ${mine ? "text-white/70" : "text-muted"}`}>
                      {m.pending && <Loader2 size={10} className="animate-spin" />}
                      {friendlyTime(m.created_at)}
                    </p>
                    {m.failed && (
                      <button onClick={() => { setMsgs((c) => c.map((x) => x.client_id === m.client_id ? { ...x, failed: false, pending: true } : x)); deliver(m); }}
                              className="mt-1 inline-flex items-center gap-1 text-[11.5px] font-semibold text-white underline">
                        <AlertCircle size={12} />{" "}{tr("jobs.jobsChat.notSentRetry")}{" "}<RotateCw size={11} />
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          {seen && <p className="mt-1 text-right text-[11px] text-muted">{tr("jobs.jobsChat.seen")}</p>}
          <div ref={endRef} />
        </div>

        <form onSubmit={submit} className="flex items-end gap-2 border-t border-hairline bg-paper p-3 sm:rounded-b-2xl sm:border"
              style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
          <label className={`flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted hover:bg-mist hover:text-ink ${upload != null ? "pointer-events-none" : ""}`}
                 aria-label={tr("jobs.jobsChat.attachAFile")}>
            {upload != null ? <span className="text-[11px] font-semibold tabular">{upload}%</span> : <Paperclip size={18} />}
            <input type="file" className="sr-only" accept=".pdf,.doc,.docx,.txt,image/*" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
          </label>
          <textarea
            value={draft}
            onChange={(e) => onType(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(e); } }}
            rows={1}
            placeholder={t?.is_closed ? tr("jobs.jobsChat.thisConversationIsClosed") : tr("jobs.jobsChat.writeAMessage")}
            disabled={t?.is_closed}
            className="max-h-32 min-h-10 flex-1 resize-none rounded-lg border border-hairline bg-mist px-3 py-2 text-[14px] outline-none focus:border-brand-green"
            aria-label={tr("jobs.jobsChat.message")}
          />
          <button type="submit" disabled={!draft.trim()} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-green text-white disabled:opacity-50" aria-label={tr("jobs.jobsChat.send")}>
            <Send size={17} />
          </button>
        </form>
        {error && <p role="alert" className="bg-paper px-4 pb-2 text-[12.5px] text-danger">{error}</p>}
      </div>
    </div>
  );
}

function AttachmentView({ m, mine }: { m: JobChatMessage; mine: boolean }) {
  const { t: tr } = useTranslation();
  if (m.attachment_type.startsWith("image/")) {
    return (
      <a href={m.attachment_url} target="_blank" rel="noreferrer" className="mb-1 block">
        <img src={m.attachment_url} alt={m.attachment_name} className="max-h-56 rounded-lg object-cover" />
      </a>
    );
  }
  return (
    <a href={m.attachment_url} target="_blank" rel="noreferrer"
       className={`mb-1 flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] font-medium ${mine ? "bg-white/15" : "bg-paper"}`}>
      <FileText size={16} className="shrink-0" />
      <span className="truncate">{m.attachment_name || tr("jobs.jobsChat.attachment")}</span>
      {m.attachment_size ? <span className="shrink-0 text-[11px] opacity-70">{Math.max(1, Math.round(m.attachment_size / 1024))}{tr("jobs.jobsChat.kb")}</span> : null}
    </a>
  );
}
