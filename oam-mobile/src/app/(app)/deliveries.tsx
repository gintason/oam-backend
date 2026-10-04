/** My deliveries: send CTA, in-progress deliveries, history, and the rider entry point. */
import { View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Bike, ChevronRight, PackageCheck, PackageSearch } from "lucide-react-native";
import { Text } from "@/shared/ui";
import { colors } from "@/shared/theme";
import { Reveal } from "@/shared/ui/motion";
import { deliveriesApi, fee, type DeliveryListItem } from "@/features/deliveries";
import { Card, DeliveriesScreen, DeliveryStatusPill, EmptyState, Loading } from "@/features/deliveries/ui/kit";

export default function Deliveries() {
  const router = useRouter();
  const active = useQuery({ queryKey: ["deliveries", "list", "active"], queryFn: () => deliveriesApi.list({ state: "active" }), refetchInterval: 15000 });
  const past = useQuery({ queryKey: ["deliveries", "list", "past"], queryFn: () => deliveriesApi.list({ state: "past" }) });
  const open = (d: DeliveryListItem) => router.push({ pathname: "/delivery", params: { id: d.id } } as never);

  return (
    <DeliveriesScreen title="My deliveries" subtitle="Track packages and see past sends.">
      <Reveal>
        <Card onPress={() => router.push("/delivery-new" as never)} style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.brand.green, borderColor: colors.brand.green }}>
          <View style={{ height: 44, width: 44, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" }}>
            <PackageCheck size={22} color="#FFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="title" color="paper">Send a package</Text>
            <Text variant="caption" style={{ color: "rgba(255,255,255,0.85)" }}>Picked up in minutes, tracked to the door.</Text>
          </View>
          <ChevronRight size={20} color="#FFF" />
        </Card>
      </Reveal>

      {active.data?.results.length ? (
        <>
          <Text variant="label" color="muted">IN PROGRESS</Text>
          {active.data.results.map((d, i) => <Reveal key={d.id} delay={60 * i}><Row d={d} onPress={() => open(d)} highlight /></Reveal>)}
        </>
      ) : null}

      <Text variant="label" color="muted">HISTORY</Text>
      {past.isLoading || active.isLoading ? <Loading /> : past.data?.results.length ? (
        past.data.results.map((d) => <Row key={d.id} d={d} onPress={() => open(d)} />)
      ) : !active.data?.results.length ? (
        <EmptyState icon={<PackageSearch size={22} color={colors.muted} />} title="No deliveries yet"
          body="Send documents, food or parcels across town — a nearby rider picks it up in minutes." />
      ) : <Text variant="caption" color="muted">Finished deliveries will show here.</Text>}

      <Card onPress={() => router.push("/rider" as never)} style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 8 }}>
        <View style={{ height: 40, width: 40, borderRadius: 12, backgroundColor: colors.mist, alignItems: "center", justifyContent: "center" }}>
          <Bike size={20} color={colors.ink} />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="title" style={{ fontSize: 15 }}>Ride & earn with OAM</Text>
          <Text variant="caption" color="muted">Have a bike, car or van? Deliver nearby and get paid to your wallet.</Text>
        </View>
        <ChevronRight size={18} color={colors.muted} />
      </Card>
    </DeliveriesScreen>
  );
}

function Row({ d, onPress, highlight }: { d: DeliveryListItem; onPress: () => void; highlight?: boolean }) {
  return (
    <Card onPress={onPress} style={{ flexDirection: "row", alignItems: "center", gap: 12, borderColor: highlight ? "rgba(11,115,39,0.35)" : colors.hairline }}>
      <View style={{ height: 40, width: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: highlight ? "rgba(11,115,39,0.10)" : colors.mist }}>
        <Bike size={18} color={highlight ? colors.brand.green : colors.muted} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="title" style={{ fontSize: 15 }} numberOfLines={1}>To {d.recipient_name}</Text>
        <Text variant="caption" color="muted" numberOfLines={1}>{d.dropoff_address}</Text>
        <DeliveryStatusPill status={d.status} />
      </View>
      <Text variant="title" style={{ fontSize: 15 }}>{fee(d.fee, d.currency)}</Text>
    </Card>
  );
}
