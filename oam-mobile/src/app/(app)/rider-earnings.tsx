/**
 * Rider earnings: payout bank (80% of app-paid jobs goes here automatically),
 * commission owed on cash jobs, totals, and per-delivery payout status.
 */
import { useState } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowUpRight, Banknote, Landmark, Receipt } from "lucide-react-native";
import { Text } from "@/shared/ui";
import { colors, fonts } from "@/shared/theme";
import { apiErrorMessage } from "@/shared/api";
import { Reveal } from "@/shared/ui/motion";
import { fee, riderApi, type Earnings } from "@/features/deliveries";
import { BankFields, type BankValue } from "@/features/deliveries/ui/BankFields";
import { CommissionCard } from "@/features/deliveries/ui/Commission";
import { Card, DeliveriesScreen, EmptyState, ErrorNote, Loading, PillButton } from "@/features/deliveries/ui/kit";

const PAYOUT_TONE: Record<string, string> = { sent: colors.brand.green, processing: colors.warn, failed: colors.danger, wallet: colors.muted };

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
    <DeliveriesScreen title="Earnings" subtitle="App-paid deliveries go straight to your bank." tabs={false} back={back}>
      {!e ? <Loading /> : (
        <>
          <BankCard e={e} />
          <CommissionCard due={e.cash_commission_due} limit={e.cash_debt_limit} oamBank={e.oam_bank} walletBalance={e.wallet_balance} />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Box label="Today" value={fee(e.today, e.currency)} sub={`${e.today_count} trip${e.today_count === 1 ? "" : "s"}`} />
            <Box label="This week" value={fee(e.this_week, e.currency)} />
          </View>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Box label="All time" value={fee(e.total_earnings, e.currency)} sub={`${e.completed_deliveries} deliveries`} />
            <Box label="Rating" value={Number(e.rating_avg) ? `★ ${Number(e.rating_avg).toFixed(2)}` : "New"} sub={`${e.rating_count} ratings`} />
          </View>
          {Number(e.wallet_balance) > 0 ? (
            <Card style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text variant="caption" color="muted">In your OAM wallet</Text>
                <Text variant="title">{fee(e.wallet_balance, e.currency)}</Text>
              </View>
              <PillButton label="Withdraw" tone="red" icon={<ArrowUpRight size={15} color="#FFF" />} onPress={() => router.push("/withdraw")} />
            </Card>
          ) : null}

          <Text variant="label" color="muted" style={{ marginTop: 6 }}>DELIVERIES</Text>
          {e.ledger.length ? e.ledger.map((t) => {
            const cash = t.payment_method === "cash";
            return (
              <Card key={t.reference} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 }}>
                <View style={{ height: 36, width: 36, borderRadius: 10, backgroundColor: cash ? "rgba(180,83,9,0.10)" : "rgba(11,115,39,0.10)", alignItems: "center", justifyContent: "center" }}>
                  {cash ? <Banknote size={17} color={colors.warn} /> : <Receipt size={17} color={colors.brand.green} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="label">{t.reference}</Text>
                  <Text variant="caption" color="muted" numberOfLines={1}>{t.dropoff_address}</Text>
                  <Text variant="caption" style={{ color: cash ? colors.warn : PAYOUT_TONE[t.payout_status] ?? colors.muted, fontFamily: fonts.medium }}>
                    {cash ? (t.status === "cash_due" ? `Cash · OAM share ${fee(t.platform_fee, t.currency)} due` : "Cash · commission paid")
                      : t.payout_label || "Processing"}
                  </Text>
                </View>
                <Text variant="title" color="green" style={{ fontSize: 15 }}>+{fee(t.rider_payout, t.currency)}</Text>
              </Card>
            );
          }) : <EmptyState icon={<Receipt size={22} color={colors.muted} />} title="No deliveries yet" body="Complete your first delivery to see earnings here." />}
        </>
      )}
    </DeliveriesScreen>
  );
}

function BankCard({ e }: { e: Earnings }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(!e.payout_account);
  const [bank, setBank] = useState<BankValue>({ bank_code: "", bank_name: "", account_number: "", account_name: "" });
  const save = useMutation({
    mutationFn: () => riderApi.setBank(bank.bank_code, bank.account_number),
    onSuccess: () => { setEditing(false); qc.invalidateQueries({ queryKey: ["rider"] }); },
  });
  return (
    <Reveal>
      <Card style={{ gap: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ height: 38, width: 38, borderRadius: 10, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center" }}>
            <Landmark size={18} color="#FFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="caption" color="muted">Payout account</Text>
            {e.payout_account ? (
              <>
                <Text variant="title" style={{ fontSize: 15 }}>{e.payout_account.account_name}</Text>
                <Text variant="caption" color="muted">{e.payout_account.bank_name} · {e.payout_account.account_number}</Text>
              </>
            ) : <Text variant="title" style={{ fontSize: 15, color: colors.warn }}>Not set — earnings stay in your wallet</Text>}
          </View>
          {e.payout_account && !editing ? <Pressable onPress={() => setEditing(true)} hitSlop={8}><Text variant="label" color="green">Change</Text></Pressable> : null}
        </View>
        {editing ? (
          <>
            <BankFields value={bank} onChange={setBank} />
            <ErrorNote>{save.error ? apiErrorMessage(save.error) : null}</ErrorNote>
            <View style={{ flexDirection: "row", gap: 10 }}>
              {e.payout_account ? <PillButton label="Cancel" tone="outline" onPress={() => setEditing(false)} /> : null}
              <PillButton label="Save bank account" style={{ flex: 1 }} disabled={!bank.account_name} loading={save.isPending} onPress={() => save.mutate()} />
            </View>
          </>
        ) : (
          <Text variant="caption" color="muted">80% of every delivery paid in the app is sent here automatically when you complete it.</Text>
        )}
      </Card>
    </Reveal>
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
