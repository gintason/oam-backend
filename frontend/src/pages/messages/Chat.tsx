import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Send, ShieldCheck, Phone, MessageCircle, Check, X, Loader2, Lock,
} from "lucide-react";
import AppHeader from "../../components/AppHeader";
import { useUserScope } from "../../auth/useUserScope";
import { messagingApi } from "../../services/messaging";
import { apiErrorMessage } from "../../lib/api";
import { friendlyTime } from "../../lib/format";
import { useTranslation } from "react-i18next";

/**
 * One thread, used by both Marketplace and Home Services.
 *
 * Messages poll every 6 seconds. That's not elegant, but websockets would mean
 * Django Channels plus Redis in production, and at this scale polling is
 * indistinguishable to the user for a fraction of the operational weight.
 */
export default function Chat() {
  const { t } = useTranslation();
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const scope = useUserScope();
  const qc = useQueryClient();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string>();
  const endRef = useRef<HTMLDivElement>(null);

  const thread = useQuery({
    queryKey: ["messaging", scope, "thread", id],
    queryFn: () => messagingApi.get(id),
    enabled: Boolean(id),
    refetchInterval: 6000,
  });

  const convo = thread.data?.conversation;
  const messages = thread.data?.messages ?? [];

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const send = useMutation({
    mutationFn: (body: string) => messagingApi.send(id, body),
    onSuccess: () => { setDraft(""); thread.refetch(); },
    onError: (err) => setError(apiErrorMessage(err, t("messages.chat.errSend"))),
  });

  const act = useMutation({
    mutationFn: (action: "accept" | "decline" | "close") => messagingApi.act(id, action),
    onSuccess: () => {
      thread.refetch();
      qc.invalidateQueries({ queryKey: ["messaging"] });
    },
    onError: (err) => setError(apiErrorMessage(err, t("messages.chat.errUpdate"))),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    const body = draft.trim();
    if (!body) return;
    send.mutate(body);
  }

  return (
    <div className="flex min-h-screen flex-col bg-mist">
      <AppHeader />

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-3 py-4 sm:px-5 sm:py-5">
        <button
          onClick={() => navigate("/messages")}
          className="mb-3 inline-flex items-center gap-1.5 self-start text-[13px] font-medium text-muted transition hover:text-ink"
        >
          <ArrowLeft size={15} strokeWidth={1.75} /> {t("messages.chat.back")}
        </button>

        {thread.isLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 size={22} className="animate-spin text-muted" />
          </div>
        ) : !convo ? (
          <p className="rounded-xl border border-hairline bg-paper p-5 text-center text-[14px] text-muted">
            {t("messages.chat.unavailable")}
          </p>
        ) : (
          <>
            {/* Subject */}
            <div className="rounded-t-2xl border border-hairline bg-paper px-4 py-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                {convo.kind === "listing" ? t("messages.chat.kindListing") : t("messages.chat.kindArtisan")}
              </p>
              <h1 className="mt-0.5 font-display text-[16px] font-semibold text-ink">
                {convo.subject.title}
              </h1>
              <p className="mt-0.5 text-[12.5px] text-muted">
                {t("messages.chat.with", { name: convo.other_party_name })}
                {convo.subject.price && ` · ₦${Number(convo.subject.price).toLocaleString()}`}
              </p>
            </div>

            {/* Contacts, or the reason they're hidden */}
            {convo.contacts ? (
              <div className="border-x border-hairline bg-brand-green/5 px-4 py-3">
                <p className="flex items-center gap-1.5 text-[12px] font-semibold text-brand-green">
                  <ShieldCheck size={13} strokeWidth={2.25} /> {t("messages.chat.contactShared")}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {convo.contacts.phone && (
                    <a href={`tel:${convo.contacts.phone}`}
                       className="inline-flex items-center gap-1.5 rounded-lg border border-hairline bg-paper px-3 py-1.5 text-[13px] font-medium text-ink transition hover:bg-mist">
                      <Phone size={13} strokeWidth={1.75} /> {convo.contacts.phone}
                    </a>
                  )}
                  {convo.contacts.whatsapp && (
                    <a href={`https://wa.me/${convo.contacts.whatsapp.replace(/\D/g, "")}`}
                       target="_blank" rel="noopener noreferrer"
                       className="inline-flex items-center gap-1.5 rounded-lg border border-hairline bg-paper px-3 py-1.5 text-[13px] font-medium text-ink transition hover:bg-mist">
                      <MessageCircle size={13} strokeWidth={1.75} /> WhatsApp
                    </a>
                  )}
                </div>
              </div>
            ) : convo.status === "open" ? (
              <div className="border-x border-hairline bg-mist px-4 py-3">
                {convo.role === "provider" ? (
                  <>
                    <p className="flex items-center gap-1.5 text-[12.5px] font-medium text-ink">
                      <Lock size={13} strokeWidth={1.75} /> {t("messages.chat.providerGateTitle")}
                    </p>
                    <p className="mt-1 text-[12px] leading-relaxed text-muted">
                      {t("messages.chat.providerGateBody")}
                    </p>
                    <div className="mt-2.5 flex gap-2">
                      <button
                        onClick={() => act.mutate("accept")}
                        disabled={act.isPending}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-green px-3.5 text-[13px] font-semibold text-white transition hover:brightness-95 disabled:opacity-60"
                      >
                        <Check size={14} strokeWidth={2.5} /> {t("messages.chat.accept")}
                      </button>
                      <button
                        onClick={() => act.mutate("decline")}
                        disabled={act.isPending}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-hairline bg-paper px-3.5 text-[13px] font-medium text-muted transition hover:bg-mist hover:text-ink disabled:opacity-60"
                      >
                        <X size={14} strokeWidth={2} /> {t("messages.chat.decline")}
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="flex items-start gap-1.5 text-[12px] leading-relaxed text-muted">
                    <Lock size={13} strokeWidth={1.75} className="mt-0.5 shrink-0" />
                    {t("messages.chat.customerGate", { name: convo.other_party_name })}
                  </p>
                )}
              </div>
            ) : (
              <div className="border-x border-hairline bg-mist px-4 py-2.5">
                <p className="text-[12px] text-muted">
                  {t("messages.chat.wasStatus", { status: t("messages.chat.status." + convo.status, { defaultValue: convo.status }) })}
                </p>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 space-y-2.5 overflow-y-auto border-x border-hairline bg-paper px-4 py-4">
              {messages.length === 0 && (
                <p className="py-8 text-center text-[13px] text-muted">{t("messages.chat.noMessages")}</p>
              )}
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.is_mine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 ${
                    m.is_mine
                      ? "rounded-br-md bg-brand-green text-white"
                      : "rounded-bl-md bg-mist text-ink"
                  }`}>
                    <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed">{m.body}</p>
                    <p className={`mt-1 text-[10.5px] ${m.is_mine ? "text-white/60" : "text-muted"}`}>
                      {friendlyTime(m.created_at)}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={endRef} />
            </div>

            {/* Composer */}
            <form onSubmit={submit} className="rounded-b-2xl border border-hairline bg-paper px-3 py-3">
              {error && <p className="mb-2 text-[12.5px] text-danger">{error}</p>}
              <div className="flex items-end gap-2">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(e); }
                  }}
                  rows={1}
                  placeholder={t("messages.chat.placeholder")}
                  disabled={convo.status === "closed"}
                  className="max-h-28 min-h-[44px] flex-1 resize-none rounded-xl border border-hairline bg-paper px-3.5 py-3 text-[14px] text-ink outline-none transition focus:border-brand-green focus:ring-[3px] focus:ring-brand-green/10 disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={!draft.trim() || send.isPending || convo.status === "closed"}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-red text-white transition hover:brightness-95 disabled:opacity-40"
                  aria-label={t("messages.chat.sendAria")}
                >
                  {send.isPending
                    ? <Loader2 size={17} className="animate-spin" />
                    : <Send size={17} strokeWidth={1.75} />}
                </button>
              </div>
              <p className="mt-1.5 text-[11px] text-muted">
                {t("messages.chat.safetyNote")}
              </p>
            </form>
          </>
        )}
      </main>
    </div>
  );
}
