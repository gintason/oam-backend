import { View, ScrollView, ActivityIndicator } from "react-native";
import { Screen, Text } from "@/shared/ui";
import { colors } from "@/shared/theme";
import { useWallets, useTransactions, pickHeadline, BalanceCard, TransactionRow } from "@/features/wallet";

export default function WalletScreen() {
  const wallets = useWallets();
  const headline = pickHeadline(wallets.data?.wallets);
  const txns = useTransactions(headline?.currency);

  return (
    <Screen edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <Text variant="heading" style={{ marginBottom: 18 }}>
          Wallet
        </Text>

        <BalanceCard balance={headline?.balance} currency={headline?.currency} loading={wallets.isLoading} />

        <Text variant="title" style={{ marginTop: 26, marginBottom: 4 }}>
          Transactions
        </Text>
        {txns.isLoading ? (
          <ActivityIndicator color={colors.brand.green} style={{ marginTop: 16 }} />
        ) : txns.data && txns.data.length > 0 ? (
          <View>
            {txns.data.map((t) => (
              <TransactionRow key={t.id} txn={t} />
            ))}
          </View>
        ) : (
          <Text variant="body" color="muted" style={{ marginTop: 8 }}>
            No transactions yet.
          </Text>
        )}
      </ScrollView>
    </Screen>
  );
}
