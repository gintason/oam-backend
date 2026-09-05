import { View } from "react-native";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react-native";
import { Text } from "@/shared/ui";
import { colors } from "@/shared/theme";
import { naira, shortDate } from "@/shared/lib/format";
import type { Transaction } from "@/entities/wallet";

export function TransactionRow({ txn }: { txn: Transaction }) {
  const credit = txn.direction === "credit";
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 }}>
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 19,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: credit ? "rgba(11,115,39,0.10)" : colors.mist,
        }}
      >
        {credit ? (
          <ArrowDownLeft size={18} color={colors.brand.green} />
        ) : (
          <ArrowUpRight size={18} color={colors.muted} />
        )}
      </View>

      <View style={{ flex: 1 }}>
        <Text variant="label" numberOfLines={1}>
          {txn.description || txn.reference || "Transaction"}
        </Text>
        <Text variant="caption" color="muted">
          {shortDate(txn.created_at)}
        </Text>
      </View>

      <Text variant="label" color={credit ? "green" : "danger"}>
        {credit ? "+" : "-"}
        {naira(txn.amount)}
      </Text>
    </View>
  );
}
