import { useState, useEffect } from "react";
import { View, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Send, BadgeCheck, CheckCircle2 } from "lucide-react-native";
import { Screen, Text, Input, Button } from "@/shared/ui";
import { apiErrorMessage } from "@/shared/api";
import { colors } from "@/shared/theme";
import { naira } from "@/shared/lib/format";
import { useDebounced } from "@/shared/hooks/use-debounced";
import { useWallets, pickHeadline } from "@/features/wallet";
import { transferApi } from "@/features/wallet/api/transfer-api";
import { TransactionPinModal } from "@/features/wallet/ui/TransactionPinModal";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/features/auth";
import { ReceiptScreen, type MobileReceipt } from "@/features/receipts/ReceiptScreen";
import { formatReceiptDate } from "@/features/receipts/format-receipt-date";

export default function TransferWallet() {
  const router = useRouter();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const balance = Number(pickHeadline(useWallets().data?.wallets)?.balance ?? 0);
  const user = useAuthStore((s) => s.user);

  const [identifier, setIdentifier] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<MobileReceipt | null>(null);
  const [pinOpen, setPinOpen] = useState(false);

  // Resolve the recipient by email/phone so the sender sees the name before sending.
  const debounced = useDebounced(identifier, 500);
  const resolved = useQuery({
    queryKey: ["wallet", "resolve", debounced],
    queryFn: () => transferApi.resolve(debounced.trim()),
    enabled: debounced.trim().length >= 3 && debounced.includes("@") || debounced.trim().length >= 6,
    retry: false,
  });

  const send = useMutation({
    mutationFn: (pin: string) => transferApi.send({ identifier: identifier.trim(), amount: Number(amount), note: note.trim(), pin }),
    onSuccess: (trf) => {
      if (!trf?.reference) { setError(t("transfer.wallet.errFailed", "Transfer couldn't be confirmed. Check your wallet before retrying.")); return; }
      qc.invalidateQueries({ queryKey: ["wallets"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      setReceipt({
        amount: Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2 }),
        date: formatReceiptDate(new Date()),
        recipientName: resolved.data?.name ?? "",
        recipientSub: "OAM Wallet" + (identifier.includes("@") ? ` · ${identifier}` : ""),
        senderName: `${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim() || "You",
        senderSub: "OAM Wallet",
        type: "Wallet Transfer",
        note: note.trim() || undefined,
        reference: trf.reference,
      });
    },
    onError: (err) => setError(apiErrorMessage(err, t("transfer.wallet.errFailed", "Transfer failed. Try again."))),
  });

  function submit() {
    setError(null);
    if (!identifier.trim()) return setError(t("transfer.wallet.errRecipient", "Enter the recipient's email or phone."));
    if (!resolved.data?.name) return setError(t("transfer.wallet.errResolve", "We couldn't find that OAM user."));
    const amt = Number(amount);
    if (!amt || amt <= 0) return setError(t("transfer.wallet.errAmount", "Enter a valid amount."));
    if (amt > balance) return setError(t("transfer.wallet.errBalance", "That's more than your wallet balance."));
    setPinOpen(true);
  }

  if (receipt) {
    return <ReceiptScreen data={receipt} onBack={() => router.replace("/home")} />;
  }

  return (
    <Screen edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 14 }}>
          <ArrowLeft size={16} color={colors.muted} /><Text variant="label" color="muted">{t("common.back", "Back")}</Text>
        </Pressable>

        <Text variant="heading">{t("transfer.wallet.title", "Send to an OAM wallet")}</Text>
        <Text variant="caption" color="muted" style={{ marginTop: 4, marginBottom: 18 }}>
          {t("transfer.wallet.subtitle", "Instant, free transfer to another OAM user.")}
        </Text>

        {error ? <View style={{ marginBottom: 14, borderRadius: 12, borderWidth: 1, borderColor: "rgba(159,18,57,0.3)", backgroundColor: "rgba(159,18,57,0.05)", paddingHorizontal: 12, paddingVertical: 10 }}><Text variant="caption" color="danger">{error}</Text></View> : null}

        <Input
          label={t("transfer.wallet.recipientLabel", "Recipient email or phone")}
          value={identifier}
          onChangeText={(v) => setIdentifier(v.trim())}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="name@example.com"
        />
        {resolved.isFetching ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 }}>
            <ActivityIndicator size="small" color={colors.brand.green} /><Text variant="caption" color="muted">{t("transfer.wallet.checking", "Checking…")}</Text>
          </View>
        ) : resolved.data?.name ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 }}>
            <BadgeCheck size={15} color={colors.brand.green} /><Text variant="caption" color="green">{resolved.data.name}</Text>
          </View>
        ) : debounced.trim().length >= 3 ? (
          <Text variant="caption" color="muted" style={{ marginBottom: 10 }}>{t("transfer.wallet.notFound", "No OAM user with that email/phone.")}</Text>
        ) : null}

        <Input label={t("transfer.wallet.amountLabel", "Amount (₦)")} value={amount} onChangeText={(v) => setAmount(v.replace(/[^0-9.]/g, ""))} keyboardType="decimal-pad" placeholder="0" />
        <Text variant="caption" color="muted" style={{ marginBottom: 12 }}>{t("transfer.wallet.balance", "Wallet balance")}: {naira(balance)}</Text>

        <Input label={t("transfer.wallet.noteLabel", "Note (optional)")} value={note} onChangeText={setNote} placeholder={t("transfer.wallet.notePlaceholder", "What's it for?")} />

        <Button title={amount ? `${t("transfer.wallet.send", "Send")} ${naira(Number(amount) || 0)}` : t("transfer.wallet.send", "Send")} onPress={submit} loading={send.isPending} style={{ marginTop: 6 }} />
      </ScrollView>

      <TransactionPinModal
        visible={pinOpen}
        onCancel={() => setPinOpen(false)}
        onConfirm={(pin) => { setPinOpen(false); send.mutate(pin); }}
        busy={send.isPending}
      />
    </Screen>
  );
}
