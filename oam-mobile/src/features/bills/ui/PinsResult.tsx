import { useEffect, useState } from "react";
import { View, ScrollView, Image, ActivityIndicator, Pressable, Share } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { CheckCircle2, XCircle, Copy } from "lucide-react-native";
import * as Clipboard from "expo-clipboard";
import { Screen, Text, Button } from "@/shared/ui";
import { colors } from "@/shared/theme";
import type { BillOrder } from "@/entities/billing";
import { billsApi } from "../api/bills-api";

/**
 * Result for Education (exam PINs) and ePIN (packs of 10 printable cards).
 * Keeps checking a processing order until VTU.ng confirms, then shows the PINs
 * or card images. Failed orders are refunded to the wallet automatically.
 */
export function PinsResult({ order: initial, title, onAgain, onDone }: {
  order: BillOrder; title: string; onAgain: () => void; onDone: () => void;
}) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [order, setOrder] = useState<BillOrder>(initial);
  const status = String(order.status).toLowerCase();
  const pending = status === "pending" || status === "processing";
  const ok = status === "success";
  const waitingForPins = ok && order.category === "education" && !(order.pins?.length);

  useEffect(() => {
    if (!pending && !waitingForPins) {
      qc.invalidateQueries({ queryKey: ["wallets"] });
      return;
    }
    let alive = true;
    let n = 0;
    const timer = setInterval(async () => {
      n += 1;
      try {
        const fresh = await billsApi.refreshOrder(order.reference);
        if (alive) setOrder(fresh);
      } catch { /* keep trying */ }
      if (n >= 40) clearInterval(timer);
    }, 2500);
    return () => { alive = false; clearInterval(timer); };
  }, [pending, waitingForPins, order.reference, qc]);

  const copy = async (text: string) => { try { await Clipboard.setStringAsync(text); } catch { /* ignore */ } };
  const sharePins = () => {
    const lines = (order.pins ?? []).map((p, i) => `${i + 1}. PIN ${p.pin}${p.serial ? `  (Serial ${p.serial})` : ""}`);
    Share.share({ message: `${order.biller_name}${order.plan_name ? ` – ${order.plan_name}` : ""}\n${lines.join("\n")}` }).catch(() => {});
  };

  return (
    <Screen edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 36, paddingBottom: 40, alignItems: "stretch" }}>
        <View style={{ alignItems: "center", gap: 8 }}>
          {pending || waitingForPins ? <ActivityIndicator size="large" color={colors.brand.green} />
            : ok ? <CheckCircle2 size={46} color={colors.brand.green} /> : <XCircle size={46} color={colors.danger} />}
          <Text variant="heading" style={{ textAlign: "center" }}>
            {pending || waitingForPins ? t("bills.result.inProgress", "Purchase in progress") : ok ? title : t("pins.failed", "Purchase failed")}
          </Text>
          <Text variant="caption" color="muted" style={{ textAlign: "center" }}>
            {pending || waitingForPins
              ? t("pins.wait", "Hold on — this usually takes a few seconds.")
              : ok
              ? `₦${Number(order.amount).toLocaleString()} · ${order.biller_name}${order.plan_name ? ` · ${order.plan_name}` : ""}`
              : t("pins.refunded", "Your money is back in your O.A.M wallet.")}
          </Text>
        </View>

        {ok && (order.pins?.length ?? 0) > 0 ? (
          <View style={{ marginTop: 20, gap: 10 }}>
            {order.pins!.map((p, i) => (
              <View key={i} style={{ borderWidth: 1, borderColor: colors.hairline, borderRadius: 14, padding: 14, backgroundColor: colors.mist }}>
                {p.serial ? <Text variant="caption" color="muted">{t("pins.serial", "Serial")}: {p.serial}</Text> : null}
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
                  <Text variant="title" selectable style={{ letterSpacing: 1 }}>{p.pin}</Text>
                  <Pressable onPress={() => copy(p.pin)} hitSlop={10} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Copy size={15} color={colors.brand.green} /><Text variant="caption" color="green">{t("pins.copy", "Copy")}</Text>
                  </Pressable>
                </View>
              </View>
            ))}
            <Button title={t("pins.share", "Share PINs")} variant="secondary" onPress={sharePins} />
          </View>
        ) : null}

        {ok && (order.epin_cards?.length ?? 0) > 0 ? (
          <View style={{ marginTop: 20, gap: 14 }}>
            {order.epin_cards!.map((c, i) => (
              <View key={c.id || i} style={{ borderWidth: 1, borderColor: colors.hairline, borderRadius: 14, padding: 12, backgroundColor: colors.mist }}>
                <Text variant="label" style={{ marginBottom: 8 }}>{c.network} ₦{Number(c.denomination).toLocaleString()} × {c.pieces_count} {t("pins.cards", "cards")}</Text>
                {c.image_url ? (
                  <Image source={{ uri: c.image_url }} resizeMode="contain" style={{ width: "100%", aspectRatio: 0.7, borderRadius: 10, backgroundColor: "#fff" }} />
                ) : (
                  <Text variant="caption" color="muted">{t("pins.openWeb", "Open this order from your order history to view the cards.")}</Text>
                )}
              </View>
            ))}
            <Text variant="caption" color="muted" style={{ textAlign: "center" }}>
              {t("pins.printTip", "Take a screenshot to keep or print your cards. You can also print them from oam-app.com.")}
            </Text>
          </View>
        ) : null}

        <View style={{ flexDirection: "row", gap: 12, marginTop: 24 }}>
          <Button title={t("airtime.success.buyAgain", "Buy again")} variant="secondary" onPress={onAgain} style={{ flex: 1 }} />
          <Button title={t("airtime.success.done", "Done")} onPress={onDone} style={{ flex: 1 }} />
        </View>
        <Text variant="caption" color="muted" style={{ textAlign: "center", marginTop: 14 }}>{order.reference}</Text>
      </ScrollView>
    </Screen>
  );
}
