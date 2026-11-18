import { useEffect, useState } from "react";
import { View, Pressable } from "react-native";
import { CheckCircle2, Clock, Copy, XCircle } from "lucide-react-native";
import * as Clipboard from "expo-clipboard";
import { ActivityIndicator } from "react-native";
import { Text, Button } from "@/shared/ui";
import { colors } from "@/shared/theme";
import { naira } from "@/shared/lib/format";
import { tradeApi, STATUS_LABEL, type TradeOrder } from "./api";

/** One trade: keeps checking while open, shows codes / payout / reason. */
export function TradeResult({ order: initial, onClose }: { order: TradeOrder; onClose: () => void }) {
  const [order, setOrder] = useState(initial);
  const open = order.status === "pending" || order.status === "processing";
  const needCodes = order.kind === "giftcard_buy" && order.status === "success" && !(order.codes?.length);
  useEffect(() => {
    if (!open && !needCodes) return;
    let alive = true;
    const t = setInterval(async () => {
      try { const o = await tradeApi.order(order.reference); if (alive) setOrder(o); } catch { /* keep trying */ }
    }, order.kind === "giftcard_sell" ? 15000 : 3000);
    return () => { alive = false; clearInterval(t); };
  }, [open, needCodes, order.reference, order.kind]);
  const sell = order.kind === "giftcard_sell";
  return (
    <View style={{ borderRadius: 18, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper, padding: 20, alignItems: "center", gap: 6 }}>
      {order.status === "success" ? <CheckCircle2 size={42} color={colors.brand.green} />
        : order.status === "failed" || order.status === "cancelled" ? <XCircle size={42} color={colors.danger} />
        : sell ? <Clock size={42} color={colors.warn} /> : <ActivityIndicator size="large" color={colors.brand.green} />}
      <Text variant="title" style={{ textAlign: "center" }}>{order.title}</Text>
      <Text variant="caption" color="muted">{STATUS_LABEL[order.status]} · {sell ? "You get" : "You paid"} {naira(order.amount)}</Text>
      {sell && order.status === "pending" ? (
        <Text variant="caption" color="muted" style={{ textAlign: "center" }}>Our partner is checking your card. We'll notify you and credit your wallet once it's approved.</Text>
      ) : null}
      {order.failure_reason ? <Text variant="caption" color="danger" style={{ textAlign: "center" }}>{order.failure_reason}</Text> : null}
      {(order.codes ?? []).map((c, i) => (
        <View key={i} style={{ alignSelf: "stretch", borderRadius: 12, backgroundColor: colors.mist, padding: 12, marginTop: 6 }}>
          {Object.entries(c).map(([k, v]) => (
            <View key={k} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <Text variant="caption" color="muted">{k.replace(/_/g, " ")}</Text>
              <Pressable onPress={() => Clipboard.setStringAsync(String(v)).catch(() => {})} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text variant="label" selectable>{String(v)}</Text><Copy size={13} color={colors.brand.green} />
              </Pressable>
            </View>
          ))}
        </View>
      ))}
      <Button title="Done" onPress={onClose} style={{ marginTop: 12, alignSelf: "stretch" }} />
      <Text variant="caption" color="muted">{order.reference}</Text>
    </View>
  );
}

export function TradeHistory({ kind, onOpen }: { kind?: string; onOpen: (o: TradeOrder) => void }) {
  const [rows, setRows] = useState<TradeOrder[] | null>(null);
  useEffect(() => { tradeApi.orders(kind).then(setRows).catch(() => setRows([])); }, [kind]);
  if (rows === null) return <ActivityIndicator color={colors.brand.green} />;
  if (!rows.length) return <Text variant="caption" color="muted">No trades yet.</Text>;
  return (
    <View style={{ borderRadius: 16, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper }}>
      {rows.map((o, i) => (
        <Pressable key={o.id} onPress={() => onOpen(o)} style={{ flexDirection: "row", justifyContent: "space-between", padding: 14, borderTopWidth: i ? 1 : 0, borderTopColor: colors.hairline }}>
          <View style={{ flex: 1 }}><Text variant="label" numberOfLines={1}>{o.title}</Text><Text variant="caption" color="muted">{new Date(o.created_at).toLocaleString()}</Text></View>
          <View style={{ alignItems: "flex-end" }}><Text variant="label">{naira(o.amount)}</Text><Text variant="caption" color="muted">{STATUS_LABEL[o.status]}</Text></View>
        </Pressable>
      ))}
    </View>
  );
}
