/** Rider earnings: wallet balance, today / this week / all time, and the payout ledger. */
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowUpRight, Receipt } from "lucide-react-native";
import { Text } from "@/shared/ui";
import { colors, fonts } from "@/shared/theme";
import { Reveal } from "@/shared/ui/motion";
import { fee, riderApi } from "@/features/deliveries";
import { Card, DeliveriesScreen, EmptyState, Loading, PillButton } from "@/features/deliveries/ui/kit";

export default function RiderEarnings() {
  const router = useRouter();
  const q = useQuery({ queryKey: ["rider", "earnings"], queryFn: riderApi.earnings, refetchInterval: 30000 });
  const e = q.data;
  const back = (
    <Pressable onPress={() => router.replace("/rider" as never)} hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start" }}>
      <ArrowLeft size={16} color={colors.brand.green} /><Text variant="label" color="green">Rider home</Text>
    </Pressable>
  );
  return (
    <DeliveriesScreen title="Earnings" subtitle="Every delivery pays straight into your OAM wallet." tabs={false} back={back}>
      {!e ? <Loading /> : (
        <>
          <Reveal>
            <Card style={{ backgroundColor: colors.ink, borderColor: colors.ink, gap: 6 }}>
              <Text variant="caption" style={{ color: "rgba(255,255,255,0.7)" }}>Wallet balance</Text>
              <Text variant="display" color="paper" style={{ fontSize: 34 }}>{fee(e.wallet_balance, e.currency)}</Text>
              <PillButton label="Withdraw to bank" tone="red" icon={<ArrowUpRight size={16} color="#FFF" />} style={{ marginTop: 8 }} onPress={() => router.push("/withdraw")} />
            </Card>
          </Reveal>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Box label="Today" value={fee(e.today, e.currency)} sub={`${e.today_count} trip${e.today_count === 1 ? "" : "s"}`} />
            <Box label="This week" value={fee(e.this_week, e.currency)} />
          </View>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Box label="All time" value={fee(e.total_earnings, e.currency)} sub={`${e.completed_deliveries} deliveries`} />
            <Box label="Rating" value={Number(e.rating_avg) ? `★ ${Number(e.rating_avg).toFixed(2)}` : "New"} sub={`${e.rating_count} ratings`} />
          </View>
          <Text variant="label" color="muted" style={{ marginTop: 6 }}>PAYOUT HISTORY</Text>
          {e.ledger.length ? e.ledger.map((t) => (
            <Card key={t.reference} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 }}>
              <View style={{ height: 36, width: 36, borderRadius: 10, backgroundColor: "rgba(11,115,39,0.10)", alignItems: "center", justifyContent: "center" }}>
                <Receipt size={17} color={colors.brand.green} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="label">{t.reference}</Text>
                <Text variant="caption" color="muted" numberOfLines={1}>{t.dropoff_address}</Text>
                <Text variant="caption" color="muted">{new Date(t.settled_at).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · fee {fee(t.gross_amount, t.currency)} − OAM {fee(t.platform_fee, t.currency)}</Text>
              </View>
              <Text variant="title" color="green" style={{ fontSize: 15 }}>+{fee(t.rider_payout, t.currency)}</Text>
            </Card>
          )) : <EmptyState icon={<Receipt size={22} color={colors.muted} />} title="No payouts yet" body="Complete your first delivery to see earnings here." />}
        </>
      )}
    </DeliveriesScreen>
  );
}

function Box({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card style={{ flex: 1, paddingVertical: 12 }}>
      <Text variant="caption" color="muted">{label}</Text>
      <Text variant="title" style={{ fontSize: 18, fontFamily: fonts.bold }}>{value}</Text>
      {sub ? <Text variant="caption" color="muted">{sub}</Text> : null}
    </Card>
  );
}
