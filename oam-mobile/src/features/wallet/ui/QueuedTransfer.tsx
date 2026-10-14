import { useState } from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock3, CheckCircle2 } from "lucide-react-native";
import { Text, Button } from "@/shared/ui";
import { apiErrorMessage } from "@/shared/api";
import { colors } from "@/shared/theme";
import { naira } from "@/shared/lib/format";
import { confirmDestructive } from "@/shared/lib/confirm";
import { payoutsApi, type Withdrawal } from "../api/payouts-api";

/** Result card for a withdrawal that is waiting in OAM's transfer queue. */
export function QueuedTransfer({ withdrawal, onDone }: { withdrawal: Withdrawal; onDone: () => void }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [cancelled, setCancelled] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cancel = useMutation({
    mutationFn: () => payoutsApi.cancel(withdrawal.id),
    onSuccess: () => {
      setCancelled(true);
      qc.invalidateQueries({ queryKey: ["wallets"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["payouts", "history"] });
    },
    onError: (e) => setError(apiErrorMessage(e, t("withdraw.queue.errCancel"))),
  });

  const amount = naira(Number(withdrawal.amount));
  const to = [withdrawal.account_name, withdrawal.account_number].filter(Boolean).join(" · ");

  return (
    <View style={{ borderRadius: 20, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper, padding: 20, alignItems: "center" }}>
      <View style={{ height: 56, width: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", backgroundColor: cancelled ? "rgba(11,115,39,0.10)" : "rgba(180,83,9,0.10)" }}>
        {cancelled ? <CheckCircle2 size={28} color={colors.brand.green} /> : <Clock3 size={28} color="#B45309" />}
      </View>
      <Text variant="heading" style={{ marginTop: 12, textAlign: "center" }}>
        {cancelled ? t("withdraw.queue.cancelledTitle") : t("withdraw.queue.title")}
      </Text>
      <Text variant="title" style={{ marginTop: 6 }}>{amount}</Text>
      {to ? <Text variant="caption" color="muted" style={{ marginTop: 2 }}>{t("withdraw.queue.to", { to })}</Text> : null}
      <Text variant="body" color="muted" style={{ marginTop: 12, textAlign: "center", lineHeight: 21 }}>
        {cancelled ? t("withdraw.queue.cancelledBody") : t("withdraw.queue.body")}
      </Text>
      {error ? <Text variant="caption" color="danger" style={{ marginTop: 10 }}>{error}</Text> : null}
      <View style={{ alignSelf: "stretch", marginTop: 18, gap: 10 }}>
        <Button title={t("withdraw.queue.done")} onPress={onDone} />
        {!cancelled ? (
          <Button
            title={t("withdraw.queue.cancel")}
            variant="secondary"
            loading={cancel.isPending}
            onPress={() => confirmDestructive({
              title: t("withdraw.queue.cancelConfirmTitle"),
              message: t("withdraw.queue.cancelConfirmBody", { amount }),
              confirmText: t("withdraw.queue.cancel"),
              cancelText: t("withdraw.queue.keepWaiting"),
              onConfirm: () => cancel.mutate(),
            })}
          />
        ) : null}
      </View>
    </View>
  );
}

/** Wallet screen: withdrawals still waiting in the queue, each cancellable. */
export function PendingTransfers() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const { data } = useQueryHistory();
  const queued = (data ?? []).filter((w) => w.status === "queued");

  const cancel = useMutation({
    mutationFn: (id: string) => payoutsApi.cancel(id),
    onSuccess: () => {
      setError(null);
      qc.invalidateQueries({ queryKey: ["wallets"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["payouts", "history"] });
    },
    onError: (e) => setError(apiErrorMessage(e, t("withdraw.queue.errCancel"))),
  });

  if (!queued.length) return null;
  return (
    <View style={{ marginTop: 16, borderRadius: 16, borderWidth: 1, borderColor: "rgba(180,83,9,0.3)", backgroundColor: "rgba(180,83,9,0.05)", padding: 14 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Clock3 size={16} color="#B45309" />
        <Text variant="label" color="ink">{t("withdraw.queue.pendingTitle", { count: queued.length })}</Text>
      </View>
      <Text variant="caption" color="muted" style={{ marginTop: 4, lineHeight: 18 }}>{t("withdraw.queue.body")}</Text>
      {queued.map((w) => {
        const amount = naira(Number(w.amount));
        return (
          <View key={w.id} style={{ marginTop: 10, flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text variant="label" color="ink">{amount}</Text>
              <Text variant="caption" color="muted" numberOfLines={1}>{[w.account_name, w.account_number].filter(Boolean).join(" · ")}</Text>
            </View>
            <Button
              title={t("withdraw.queue.cancelShort")}
              variant="secondary"
              loading={cancel.isPending && cancel.variables === w.id}
              onPress={() => confirmDestructive({
                title: t("withdraw.queue.cancelConfirmTitle"),
                message: t("withdraw.queue.cancelConfirmBody", { amount }),
                confirmText: t("withdraw.queue.cancel"),
                cancelText: t("withdraw.queue.keepWaiting"),
                onConfirm: () => cancel.mutate(w.id),
              })}
              style={{ height: 38, paddingHorizontal: 14 }}
            />
          </View>
        );
      })}
      {error ? <Text variant="caption" color="danger" style={{ marginTop: 8 }}>{error}</Text> : null}
    </View>
  );
}

function useQueryHistory() {
  return useQuery({ queryKey: ["payouts", "history"], queryFn: payoutsApi.history, refetchInterval: 60_000 });
}
