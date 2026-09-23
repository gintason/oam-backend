import { View, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Receipt } from "lucide-react-native";
import { Screen, Text } from "@/shared/ui";
import { colors } from "@/shared/theme";
import { useWallets, useTransactions, pickHeadline, TransactionRow } from "@/features/wallet";

export default function Transactions() {
  const router = useRouter();
  const { t } = useTranslation();
  const wallets = useWallets();
  const headline = pickHeadline(wallets.data?.wallets);
  const txns = useTransactions(headline?.currency);

  return (
    <Screen edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 14 }}>
          <ArrowLeft size={16} color={colors.muted} /><Text variant="label" color="muted">{t("common.back", "Back")}</Text>
        </Pressable>

        <Text variant="heading" style={{ marginBottom: 4 }}>{t("dashboard.recentTransactions", "Recent transactions")}</Text>
        <Text variant="caption" color="muted" style={{ marginBottom: 16 }}>{headline?.currency ?? "NGN"} wallet</Text>

        {txns.isLoading ? (
          <ActivityIndicator color={colors.brand.green} style={{ marginTop: 24 }} />
        ) : txns.data && txns.data.length > 0 ? (
          txns.data.map((t) => <TransactionRow key={t.id} txn={t} />)
        ) : (
          <View style={{ alignItems: "center", paddingVertical: 60, gap: 10 }}>
            <Receipt size={30} color={colors.muted} />
            <Text variant="body" color="muted">{t("dashboard.noTransactions", "No transactions yet.")}</Text>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
