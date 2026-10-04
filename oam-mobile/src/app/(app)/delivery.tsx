/** Track one delivery live: map, progress, rider, delivery code, cancel / rate. */
import { useState } from "react";
import { Alert, Platform, Pressable, Share, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, MessageCircle, Phone, RefreshCw, Search, Share2, Star, XCircle } from "lucide-react-native";
import { Text } from "@/shared/ui";
import { colors, fonts } from "@/shared/theme";
import { apiErrorMessage } from "@/shared/api";
import { useJobsSocket } from "@/features/jobs";
import { callNumber, deliveriesApi, fee, MapView, smsNumber, type Delivery, type MapMarker } from "@/features/deliveries";
import {
  Avatar, Card, CheckoutModal, DeliveriesScreen, DeliveryStatusPill, ErrorNote, FeeBreakdown, Loading, PillButton,
  StatusStepper, TextBox, Timeline,
} from "@/features/deliveries/ui/kit";

const RETURN_URL = "https://oam-app.com/deliveries/payment-return";

export default function DeliveryTrack() {
  const { id = "" } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const key = ["deliveries", "detail", id];
  const [live, setLive] = useState<{ lat: number; lng: number } | null>(null);

  const q = useQuery({
    queryKey: key, queryFn: () => deliveriesApi.get(id), enabled: Boolean(id),
    refetchInterval: (query) => {
      const s = (query.state.data as Delivery | undefined)?.status;
      return s === "delivered" || s === "cancelled" ? false : s === "pending" ? 5000 : 10000;
    },
  });
  useJobsSocket((e) => {
    const d = e.data as { id?: string; delivery_id?: string; lat?: number; lng?: number };
    if (e.type === "delivery.updated" && d.id === id) qc.invalidateQueries({ queryKey: key });
    if (e.type === "delivery.rider_location" && d.delivery_id === id && d.lat != null) setLive({ lat: Number(d.lat), lng: Number(d.lng) });
  });

  const back = (
    <Pressable onPress={() => router.replace("/deliveries" as never)} hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start" }}>
      <ArrowLeft size={16} color={colors.brand.green} /><Text variant="label" color="green">My deliveries</Text>
    </Pressable>
  );
  const d = q.data;
  if (!d) return <DeliveriesScreen title="Delivery" tabs={false} back={back}>{q.isLoading ? <Loading /> : <ErrorNote>Delivery not found.</ErrorNote>}</DeliveriesScreen>;

  const riderPos = live ?? (d.rider?.lat ? { lat: Number(d.rider.lat), lng: Number(d.rider.lng) } : null);
  const moving = ["accepted", "picked_up", "in_transit"].includes(d.status);
  const markers: MapMarker[] = [
    { id: "p", lat: Number(d.pickup_lat), lng: Number(d.pickup_lng), kind: "pickup" },
    { id: "d", lat: Number(d.dropoff_lat), lng: Number(d.dropoff_lng), kind: "dropoff" },
    ...(riderPos && moving ? [{ id: "r", lat: riderPos.lat, lng: riderPos.lng, kind: "rider" as const }] : []),
  ];

  return (
    <DeliveriesScreen title={headline(d)} subtitle={d.reference} tabs={false} back={back} right={<DeliveryStatusPill status={d.status} />}>
      <MapView markers={markers} height={250} fitKey={`${d.id}-${riderPos && moving ? "r" : ""}`} />
      {d.status !== "cancelled" ? <Card><StatusStepper status={d.status} /></Card> : null}
      {d.payment_status === "unpaid" && d.status === "pending" ? <PayNow d={d} /> : null}
      {d.status === "pending" && d.payment_status === "paid" ? <Searching d={d} /> : null}
      {d.rider && d.status !== "cancelled" ? <RiderCard d={d} /> : null}
      {moving || (d.status === "pending" && d.payment_status === "paid") ? <CodeCard d={d} /> : null}
      {d.can_rate ? <RateCard d={d} /> : null}
      {d.rating ? (
        <Card style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text variant="body">You rated {d.rider?.full_name ?? "the rider"}</Text>
          {Array.from({ length: d.rating }).map((_, i) => <Star key={i} size={15} color={colors.warn} fill={colors.warn} />)}
        </Card>
      ) : null}
      <Card style={{ gap: 10 }}>
        <Stop color={colors.brand.green} title="PICKUP" body={d.pickup_address} extra={[d.pickup_contact_name, d.pickup_contact_phone].filter(Boolean).join(" · ")} />
        <Stop color={colors.brand.red} title="DROP-OFF" body={d.dropoff_address} extra={`${d.recipient_name} · ${d.recipient_phone}`} />
        <Text variant="caption" color="muted">{d.category_label} · {Number(d.weight_kg)} kg · {d.package_description}</Text>
      </Card>
      <Card>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
          <Text variant="caption" color="muted" style={{ fontFamily: fonts.bold }}>PAYMENT</Text>
          <Text variant="caption" style={{ fontFamily: fonts.bold, textTransform: "capitalize" }}>{d.payment_method} · {d.payment_status}</Text>
        </View>
        <FeeBreakdown q={d} />
      </Card>
      {d.status === "cancelled" ? (
        <Card><Text variant="body" color="muted">Cancelled{d.cancel_reason ? ` — ${d.cancel_reason}` : ""}. {d.payment_status === "refunded" ? `${fee(d.fee, d.currency)} was returned to your wallet.` : ""}</Text></Card>
      ) : null}
      <Card>
        <Text variant="caption" color="muted" style={{ fontFamily: fonts.bold, marginBottom: 8 }}>TIMELINE</Text>
        <Timeline events={d.events} />
      </Card>
      {d.can_cancel ? <CancelButton d={d} /> : null}
    </DeliveriesScreen>
  );
}

