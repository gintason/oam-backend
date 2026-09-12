import { useState, useEffect } from "react";
import { View, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ChevronRight, KeyRound, Loader2, Receipt, RefreshCw, Smartphone, Tv, Wifi, Zap } from "lucide-react-native";
import { Screen, Text, Button } from "@/shared/ui";
import { colors } from "@/shared/theme";
import { naira } from "@/shared/lib/format";
import { useAuthStore } from "@/features/auth";
import { billsApi, TokenCard } from "@/features/bills";
import type { BillOrder } from "@/entities/billing";

const ICONS: Record<string, LucideIconType> = { airtime: Smartphone, data: Wifi, electricity: Zap, cable: Tv };
type LucideIconType = typeof Smartphone;

export default function Orders() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const isVerified = user?.is_verified ?? false;
  const [openRef, setOpenRef] = useState<string | null>(null);
  const [autoOpened, setAutoOpened] = useState(false);

  const ordersQuery = useQuery({
    queryKey: ["bill-orders"],
    queryFn: billsApi.getOrders,
    enabled: isVerified,
    refetchInterval: (q) => {
      const rows = (q.state.data?.results ?? []) as BillOrder[];
      return rows.some((o) => ["pending", "processing"].includes(String(o.status).toLowerCase())) ? 5000 : false;
    },
  });

  const orders = ordersQuery.data?.results ?? [];

  const unsettled = (o: BillOrder) =>
    ["pending", "processing"].includes(String(o.status).toLowerCase()) ||
    (String(o.status).toLowerCase() === "success" && o.category === "electricity" && o.meter_type !== "postpaid" && !o.token);
  const outstanding = orders.filter(unsettled).length;

  const refresh = useMutation({
    mutationFn: billsApi.refreshOrders,
    onSuccess: () => ordersQuery.refetch(),
    onError: () => ordersQuery.refetch(),
  });

  useEffect(() => {
    if (outstanding === 0) return;
    const id = setInterval(() => { if (!refresh.isPending) refresh.mutate(); }, 12000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outstanding]);

  useEffect(() => {
    if (autoOpened || orders.length === 0) return;
    const notable = orders.find((o) => o.token || ["pending", "processing"].includes(String(o.status).toLowerCase()));
    if (notable) setOpenRef(notable.reference);
    setAutoOpened(true);
  }, [orders, autoOpened]);

  if (!isVerified) {
    return (
      <Screen edges={["top"]}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 28, gap: 8 }}>
          <Receipt size={30} color={colors.muted} />
          <Text variant="body" color="muted" style={{ textAlign: "center" }}>{t("orders.emptyBody")}</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
          <View style={{ flex: 1 }}>
            <Text variant="heading">{t("orders.title")}</Text>
            <Text variant="caption" color="muted">{t("orders.subtitle")}</Text>
          </View>
          <Pressable onPress={() => refresh.mutate()} disabled={refresh.isPending} style={{ flexDirection: "row", alignItems: "center", gap: 6, height: 36, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper }}>
            <RefreshCw size={14} color={colors.ink} />
            <Text variant="caption" color="ink">{refresh.isPending ? t("orders.checking") : t("orders.refresh")}</Text>
          </Pressable>
        </View>

        {outstanding > 0 ? (
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 14, borderRadius: 12, borderWidth: 1, borderColor: "rgba(210,145,20,0.3)", backgroundColor: "rgba(210,145,20,0.06)", paddingHorizontal: 12, paddingVertical: 10 }}>
            <ActivityIndicator size="small" color={colors.warn} />
            <Text variant="caption" color="ink" style={{ flex: 1 }}>
              <Text variant="caption" color="ink" style={{ fontWeight: "700" }}>{t(outstanding === 1 ? "orders.outstandingOne" : "orders.outstandingOther", { count: outstanding })}</Text> {t("orders.outstandingBody")}
            </Text>
          </View>
        ) : null}

        {ordersQuery.isLoading ? (
          <ActivityIndicator color={colors.brand.green} style={{ marginTop: 30 }} />
        ) : ordersQuery.isError ? (
          <View style={{ borderRadius: 16, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper, padding: 18 }}>
            <Text variant="body" color="ink">{t("orders.errLoad")}</Text>
            <Button title={t("orders.tryAgain")} variant="secondary" onPress={() => ordersQuery.refetch()} style={{ marginTop: 12 }} />
          </View>
        ) : orders.length === 0 ? (
          <View style={{ alignItems: "center", borderRadius: 18, borderWidth: 1, borderStyle: "dashed", borderColor: colors.hairline, backgroundColor: colors.paper, paddingVertical: 44, paddingHorizontal: 20 }}>
            <Receipt size={26} color={colors.muted} />
            <Text variant="label" color="ink" style={{ marginTop: 10 }}>{t("orders.emptyTitle")}</Text>
            <Text variant="caption" color="muted" style={{ marginTop: 2, textAlign: "center" }}>{t("orders.emptyBody")}</Text>
          </View>
        ) : (
          orders.map((o) => {
            const open = openRef === o.reference;
            const ok = o.status === "success";
            const Icon = ICONS[o.category] ?? Receipt;
            const waiting = !o.token && o.category === "electricity" && o.meter_type !== "postpaid" && ["pending", "processing"].includes(String(o.status).toLowerCase());
            return (
              <View key={o.id} style={{ borderRadius: 14, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper, marginBottom: 8, overflow: "hidden" }}>
                <Pressable onPress={() => setOpenRef(open ? null : o.reference)} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 12 }}>
                  <View style={{ height: 36, width: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: ok ? "rgba(11,115,39,0.10)" : colors.mist }}>
                    <Icon size={17} color={ok ? colors.brand.green : colors.muted} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="label" color="ink" numberOfLines={1}>{o.biller_name} · {o.recipient}</Text>
                    <Text variant="caption" color="muted">
                      {new Date(o.created_at).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · <Text variant="caption" color={ok ? "green" : o.status === "failed" ? "danger" : "warn"}>{t("orders.status." + o.status, { defaultValue: o.status })}</Text>
                    </Text>
                    {o.token ? (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 3, marginTop: 3, alignSelf: "flex-start", backgroundColor: "rgba(11,115,39,0.10)", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                        <KeyRound size={10} color={colors.brand.green} /><Text variant="caption" color="green">{t("orders.tokenReady")} — {open ? t("orders.shownBelow") : t("orders.tapToView")}</Text>
                      </View>
                    ) : waiting ? (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 3, marginTop: 3, alignSelf: "flex-start", backgroundColor: "rgba(210,145,20,0.10)", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                        <Loader2 size={10} color={colors.warn} /><Text variant="caption" color="warn">{t("orders.tokenOnTheWay")}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text variant="label" color="ink">{naira(Number(o.amount))}</Text>
                  <ChevronRight size={16} color={colors.muted} style={{ transform: [{ rotate: open ? "90deg" : "0deg" }] }} />
                </Pressable>

                {open ? (
                  <View style={{ borderTopWidth: 1, borderTopColor: colors.hairline, backgroundColor: colors.mist, paddingHorizontal: 14, paddingVertical: 14 }}>
                    {o.token ? (
                      <View style={{ marginBottom: 12 }}><TokenCard token={o.token} units={o.units} /></View>
                    ) : o.category === "electricity" && o.meter_type !== "postpaid" ? (
                      <View style={{ marginBottom: 12, borderRadius: 12, borderWidth: 1, borderColor: "rgba(210,145,20,0.3)", backgroundColor: "rgba(210,145,20,0.06)", padding: 14, alignItems: "center" }}>
                        <ActivityIndicator color={colors.warn} />
                        <Text variant="caption" color="ink" style={{ marginTop: 6, textAlign: "center", fontWeight: "600" }}>{["pending", "processing"].includes(String(o.status).toLowerCase()) ? t("orders.tokenBeingIssued") : t("orders.tokenWaiting")}</Text>
                        <Text variant="caption" color="muted" style={{ marginTop: 2, textAlign: "center" }}>{t("orders.tokenAutoNote")}</Text>
                      </View>
                    ) : null}
                    <View style={{ gap: 6 }}>
                      {o.customer_name ? <Row label={t("orders.rowCustomer")} value={o.customer_name} /> : null}
                      <Row label={t("orders.rowService")} value={t("orders.category." + o.category, { defaultValue: o.category })} />
                      {o.meter_type ? <Row label={t("orders.rowMeterType")} value={t("orders.meter." + o.meter_type, { defaultValue: o.meter_type })} /> : null}
                      <Row label={t("orders.rowPaidWith")} value={t("orders.payWith." + o.pay_with, { defaultValue: o.pay_with })} />
                      <Row label={t("orders.rowReference")} value={o.reference} mono />
                      {o.provider_reference ? <Row label={t("orders.rowProviderRef")} value={o.provider_reference} mono /> : null}
                    </View>
                  </View>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>
    </Screen>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
      <Text variant="caption" color="muted">{label}</Text>
      <Text variant="caption" color="ink" style={{ flex: 1, textAlign: "right" }} numberOfLines={1}>{value}</Text>
    </View>
  );
}
