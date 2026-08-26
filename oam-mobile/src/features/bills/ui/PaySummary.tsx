import { View } from "react-native";
import { AlertCircle, Wallet as WalletIcon } from "lucide-react-native";
import { Text } from "@/shared/ui";
import { colors } from "@/shared/theme";
import { naira, money } from "@/shared/lib/format";
import { useTranslation } from "react-i18next";

function Row({ label, value, valueColor = "ink", bold }: { label: string; value: string; valueColor?: "ink" | "green"; bold?: boolean }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
      <Text variant={bold ? "label" : "caption"} color="muted">
        {label}
      </Text>
      <Text variant={bold ? "title" : "label"} color={valueColor}>
        {value}
      </Text>
    </View>
  );
}

/** Amount / Fee / Total, plus wallet balance when paying from wallet. OAM adds no fee. */
export function PaySummary({
  amount,
  payWith,
  balance,
  currency = "NGN",
  label,
}: {
  amount: number;
  payWith: "wallet" | "card";
  balance?: string | number;
  currency?: string;
  label?: string;
}) {
  const { t } = useTranslation();
  if (!amount || amount <= 0) return null;
  const insufficient = payWith === "wallet" && balance !== undefined && Number(balance) < amount;

  return (
    <View style={{ marginTop: 20, borderRadius: 14, borderWidth: 1, borderColor: colors.hairline, backgroundColor: "rgba(248,250,252,0.7)", padding: 14, gap: 6 }}>
      <Row label={label ?? t("bills.amount", "Amount")} value={naira(amount)} />
      <Row label={t("bills.fee")} value={naira(0)} valueColor="green" />
      <View style={{ borderTopWidth: 1, borderTopColor: colors.hairline, paddingTop: 6 }}>
        <Row label={t("bills.total")} value={naira(amount)} bold />
      </View>

      {payWith === "wallet" && balance !== undefined ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, borderTopWidth: 1, borderTopColor: colors.hairline, marginTop: 4, paddingTop: 10 }}>
          {insufficient ? <AlertCircle size={13} color={colors.danger} /> : <WalletIcon size={13} color={colors.muted} />}
          <Text variant="caption" color={insufficient ? "danger" : "muted"}>
            {t("bills.walletBalance", { balance: money(balance, currency) })}
            {insufficient ? ` ${t("bills.notEnough")}` : ""}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
