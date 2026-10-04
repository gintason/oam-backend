/**
 * Rider job: navigate to pickup → confirm pickup → start → navigate to drop-off
 * → complete with the recipient's 4-digit code (or a handover photo).
 */
import { useState } from "react";
import { ActivityIndicator, Alert, Image, Platform, Pressable, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { ArrowLeft, Camera, CheckCircle2, MessageCircle, Navigation, Package, Phone, Undo2 } from "lucide-react-native";
import { Text } from "@/shared/ui";
import { colors, fonts } from "@/shared/theme";
import { apiErrorMessage } from "@/shared/api";
import { useJobsSocket } from "@/features/jobs";
import {
  callNumber, deliveryErrorCode, fee, MapView, openDirections, riderApi, smsNumber, uploadDeliveriesFile,
  useRiderLocationReporter, type MapMarker, type RiderDelivery,
} from "@/features/deliveries";
import { Card, DeliveriesScreen, DeliveryStatusPill, ErrorNote, Loading, PillButton, StatusStepper } from "@/features/deliveries/ui/kit";

export default function RiderJob() {
  const { id = "" } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const key = ["rider", "job", id];
  const [me, setMe] = useState<{ lat: number; lng: number } | null>(null);
  const q = useQuery({ queryKey: key, queryFn: () => riderApi.delivery(id), enabled: Boolean(id), refetchInterval: 10000 });
  const d = q.data;
  const live = Boolean(d && ["accepted", "picked_up", "in_transit"].includes(d.status));
  useRiderLocationReporter(live, setMe);
  useJobsSocket((e) => { if (e.type === "delivery.updated" && (e.data as { id?: string }).id === id) qc.invalidateQueries({ queryKey: key }); });

  const done = (job: RiderDelivery) => {
    qc.setQueryData(key, job);
    qc.invalidateQueries({ queryKey: ["rider"] });
  };

  const back = (
    <Pressable onPress={() => router.replace("/rider" as never)} hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start" }}>
      <ArrowLeft size={16} color={colors.brand.green} /><Text variant="label" color="green">Rider home</Text>
    </Pressable>
  );
  if (!d) return <DeliveriesScreen title="Delivery" tabs={false} back={back}>{q.isLoading ? <Loading /> : <ErrorNote>Delivery not found.</ErrorNote>}</DeliveriesScreen>;

  const toPickup = d.status === "accepted";
  const markers: MapMarker[] = [
    { id: "p", lat: Number(d.pickup_lat), lng: Number(d.pickup_lng), kind: "pickup" },
    { id: "d", lat: Number(d.dropoff_lat), lng: Number(d.dropoff_lng), kind: "dropoff" },
    ...(me ? [{ id: "me", lat: me.lat, lng: me.lng, kind: "me" as const }] : []),
  ];
  const stop = toPickup
    ? { title: "Pick up from", address: d.pickup_address, name: d.pickup_contact_name || d.customer_name, phone: d.pickup_contact_phone || d.customer_phone, note: d.pickup_note, lat: d.pickup_lat, lng: d.pickup_lng }
    : { title: "Deliver to", address: d.dropoff_address, name: d.recipient_name, phone: d.recipient_phone, note: d.dropoff_note, lat: d.dropoff_lat, lng: d.dropoff_lng };

  return (
    <DeliveriesScreen title={d.reference} subtitle={`You earn ${fee(d.rider_payout, d.currency)} · ${Number(d.distance_km).toFixed(1)} km`} tabs={false} back={back} right={<DeliveryStatusPill status={d.status} />}>
      <MapView markers={markers} height={230} fitKey={`${d.id}-${d.status}-${me ? 1 : 0}`} />
      {d.status !== "cancelled" ? <Card><StatusStepper status={d.status} /></Card> : null}

      {live ? (
        <Card style={{ gap: 10 }}>
          <Text variant="caption" color="muted" style={{ fontFamily: fonts.bold }}>{stop.title.toUpperCase()}</Text>
          <Text variant="title">{stop.address}</Text>
          {stop.note ? <Text variant="caption" color="muted">Note: {stop.note}</Text> : null}
          <Text variant="body">{stop.name}{stop.phone ? ` · ${stop.phone}` : ""}</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <PillButton label="Navigate" tone="dark" style={{ flex: 1.3 }} icon={<Navigation size={15} color="#FFF" />} onPress={() => openDirections(stop.lat, stop.lng, stop.address)} />
            <PillButton label="Call" style={{ flex: 1 }} icon={<Phone size={15} color="#FFF" />} onPress={() => callNumber(stop.phone)} disabled={!stop.phone} />
            <PillButton label="SMS" tone="outline" style={{ flex: 0.8 }} icon={<MessageCircle size={15} color={colors.ink} />} onPress={() => smsNumber(stop.phone, `Hi, I'm your OAM rider for ${d.reference}.`)} disabled={!stop.phone} />
          </View>
        </Card>
      ) : null}

      <Card style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
        <Package size={20} color={colors.muted} />
        <View style={{ flex: 1 }}>
          <Text variant="label">{d.category_label} · {Number(d.weight_kg)} kg</Text>
          <Text variant="caption" color="muted">{d.package_description}</Text>
        </View>
      </Card>

      {d.status === "accepted" ? <PickupStep d={d} me={me} onDone={done} /> : null}
      {d.status === "picked_up" ? <StartStep d={d} me={me} onDone={done} /> : null}
      {d.status === "in_transit" ? <DeliverStep d={d} me={me} onDone={done} /> : null}
      {d.status === "delivered" ? (
        <Card style={{ alignItems: "center", gap: 8, paddingVertical: 24 }}>
          <CheckCircle2 size={40} color={colors.brand.green} />
          <Text variant="heading">Delivered!</Text>
          <Text variant="body" color="muted">{fee(d.rider_payout, d.currency)} has been added to your wallet.</Text>
          <PillButton label="Back to requests" style={{ alignSelf: "stretch", marginTop: 8 }} onPress={() => router.replace("/rider" as never)} />
        </Card>
      ) : null}
      {d.status === "cancelled" ? <Card><Text variant="body" color="muted">This delivery was cancelled. You're free for new requests.</Text></Card> : null}
    </DeliveriesScreen>
  );
}

type StepProps = { d: RiderDelivery; me: { lat: number; lng: number } | null; onDone: (job: RiderDelivery) => void };

function PickupStep({ d, me, onDone }: StepProps) {
  const router = useRouter();
  const pickup = useMutation({ mutationFn: () => riderApi.act(d.id, "pickup", me ?? {}), onSuccess: onDone, onError: (e) => Alert.alert("Couldn't confirm", apiErrorMessage(e)) });
  const release = useMutation({
    mutationFn: () => riderApi.act(d.id, "release", { reason: "Rider unavailable" }),
    onSuccess: () => router.replace("/rider" as never),
    onError: (e) => Alert.alert("Couldn't hand back", apiErrorMessage(e)),
  });
  function askRelease() {
    const go = () => release.mutate();
    if (Platform.OS === "web") { if (window.confirm("Hand this delivery back? It goes to another rider.")) go(); return; }
    Alert.alert("Can't make it?", "The delivery goes back to the pool for another rider. Frequent hand-backs affect your rating.", [
      { text: "Keep it", style: "cancel" }, { text: "Hand back", style: "destructive", onPress: go }]);
  }
  return (
    <>
      <PillButton label="I've picked up the package" style={{ height: 52 }} loading={pickup.isPending} onPress={() => pickup.mutate()} />
      <PillButton label="Can't make it" tone="outline" icon={<Undo2 size={15} color={colors.ink} />} loading={release.isPending} onPress={askRelease} />
    </>
  );
}

function StartStep({ d, me, onDone }: StepProps) {
  const start = useMutation({ mutationFn: () => riderApi.act(d.id, "start", me ?? {}), onSuccess: onDone, onError: (e) => Alert.alert("Couldn't start", apiErrorMessage(e)) });
  return <PillButton label="Start delivery to recipient" style={{ height: 52 }} loading={start.isPending} onPress={() => start.mutate()} />;
}

function DeliverStep({ d, me, onDone }: StepProps) {
  const [code, setCode] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [usePhoto, setUsePhoto] = useState(false);
  const deliver = useMutation({
    mutationFn: () => riderApi.act(d.id, "deliver", { ...(me ?? {}), ...(usePhoto ? { photo_url: photo ?? "" } : { code }) }),
    onSuccess: onDone,
    onError: (e) => {
      const c = deliveryErrorCode(e);
      if (c === "code_locked") setUsePhoto(true);
      setErr(apiErrorMessage(e, "Couldn't complete the delivery."));
    },
  });

  async function takePhoto() {
    setErr(null);
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    const r = perm.granted
      ? await ImagePicker.launchCameraAsync({ quality: 0.7 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7 });
    if (r.canceled || !r.assets?.length) return;
    const a = r.assets[0];
    setUploading(true);
    try {
      setPhoto(await uploadDeliveriesFile("delivery_proof", { uri: a.uri, fileName: a.fileName ?? `proof_${Date.now()}.jpg`, mimeType: a.mimeType ?? "image/jpeg" }));
    } catch (e) { setErr((e as Error).message); } finally { setUploading(false); }
  }

  return (
    <Card style={{ gap: 12 }}>
      <Text variant="title">Complete delivery</Text>
      {!usePhoto ? (
        <>
          <Text variant="caption" color="muted">Ask {d.recipient_name} for the 4-digit delivery code.</Text>
          <TextInput
            value={code} onChangeText={(t) => { setErr(null); setCode(t.replace(/\D/g, "").slice(0, 4)); }}
            keyboardType="number-pad" maxLength={4} placeholder="• • • •" placeholderTextColor={colors.muted} accessibilityLabel="Delivery code"
            style={{ height: 64, borderRadius: 14, borderWidth: 2, borderColor: err ? colors.danger : colors.hairline, backgroundColor: colors.mist,
                     textAlign: "center", fontFamily: fonts.bold, fontSize: 30, letterSpacing: 16, color: colors.ink }}
          />
          <ErrorNote>{err}</ErrorNote>
          <PillButton label="Confirm delivery" style={{ height: 50 }} disabled={code.length !== 4} loading={deliver.isPending} onPress={() => deliver.mutate()} />
          <Pressable onPress={() => { setErr(null); setUsePhoto(true); }} hitSlop={6}>
            <Text variant="label" color="green" style={{ textAlign: "center" }}>Recipient doesn't have the code? Use a photo</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text variant="caption" color="muted">Take a clear photo of the package being handed over at the drop-off.</Text>
          <Pressable onPress={takePhoto} style={{ height: 160, borderRadius: 14, borderWidth: 1, borderStyle: "dashed", borderColor: colors.hairline, backgroundColor: colors.mist, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
            {uploading ? <ActivityIndicator color={colors.brand.green} /> : photo ? <Image source={{ uri: photo }} style={{ width: "100%", height: "100%" }} /> : (
              <View style={{ alignItems: "center", gap: 6 }}><Camera size={26} color={colors.muted} /><Text variant="caption" color="muted">Tap to take photo</Text></View>
            )}
          </Pressable>
          <ErrorNote>{err}</ErrorNote>
          <PillButton label="Complete with photo" style={{ height: 50 }} disabled={!photo || uploading} loading={deliver.isPending} onPress={() => deliver.mutate()} />
          <Pressable onPress={() => { setErr(null); setUsePhoto(false); }} hitSlop={6}>
            <Text variant="label" color="green" style={{ textAlign: "center" }}>Use the delivery code instead</Text>
          </Pressable>
        </>
      )}
    </Card>
  );
}
