/**
 * Cash jobs: the rider kept the whole fee, so OAM's share is owed. Shows the
 * amount, OAM's bank details (copyable) and a "Pay from wallet" shortcut.
 */
import { Alert, Pressable, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Banknote, Copy } from "lucide-react-native";
import { Text } from "@/shared/ui";
import { colors, fonts } from "@/shared/theme";
import { apiErrorMessage } from "@/shared/api";
import { fee, riderApi, type OamBank } from "../api";
import { Card, PillButton } from "./kit";

export function CommissionCard({ due, limit, oamBank, walletBalance }: { due: string | number; limit?: string; oamBank: OamBank | null; walletBalance?: string }) {
  const qc = useQueryClient();
  const owed = Number(due || 0);
  const pay = useMutation({
    mutationFn: riderApi.payCommission,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["rider"] }); qc.invalidateQueries({ queryKey: ["wallets"] }); },
    onError: (e) => Alert.alert("Couldn't pay", apiErrorMessage(e)),
  });
  if (owed <= 0) return null;
  const over = limit != null && owed > Number(limit);
  const copy = (t: string) => { Clipboard.setStringAsync(t).catch(() => {}); };
  return (
    <Card style={{ gap: 10, borderColor: "rgba(180,83,9,0.35)", backgroundColor: "rgba(180,83,9,0.05)" }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Banknote size={20} color={colors.warn} />
        <Text variant="title" style={{ flex: 1, fontSize: 15 }}>Commission owed to OAM</Text>
        <Text variant="title" style={{ color: colors.warn, fontFamily: fonts.bold }}>{fee(owed)}</Text>
      </View>
      <Text variant="caption" color="muted">
        OAM's 20% share of deliveries the customer paid you in cash.{over ? " You'll get cash jobs again once this is paid." : ""}
      </Text>
      {oamBank ? (
        <View style={{ backgroundColor: colors.paper, borderRadius: 12, padding: 12, gap: 6, borderWidth: 1, borderColor: colors.hairline }}>
          <Text variant="caption" color="muted" style={{ fontFamily: fonts.bold }}>TRANSFER TO OAM</Text>
          <Row label="Bank" value={oamBank.bank_name} />
          <Row label="Account number" value={oamBank.account_number} onCopy={() => copy(oamBank.account_number)} />
          <Row label="Account name" value={oamBank.account_name} />
          <Text variant="caption" color="muted">Use your phone number as the transfer narration. We'll confirm it within a day.</Text>
        </View>
      ) : null}
      <PillButton label={`Pay ${fee(owed)} from my OAM wallet`} loading={pay.isPending} onPress={() => pay.mutate()} />
      {walletBalance != null ? <Text variant="caption" color="muted" style={{ textAlign: "center" }}>Wallet balance {fee(walletBalance)}</Text> : null}
    </Card>
  );
}

function Row({ label, value, onCopy }: { label: string; value: string; onCopy?: () => void }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
      <Text variant="caption" color="muted">{label}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 1 }}>
        <Text variant="label" style={{ fontFamily: fonts.bold }} numberOfLines={1}>{value}</Text>
        {onCopy ? <Pressable onPress={onCopy} hitSlop={8} accessibilityLabel={`Copy ${label}`}><Copy size={14} color={colors.brand.green} /></Pressable> : null}
      </View>
    </View>
  );
}