function headline(d: Delivery) {
  switch (d.status) {
    case "pending": return d.payment_status === "unpaid" ? "Complete payment" : "Finding you a rider…";
    case "accepted": return `${d.rider?.full_name ?? "Your rider"} is on the way`;
    case "picked_up": return "Package collected";
    case "in_transit": return `On the way to ${d.recipient_name}`;
    case "delivered": return "Delivered";
    default: return "Delivery cancelled";
  }
}

function Stop({ color, title, body, extra }: { color: string; title: string; body: string; extra?: string }) {
  return (
    <View style={{ flexDirection: "row", gap: 10 }}>
      <View style={{ height: 10, width: 10, borderRadius: 5, backgroundColor: color, marginTop: 5 }} />
      <View style={{ flex: 1 }}>
        <Text variant="caption" color="muted" style={{ fontFamily: fonts.bold }}>{title}</Text>
        <Text variant="body">{body}</Text>
        {extra ? <Text variant="caption" color="muted">{extra}</Text> : null}
      </View>
    </View>
  );
}

function Searching({ d }: { d: Delivery }) {
  return (
    <Card style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <View style={{ height: 44, width: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(11,115,39,0.10)" }}>
        <Search size={20} color={colors.brand.green} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="title" style={{ fontSize: 15 }}>{d.dispatch_exhausted ? "Riders are busy right now" : "Matching nearby riders"}</Text>
        <Text variant="caption" color="muted">{d.dispatch_exhausted ? "We'll keep trying and notify you. Cancel any time for a full refund." : `Offering to the closest riders (round ${Math.max(1, d.dispatch_round)}).`}</Text>
      </View>
    </Card>
  );
}

function RiderCard({ d }: { d: Delivery }) {
  const r = d.rider!;
  return (
    <Card style={{ gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Avatar name={r.full_name} url={r.photo_url || undefined} size={48} />
        <View style={{ flex: 1 }}>
          <Text variant="title">{r.full_name}</Text>
          <Text variant="caption" color="muted">{r.vehicle_description || r.vehicle_label}{r.vehicle_plate ? ` · ${r.vehicle_plate}` : ""}</Text>
          <Text variant="caption" color="muted">★ {Number(r.rating_avg) ? Number(r.rating_avg).toFixed(1) : "New"} · {r.completed_deliveries} deliveries</Text>
        </View>
      </View>
      {d.status !== "delivered" ? (
        <View style={{ flexDirection: "row", gap: 10 }}>
          <PillButton label="Call" style={{ flex: 1 }} icon={<Phone size={15} color="#FFF" />} onPress={() => callNumber(r.phone)} />
          <PillButton label="Message" tone="outline" style={{ flex: 1 }} icon={<MessageCircle size={15} color={colors.ink} />} onPress={() => smsNumber(r.phone)} />
        </View>
      ) : null}
    </Card>
  );
}

function CodeCard({ d }: { d: Delivery }) {
  return (
    <Card style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <View style={{ flex: 1 }}>
        <Text variant="caption" color="muted" style={{ fontFamily: fonts.bold }}>DELIVERY CODE</Text>
        <Text variant="display" style={{ fontSize: 32, letterSpacing: 10 }}>{d.delivery_code}</Text>
        <Text variant="caption" color="muted">Share with {d.recipient_name}. The rider needs it at drop-off.</Text>
      </View>
      <PillButton label="Share" tone="outline" icon={<Share2 size={14} color={colors.ink} />}
        onPress={() => Share.share({ message: `Your OAM delivery code is ${d.delivery_code}. Give it to the rider when your package (${d.reference}) arrives.` }).catch(() => {})} />
    </Card>
  );
}

function PayNow({ d }: { d: Delivery }) {
  const qc = useQueryClient();
  const [url, setUrl] = useState<string | null>(null);
  const verify = useMutation({ mutationFn: () => deliveriesApi.verifyPayment(d.id), onSuccess: (x) => qc.setQueryData(["deliveries", "detail", d.id], x) });
  const retry = useMutation({ mutationFn: () => deliveriesApi.retryPayment(d.id, RETURN_URL), onSuccess: (x) => setUrl(x.payment_url || null) });
  return (
    <Card style={{ gap: 10 }}>
      <Text variant="title" style={{ fontSize: 15 }}>Payment not completed yet</Text>
      <Text variant="caption" color="muted">We start matching a rider once the {fee(d.fee, d.currency)} payment goes through.</Text>
      <ErrorNote>{verify.error || retry.error ? apiErrorMessage(verify.error || retry.error) : null}</ErrorNote>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <PillButton label="Pay now" tone="red" style={{ flex: 1 }} loading={retry.isPending} onPress={() => retry.mutate()} />
        <PillButton label="I've paid" tone="outline" style={{ flex: 1 }} icon={<RefreshCw size={14} color={colors.ink} />} loading={verify.isPending} onPress={() => verify.mutate()} />
      </View>
      <CheckoutModal url={url} onComplete={() => { setUrl(null); verify.mutate(); }} onCancel={() => { setUrl(null); verify.mutate(); }} />
    </Card>
  );
}

function RateCard({ d }: { d: Delivery }) {
  const qc = useQueryClient();
  const [stars, setStars] = useState(0);
  const [review, setReview] = useState("");
  const rate = useMutation({ mutationFn: () => deliveriesApi.rate(d.id, stars, review), onSuccess: (x) => qc.setQueryData(["deliveries", "detail", d.id], x) });
  return (
    <Card style={{ gap: 10 }}>
      <Text variant="title" style={{ fontSize: 15 }}>How was {d.rider?.full_name ?? "your rider"}?</Text>
      <View style={{ flexDirection: "row", gap: 6 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable key={n} onPress={() => setStars(n)} accessibilityLabel={`${n} star${n > 1 ? "s" : ""}`} hitSlop={4}>
            <Star size={30} color={n <= stars ? colors.warn : colors.hairline} fill={n <= stars ? colors.warn : "transparent"} />
          </Pressable>
        ))}
      </View>
      {stars ? (
        <>
          <TextBox value={review} onChangeText={setReview} placeholder="Anything to add? (optional)" maxLength={300} />
          <PillButton label="Submit rating" loading={rate.isPending} onPress={() => rate.mutate()} />
        </>
      ) : null}
    </Card>
  );
}

function CancelButton({ d }: { d: Delivery }) {
  const qc = useQueryClient();
  const cancel = useMutation({
    mutationFn: () => deliveriesApi.cancel(d.id, "Cancelled by customer"),
    onSuccess: (x) => { qc.setQueryData(["deliveries", "detail", d.id], x); qc.invalidateQueries({ queryKey: ["wallets"] }); },
    onError: (e) => Alert.alert("Couldn't cancel", apiErrorMessage(e)),
  });
  function ask() {
    const msg = d.payment_status === "paid" ? `${fee(d.fee, d.currency)} goes back to your wallet.` : "";
    if (Platform.OS === "web") {     // react-native-web's Alert has no buttons
      if (window.confirm(`Cancel ${d.reference}? ${msg}`)) cancel.mutate();
      return;
    }
    Alert.alert(`Cancel ${d.reference}?`, msg, [{ text: "Keep it", style: "cancel" }, { text: "Yes, cancel", style: "destructive", onPress: () => cancel.mutate() }]);
  }
  return <PillButton label="Cancel delivery" tone="outline" loading={cancel.isPending} icon={<XCircle size={15} color={colors.danger} />} onPress={ask} />;
}
