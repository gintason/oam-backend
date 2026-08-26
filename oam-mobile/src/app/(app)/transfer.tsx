import { useState, useEffect } from "react";
import { View, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, BadgeCheck, CheckCircle2, Send } from "lucide-react-native";
import { Screen, Text, Input, Button } from "@/shared/ui";
import { apiErrorMessage } from "@/shared/api";
import { colors } from "@/shared/theme";
import { naira, money } from "@/shared/lib/format";
import { useDebounced } from "@/shared/hooks/use-debounced";
import { useAuthStore } from "@/features/auth";
import { useWallets, pickHeadline } from "@/features/wallet";
import { transferApi } from "@/features/wallet/api/transfer-api";
import type { WalletTransfer } from "@/entities/wallet";
import { useTranslation } from "react-i18next";

/** A plausible email, or a Nigerian phone number of full length. */
function looksComplete(v: string): boolean {
  const t = v.trim();
  if (t.includes("@")) return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(t);
  return t.replace(/\D/g, "").length >= 11;
}

export default function Transfer() {
  const router = useRouter();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isVerified = user?.is_verified ?? false;

  const [identifier, setIdentifier] = useState("");
  const [recipient, setRecipient] = useState<string | undefined>();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<WalletTransfer | null>(null);

  const wallets = useWallets();
  const ngn = pickHeadline(wallets.data?.wallets);
  const balance = Number(ngn?.balance ?? 0);
  const debouncedIdentifier = useDebounced(identifier, 700);

  const resolve = useMutation({
    mutationFn: () => transferApi.resolve(identifier.trim()),
    onSuccess: (d) => { setRecipient(d.name); setError(null); },
    onError: (err) => { setRecipient(undefined); setError(apiErrorMessage(err, t("transfer.errResolve"))); },
  });

  // Auto-resolve once the identifier looks complete.
  useEffect(() => {
    if (!looksComplete(debouncedIdentifier) || recipient || resolve.isPending) return;
    resolve.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedIdentifier]);

  const send = useMutation({
    mutationFn: () => transferApi.send({ identifier: identifier.trim(), amount: Number(amount), note: note.trim() }),
    onSuccess: (t) => {
      setDone(t); setError(null); setAmount(""); setNote("");
      qc.invalidateQueries({ queryKey: ["wallets"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
    },
    onError: (err) => setError(apiErrorMessage(err, t("transfer.errFailed"))),
  });

  function submit() {
    setError(null);
    if (!recipient) return setError(t("transfer.errWaitRecipient"));
    if (!amount || Number(amount) <= 0) return setError(t("transfer.errEnterAmount"));
    if (Number(amount) > balance) return setError(t("transfer.errExceeds"));
    send.mutate();
  }

  if (!isVerified) {
    return (
      <Screen edges={["top"]}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 8 }}>
          <Text variant="heading">{t("fund.verifyTitle")}</Text>
          <Text variant="body" color="muted" style={{ textAlign: "center" }}>{t("transfer.verifyBody")}</Text>
          <Button title={t("bills.goBack")} variant="secondary" onPress={() => router.back()} style={{ marginTop: 12 }} />
        </View>
      </Screen>
    );
  }

  if (done) {
    return (
      <Screen edges={["top"]}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 40 }}>
          <View style={{ borderRadius: 20, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper, padding: 28, alignItems: "center" }}>
            <CheckCircle2 size={48} strokeWidth={1.5} color={colors.brand.green} />
            <Text variant="heading" style={{ marginTop: 14, textAlign: "center" }}>{t("transfer.sentTitle")}</Text>
            <Text variant="body" color="muted" style={{ marginTop: 4, textAlign: "center" }}>
              {t("transfer.sentTo", { amount: naira(done.amount), name: done.counterparty })}
            </Text>
            <View style={{ marginTop: 18, width: "100%", borderRadius: 14, backgroundColor: colors.mist, padding: 14 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text variant="caption" color="muted">{t("transfer.reference")}</Text>
                <Text variant="mono" color="ink" style={{ fontSize: 11 }}>{done.reference}</Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 22, width: "100%" }}>
              <Button title={t("transfer.sendAgain")} variant="secondary" onPress={() => { setDone(null); setRecipient(undefined); setIdentifier(""); }} style={{ flex: 1 }} />
              <Button title={t("transfer.done")} onPress={() => router.back()} style={{ flex: 1 }} />
            </View>
          </View>
        </ScrollView>
      </Screen>
    );
  }

  const overBalance = Boolean(amount) && Number(amount) > balance;

  return (
    <Screen edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 44 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 14 }}>
          <ArrowLeft size={16} color={colors.muted} /><Text variant="label" color="muted">{t("transfer.back")}</Text>
        </Pressable>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 22 }}>
          <View style={{ height: 44, width: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(11,115,39,0.10)" }}>
            <Send size={22} strokeWidth={1.75} color={colors.brand.green} />
          </View>
          <View>
            <Text variant="heading">{t("transfer.title")}</Text>
            <Text variant="caption" color="muted">{t("transfer.available")} {money(ngn?.balance ?? "0", "NGN")}</Text>
          </View>
        </View>

        <View style={{ borderRadius: 20, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper, padding: 16 }}>
          {error ? <View style={{ marginBottom: 14, borderRadius: 12, borderWidth: 1, borderColor: "rgba(159,18,57,0.3)", backgroundColor: "rgba(159,18,57,0.05)", paddingHorizontal: 12, paddingVertical: 10 }}><Text variant="caption" color="danger">{error}</Text></View> : null}

          <Input
            label={t("transfer.recipientLabel")}
            value={identifier}
            onChangeText={(v) => { setIdentifier(v); setRecipient(undefined); setError(null); }}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            placeholder={t("transfer.recipientPlaceholder")}
          />
          {resolve.isPending ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: -8, marginBottom: 12 }}>
              <ActivityIndicator size="small" color={colors.muted} /><Text variant="caption" color="muted">{t("transfer.finding")}</Text>
            </View>
          ) : recipient ? (
            <View style={{ marginTop: -8, marginBottom: 12, borderRadius: 10, borderWidth: 1, borderColor: "rgba(11,115,39,0.3)", backgroundColor: "rgba(11,115,39,0.05)", paddingHorizontal: 12, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 6 }}>
              <BadgeCheck size={15} strokeWidth={2} color={colors.brand.green} />
              <Text variant="label" color="green">{recipient}</Text>
            </View>
          ) : identifier.trim().length > 0 && !looksComplete(identifier) ? (
            <Text variant="caption" color="muted" style={{ marginTop: -8, marginBottom: 12 }}>
              {identifier.includes("@") ? t("transfer.keepTypingEmail") : t("transfer.keepTypingPhone")}
            </Text>
          ) : null}

          <Input
            label={t("transfer.amountLabel")}
            value={amount}
            onChangeText={(v) => setAmount(v.replace(/[^\d]/g, ""))}
            keyboardType="number-pad"
            placeholder={t("transfer.amountPlaceholder")}
          />
          {overBalance ? (
            <Text variant="caption" color="danger" style={{ marginTop: -8, marginBottom: 12 }}>{t("transfer.exceedsBalance")}</Text>
          ) : null}

          <Input
            label={t("transfer.noteLabel")}
            value={note}
            onChangeText={(v) => setNote(v.slice(0, 140))}
            placeholder={t("transfer.notePlaceholder")}
          />

          <View style={{ marginTop: 4 }}>
            <Button title={amount ? t("transfer.sendAmount", { amount: naira(Number(amount)) }) : t("transfer.sendMoney")} onPress={submit} loading={send.isPending} />
          </View>
          <Text variant="caption" color="muted" style={{ textAlign: "center", marginTop: 10 }}>{t("transfer.instant")}</Text>
        </View>
      </ScrollView>
    </Screen>
  );
}
