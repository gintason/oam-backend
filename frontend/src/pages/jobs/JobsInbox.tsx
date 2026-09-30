import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MessagesSquare } from "lucide-react";
import { JobsShell, Spinner, EmptyState, Avatar, CompanyLogo, StatusPill } from "../../components/jobs/ui";
import { jobsApi, timeAgo } from "../../services/jobs";
import { useJobsSocket } from "../../lib/jobsSocket";
import { useUserScope } from "../../auth/useUserScope";

/** /jobs/messages — every recruitment conversation, live. */
export default function JobsInbox() {
  const scope = useUserScope();
  const qc = useQueryClient();
  const threads = useQuery({ queryKey: ["jobs", scope, "threads"], queryFn: jobsApi.threads });
  useJobsSocket((e) => {
    if (e.type === "chat.message" || e.type === "chat.read") qc.invalidateQueries({ queryKey: ["jobs", scope, "threads"] });
  });
  const list = threads.data?.results ?? [];

  return (
    <JobsShell>
      <h1 className="font-display text-[22px] font-semibold text-ink">Messages</h1>
      <div className="mt-4">
        {threads.isLoading ? <Spinner /> : list.length === 0 ? (
          <EmptyState icon={<MessagesSquare size={20} />} title="No conversations yet"
                      body="Chats with employers and candidates about applications appear here." />
        ) : (
          <ul className="divide-y divide-hairline overflow-hidden rounded-2xl border border-hairline bg-paper">
            {list.map((t) => {
              const employerSide = t.my_side === "employer";
              const name = employerSide ? t.candidate.display_name : t.employer.company_name;
              return (
                <li key={t.id}>
                  <Link to={`/jobs/messages/${t.id}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-mist">
                    {employerSide
                      ? <Avatar name={name} url={t.candidate.photo_url} size={42} />
                      : <CompanyLogo url={t.employer.logo_url} name={name} size={42} />}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`truncate text-[14px] ${t.unread ? "font-bold text-ink" : "font-semibold text-ink"}`}>{name}</p>
                        <span className="shrink-0 text-[11.5px] text-muted">{timeAgo(t.last_message_at)}</span>
                      </div>
                      <p className="truncate text-[12.5px] text-muted">{t.job ? `${t.job.title} · ` : ""}{t.last_message_preview || "No messages yet"}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      {t.application_status && <StatusPill status={t.application_status} />}
                      {t.unread > 0 && <span className="rounded-full bg-brand-green px-1.5 text-[11px] font-bold text-white tabular">{t.unread}</span>}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </JobsShell>
  );
}
