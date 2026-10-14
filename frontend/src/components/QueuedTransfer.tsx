import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock3, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { payoutsApi, type Withdrawal } from "../services/payouts";
import { apiErrorMessage } from "../lib/api";

const naira = (v: string | number) =>
  `₦${Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function useCancel(onDone?: () => void) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [error, setError] = useState<string>();
  const m = useMutation({
    mutationFn: (id: string) => payoutsApi.cancel(id),
    onSuccess: () => {
      setError(undefined);
      qc.invalidateQueries({ queryKey: ["wallet"] });
      qc.invalidateQueries({ queryKey: ["payouts"] });
      onDone?.();
    },
    onError: (e) => setError(apiErrorMessage(e, t("withdraw.queue.errCancel"))),
  });
  const ask = (w: Withdrawal) => {
    if (window.confirm(`${t("withdraw.queue.cancelConfirmTitle")}\n\n${t("withdraw.queue.cancelConfirmBody", { amount: naira(w.amount) })}`)) m.mutate(w.id);
  };
  return { ask, pendingId: m.isPending ? m.variables : undefined, error };
}

/** Result card for a withdrawal waiting in OAM's transfer queue. */
export function QueuedTransfer({ withdrawal, onDone }: { withdrawal: Withdrawal; onDone: () => void }) {
  const { t } = useTranslation();
  const [cancelled, setCancelled] = useState(false);
  const { ask, pendingId, error } = useCancel(() => setCancelled(true));
  const to = [withdrawal.account_name, withdrawal.account_number].filter(Boolean).join(" · ");
  return (
    <div className="rounded-2xl border border-hairline bg-paper p-6 text-center">
      <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${cancelled ? "bg-brand-green/10" : "bg-amber-600/10"}`}>
        {cancelled ? <CheckCircle2 size={28} className="text-brand-green" /> : <Clock3 size={28} className="text-amber-700" />}
      </div>
      <h2 className="mt-3 font-display text-lg font-semibold text-ink">
        {cancelled ? t("withdraw.queue.cancelledTitle") : t("withdraw.queue.title")}
      </h2>
      <p className="mt-1 text-[17px] font-semibold text-ink">{naira(withdrawal.amount)}</p>
      {to && <p className="text-[13px] text-muted">{t("withdraw.queue.to", { to })}</p>}
      <p className="mt-3 text-[14px] leading-relaxed text-muted">
        {cancelled ? t("withdraw.queue.cancelledBody") : t("withdraw.queue.body")}
      </p>
      {error && <p className="mt-2 text-[13px] text-danger">{error}</p>}
      <div className="mt-5 space-y-2.5">
        <button onClick={onDone} className="h-11 w-full rounded-[11px] bg-brand-green text-[14px] font-semibold text-white">
          {t("withdraw.queue.done")}
        </button>
        {!cancelled && (
          <button onClick={() => ask(withdrawal)} disabled={!!pendingId}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-[11px] border border-hairline bg-paper text-[14px] font-medium text-ink disabled:opacity-60">
            {pendingId && <Loader2 size={15} className="animate-spin" />} {t("withdraw.queue.cancel")}
          </button>
        )}
      </div>
    </div>
  );
}

/** Wallet page: withdrawals still waiting, each cancellable. */
export function PendingTransfers() {
  const { t } = useTranslation();
  const history = useQuery({ queryKey: ["payouts", "history"], queryFn: payoutsApi.history, refetchInterval: 60_000 });
  const { ask, pendingId, error } = useCancel();
  const queued = (history.data ?? []).filter((w) => w.status === "queued");
  if (!queued.length) return null;
  return (
    <div className="mb-6 rounded-2xl border border-amber-600/30 bg-amber-600/5 p-4">
      <p className="flex items-center gap-2 text-[14px] font-semibold text-ink">
        <Clock3 size={16} className="text-amber-700" /> {t("withdraw.queue.pendingTitle", { count: queued.length })}
      </p>
      <p className="mt-1 text-[13px] leading-relaxed text-muted">{t("withdraw.queue.body")}</p>
      <ul className="mt-3 divide-y divide-amber-600/15">
        {queued.map((w) => (
          <li key={w.id} className="flex items-center gap-3 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold text-ink">{naira(w.amount)}</p>
              <p className="truncate text-[12px] text-muted">{[w.account_name, w.account_number].filter(Boolean).join(" · ")}</p>
            </div>
            <button onClick={() => ask(w)} disabled={pendingId === w.id}
              className="flex h-9 items-center gap-1.5 rounded-lg border border-hairline bg-paper px-3 text-[13px] font-medium text-ink disabled:opacity-60">
              {pendingId === w.id && <Loader2 size={13} className="animate-spin" />} {t("withdraw.queue.cancelShort")}
            </button>
          </li>
        ))}
      </ul>
      {error && <p className="mt-2 text-[13px] text-danger">{error}</p>}
    </div>
  );
}
