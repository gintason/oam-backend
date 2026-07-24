import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft, MessagesSquare, Loader2, ShieldCheck, Lock, Store, Wrench,
} from "lucide-react";
import AppHeader from "../../components/AppHeader";
import { useUserScope } from "../../auth/useUserScope";
import { messagingApi, type Conversation } from "../../services/messaging";
import { friendlyTime } from "../../lib/format";

type Tab = "all" | "customer" | "provider";

/**
 * Every conversation, split by which side of it you're on.
 *
 * People act in both roles on OAM — you might sell a fridge and hire a
 * plumber the same week — so a single undifferentiated list gets confusing
 * fast. The tabs mirror the two decision hubs.
 */
export default function Inbox() {
  const navigate = useNavigate();
  const scope = useUserScope();
  const [tab, setTab] = useState<Tab>("all");

  const query = useQuery({
    queryKey: ["messaging", scope, "list", tab],
    queryFn: () => messagingApi.list(tab === "all" ? undefined : tab),
    refetchInterval: 15000,
  });

  const conversations = query.data?.results ?? [];

  const TABS: { key: Tab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "customer", label: "My enquiries" },
    { key: "provider", label: "Enquiries to me" },
  ];

  return (
    <div className="min-h-screen bg-mist">
      <AppHeader />

      <main className="mx-auto max-w-2xl px-4 py-5 sm:px-5 sm:py-6">
        <button
          onClick={() => navigate("/dashboard")}
          className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted transition hover:text-ink"
        >
          <ArrowLeft size={15} strokeWidth={1.75} /> Dashboard
        </button>

        <h1 className="font-display text-[22px] font-semibold text-ink sm:text-2xl">Messages</h1>
        <p className="mt-1 text-[14px] text-muted">
          Chats about marketplace items and artisan services.
        </p>

        <div className="mt-4 flex gap-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`h-9 rounded-lg px-3.5 text-[13px] font-medium transition ${
                tab === t.key
                  ? "bg-ink text-white"
                  : "border border-hairline bg-paper text-muted hover:bg-mist hover:text-ink"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-5">
          {query.isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 size={22} className="animate-spin text-muted" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="rounded-2xl border border-hairline bg-paper py-12 text-center shadow-[0_1px_2px_rgba(10,10,10,0.04)] sm:py-14">
              <MessagesSquare size={30} strokeWidth={1.5} className="mx-auto text-muted" />
              <p className="mt-3 text-[14px] font-medium text-ink">No conversations yet</p>
              <p className="mx-auto mt-1 max-w-xs text-[13px] leading-relaxed text-muted">
                When you message a seller or an artisan — or someone messages you — it'll
                appear here.
              </p>
              <div className="mt-4 flex justify-center gap-2">
                <Link to="/marketplace"
                      className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-hairline bg-paper px-4 text-[13px] font-medium text-ink transition hover:bg-mist">
                  <Store size={14} strokeWidth={1.75} /> Marketplace
                </Link>
                <Link to="/artisans"
                      className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-hairline bg-paper px-4 text-[13px] font-medium text-ink transition hover:bg-mist">
                  <Wrench size={14} strokeWidth={1.75} /> Artisans
                </Link>
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-hairline overflow-hidden rounded-2xl border border-hairline bg-paper shadow-[0_1px_2px_rgba(10,10,10,0.04)]">
              {conversations.map((c) => <Row key={c.id} convo={c} />)}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}

function Row({ convo }: { convo: Conversation }) {
  return (
    <li>
      <Link to={`/messages/${convo.id}`} className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-mist">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
          convo.kind === "listing" ? "bg-brand-red/10 text-brand-red" : "bg-brand-green/10 text-brand-green"
        }`}>
          {convo.kind === "listing"
            ? <Store size={17} strokeWidth={1.75} />
            : <Wrench size={17} strokeWidth={1.75} />}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="line-clamp-1 text-[13.5px] font-medium text-ink">{convo.subject.title}</p>
            {convo.contacts
              ? <ShieldCheck size={12} strokeWidth={2.25} className="shrink-0 text-brand-green" />
              : <Lock size={11} strokeWidth={2} className="shrink-0 text-muted" />}
          </div>
          <p className="line-clamp-1 text-[12px] text-muted">
            {convo.other_party_name}
            {convo.last_message && ` · ${convo.last_message.body}`}
          </p>
          <p className="mt-0.5 text-[11px] text-muted">
            {friendlyTime(convo.last_message_at)}
            {convo.role === "provider" && convo.status === "open" && (
              <span className="ml-1.5 font-semibold text-warn">· needs your reply</span>
            )}
          </p>
        </div>

        {convo.unread > 0 && (
          <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-brand-red px-1.5 text-[11px] font-bold text-white">
            {convo.unread}
          </span>
        )}
      </Link>
    </li>
  );
}
