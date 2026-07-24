import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2, MessageCircle, Send, Sparkles, X } from "lucide-react";
import { assistantApi, type ChatTurn } from "../services/assistant";
import { useAuth } from "../auth/AuthContext";
import { apiErrorMessage } from "../lib/api";

/**
 * Floating help assistant.
 *
 * The conversation lives in component state and goes when the tab closes.
 * Nothing is stored server-side — these are transient questions, not records
 * worth keeping, and not keeping them means there's no archive of customers'
 * problems to secure or leak.
 */
export default function Assistant() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string>();
  const endRef = useRef<HTMLDivElement>(null);

  const status = useQuery({
    queryKey: ["assistant-status"],
    queryFn: assistantApi.status,
    enabled: Boolean(user) && open,
    staleTime: 30 * 60_000,
    retry: false,
  });

  const ask = useMutation({
    mutationFn: (question: string) => assistantApi.ask(question, turns),
    onSuccess: (data) =>
      setTurns((t) => [...t, { role: "assistant", content: data.reply }]),
    onError: (err) => {
      setError(apiErrorMessage(err, "I couldn't answer that just now."));
      // Drop the unanswered question so it isn't sent again as context.
      setTurns((t) => t.slice(0, -1));
    },
  });

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns.length, ask.isPending]);

  if (!user) return null;

  function send(question: string) {
    const q = question.trim();
    if (!q || ask.isPending) return;
    setError(undefined);
    setDraft("");
    setTurns((t) => [...t, { role: "user", content: q }]);
    ask.mutate(q);
  }

  return (
    <>
      {/* Launcher — sits above the mobile tab bar so it never covers a tab. */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Ask OAM"
          className="fixed bottom-[86px] right-4 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-[#0a0a0a] text-white shadow-[0_8px_24px_rgba(10,10,10,0.28)] transition hover:scale-105 md:bottom-6"
        >
          <span
            className="absolute inset-0 rounded-full"
            style={{
              background:
                "radial-gradient(circle at 25% 20%, rgba(11,115,39,0.55), transparent 60%), radial-gradient(circle at 80% 85%, rgba(227,16,18,0.28), transparent 55%)",
            }}
          />
          <MessageCircle size={22} strokeWidth={1.75} className="relative" />
        </button>
      )}

      {open && (
        <div className="fixed inset-x-0 bottom-0 z-[60] flex justify-end p-0 sm:inset-auto sm:bottom-6 sm:right-6">
          <div className="flex h-[80vh] w-full flex-col overflow-hidden rounded-t-2xl border border-hairline bg-paper shadow-[0_16px_48px_rgba(10,10,10,0.22)] sm:h-[560px] sm:w-[380px] sm:rounded-2xl">
            {/* Header */}
            <div className="relative overflow-hidden bg-[#0a0a0a] text-white">
              <div
                className="absolute inset-x-0 top-0 h-[3px]"
                style={{ background: "linear-gradient(90deg,#111 33%,#E31012 33%,#E31012 66%,#0B7327 66%)" }}
              />
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "radial-gradient(circle at 10% 0%, rgba(11,115,39,0.4), transparent 60%)",
                }}
              />
              <div className="relative flex items-center justify-between px-4 py-3.5">
                <div>
                  <p className="flex items-center gap-1.5 font-display text-[15px] font-semibold">
                    <Sparkles size={14} strokeWidth={2} className="text-brand-green" />
                    Ask OAM
                  </p>
                  <p className="text-[11.5px] text-white/50">
                    Questions about bills, wallet, marketplace and more
                  </p>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  className="rounded-lg p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white"
                >
                  <X size={17} />
                </button>
              </div>
            </div>

            {/* Thread */}
            <div className="flex-1 space-y-3 overflow-y-auto bg-mist px-3.5 py-4">
              {turns.length === 0 && (
                <>
                  <Bubble role="assistant">
                    {status.data?.greeting ??
                      "Hello. I can help with anything about OAM. What would you like to know?"}
                  </Bubble>
                  <div className="space-y-1.5 pt-1">
                    {(status.data?.suggestions ?? []).map((s) => (
                      <button
                        key={s}
                        onClick={() => send(s)}
                        className="block w-full rounded-xl border border-hairline bg-paper px-3 py-2.5 text-left text-[12.5px] text-ink transition hover:border-brand-green/40 hover:bg-brand-green/5"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {turns.map((t, i) => (
                <Bubble key={i} role={t.role}>{t.content}</Bubble>
              ))}

              {ask.isPending && (
                <div className="flex items-center gap-2 text-[12.5px] text-muted">
                  <Loader2 size={13} className="animate-spin" />
                  Thinking…
                </div>
              )}

              {error && <p className="text-[12.5px] text-danger">{error}</p>}

              <div ref={endRef} />
            </div>

            {/* Composer */}
            <div className="border-t border-hairline bg-paper p-2.5">
              <div className="flex items-end gap-2">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(draft); }
                  }}
                  rows={1}
                  placeholder="Ask a question…"
                  className="max-h-24 min-h-[42px] flex-1 resize-none rounded-xl border border-hairline bg-paper px-3 py-2.5 text-[13.5px] text-ink outline-none transition focus:border-brand-green focus:ring-[3px] focus:ring-brand-green/10"
                />
                <button
                  onClick={() => send(draft)}
                  disabled={!draft.trim() || ask.isPending}
                  aria-label="Send"
                  className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl bg-brand-red text-white transition hover:brightness-95 disabled:opacity-40"
                >
                  <Send size={16} strokeWidth={1.75} />
                </button>
              </div>
              <p className="mt-1.5 px-1 text-[10.5px] leading-relaxed text-muted">
                I can't see your balance or orders — check Wallet and Order history for those.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Bubble({ role, children }: { role: "user" | "assistant"; children: React.ReactNode }) {
  const mine = role === "user";
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
          mine
            ? "rounded-br-md bg-brand-green text-white"
            : "rounded-bl-md border border-hairline bg-paper text-ink"
        }`}
      >
        {children}
      </div>
    </div>
  );
}
