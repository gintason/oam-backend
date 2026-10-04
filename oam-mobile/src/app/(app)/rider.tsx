/**
 * Rider home: onboarding status → Online/Offline → incoming requests (accept /
 * decline before the timer runs out) → the current job → today's earnings.
 */
import { useEffect, useState } from "react";
import { Alert, Switch, Vibration, View } from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Bike, ChevronRight, Clock, MapPin, Navigation, ShieldAlert, Wallet as WalletIcon, XCircle } from "lucide-react-native";
import { Text } from "@/shared/ui";
import { colors, fonts } from "@/shared/theme";
import { apiErrorMessage } from "@/shared/api";
import { Reveal } from "@/shared/ui/motion";
import { useJobsSocket } from "@/features/jobs";
import {
  currentPosition, deliveryErrorCode, fee, riderApi, useRiderLocationReporter, CATEGORY_LABEL, type Offer, type RiderProfile,
} from "@/features/deliveries";
import { Card, DeliveriesScreen, EmptyState, ErrorNote, Loading, MoneyChip, PillButton } from "@/features/deliveries/ui/kit";

export default function RiderHome() {
  const router = useRouter();
  const me = useQuery({ queryKey: ["rider", "me"], queryFn: riderApi.me });
  const r = me.data;

  return (
    <DeliveriesScreen title="Ride & earn" subtitle="Deliver nearby and get paid to your OAM wallet.">
      {me.isLoading ? <Loading /> : !r ? <Intro onStart={() => router.push("/rider-apply" as never)} />
        : r.verification_status === "approved" ? <Dashboard rider={r} />
        : <ReviewStatus rider={r} onEdit={() => router.push("/rider-apply" as never)} />}
    </DeliveriesScreen>
  );
}

function Intro({ onStart }: { onStart: () => void }) {
  const perks = [
    ["Choose your hours", "Go online whenever you like — no shifts."],
    ["Get paid per delivery", "Earnings land in your OAM wallet instantly. Withdraw any time."],
    ["Jobs near you", "We only offer requests close to where you are."],
  ];
  return (
    <>
      <Reveal>
        <Card style={{ backgroundColor: colors.ink, borderColor: colors.ink, gap: 8 }}>
          <Bike size={28} color="#FFF" />
          <Text variant="heading" color="paper">Become an OAM rider</Text>
          <Text variant="body" style={{ color: "rgba(255,255,255,0.8)" }}>Bicycle, motorcycle, car or van — sign up in 3 minutes with your ID and vehicle details.</Text>
        </Card>
      </Reveal>
      {perks.map(([t, b], i) => (
        <Reveal key={t} delay={80 * (i + 1)}>
          <Card style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
            <BadgeCheck size={20} color={colors.brand.green} />
            <View style={{ flex: 1 }}><Text variant="title" style={{ fontSize: 15 }}>{t}</Text><Text variant="caption" color="muted">{b}</Text></View>
          </Card>
        </Reveal>
      ))}
      <PillButton label="Start rider sign-up" tone="red" style={{ height: 50 }} onPress={onStart} />
    </>
  );
}

function ReviewStatus({ rider, onEdit }: { rider: RiderProfile; onEdit: () => void }) {
  const v = rider.verification_status;
  const copy = {
    pending: ["Application under review", "We're checking your documents. You'll get a notification as soon as you're approved — usually within a day."],
    rejected: ["Application not approved", rider.review_note || "Please check your documents and apply again."],
    suspended: ["Account suspended", rider.review_note || "Contact OAM support for details."],
  }[v as "pending" | "rejected" | "suspended"];
  return (
    <>
      <Card style={{ gap: 8, borderColor: v === "pending" ? "rgba(180,83,9,0.3)" : "rgba(159,18,57,0.25)" }}>
        {v === "pending" ? <Clock size={24} color={colors.warn} /> : <ShieldAlert size={24} color={colors.danger} />}
        <Text variant="title">{copy[0]}</Text>
        <Text variant="body" color="muted">{copy[1]}</Text>
      </Card>
      <Card style={{ gap: 4 }}>
        <Text variant="label">{rider.full_name}</Text>
        <Text variant="caption" color="muted">{rider.vehicle_label}{rider.vehicle_plate ? ` · ${rider.vehicle_plate}` : ""} · {rider.documents.length} document{rider.documents.length === 1 ? "" : "s"}</Text>
      </Card>
      {v !== "suspended" ? <PillButton label={v === "rejected" ? "Update & re-apply" : "Edit application"} tone="outline" onPress={onEdit} /> : null}
    </>
  );
}

function Dashboard({ rider }: { rider: RiderProfile }) {
  const router = useRouter();
  const qc = useQueryClient();
  const online = rider.availability === "online";
  const [toggleErr, setToggleErr] = useState<string | null>(null);

  useRiderLocationReporter(online);

  const active = useQuery({ queryKey: ["rider", "active"], queryFn: riderApi.active, refetchInterval: 15000 });
  const offers = useQuery({
    queryKey: ["rider", "offers"], queryFn: riderApi.offers, enabled: online && !active.data,
    refetchInterval: online && !active.data ? 5000 : false,
  });
  const earnings = useQuery({ queryKey: ["rider", "earnings"], queryFn: riderApi.earnings });

  useJobsSocket((e) => {
    if (e.type === "delivery.offer") { Vibration.vibrate([0, 300, 150, 300]); qc.invalidateQueries({ queryKey: ["rider", "offers"] }); }
    if (e.type === "delivery.offer_withdrawn") qc.invalidateQueries({ queryKey: ["rider", "offers"] });
    if (e.type === "delivery.updated") { qc.invalidateQueries({ queryKey: ["rider", "active"] }); qc.invalidateQueries({ queryKey: ["rider", "earnings"] }); }
    if (e.type === "rider.updated") qc.invalidateQueries({ queryKey: ["rider", "me"] });
  });

  const toggle = useMutation({
    mutationFn: async (next: boolean) => {
      if (!next) return riderApi.setAvailability(false);
      const pos = await currentPosition();
      return riderApi.setAvailability(true, pos);
    },
    onMutate: () => setToggleErr(null),
    onSuccess: (r) => { qc.setQueryData(["rider", "me"], (old: RiderProfile | undefined) => ({ ...(old ?? r), ...r })); qc.invalidateQueries({ queryKey: ["rider", "offers"] }); },
    onError: (e) => setToggleErr(e instanceof Error && !("response" in e) ? e.message : apiErrorMessage(e, "Couldn't change your status.")),
  });

  return (
    <>
      <Card style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: online ? colors.brand.green : colors.paper, borderColor: online ? colors.brand.green : colors.hairline }}>
        <View style={{ height: 12, width: 12, borderRadius: 6, backgroundColor: online ? "#7CFC9A" : colors.muted }} />
        <View style={{ flex: 1 }}>
          <Text variant="title" color={online ? "paper" : "ink"}>{online ? "You're online" : "You're offline"}</Text>
          <Text variant="caption" style={{ color: online ? "rgba(255,255,255,0.85)" : colors.muted }}>
            {online ? "Requests near you will pop up here." : "Go online to start receiving delivery requests."}
          </Text>
        </View>
        <Switch value={online} disabled={toggle.isPending} onValueChange={(v) => toggle.mutate(v)} accessibilityLabel="Online"
          trackColor={{ true: "#5BD47A", false: colors.hairline }} thumbColor="#FFF" />
      </Card>
      <ErrorNote>{toggleErr}</ErrorNote>

      {active.data ? (
        <Card onPress={() => router.push({ pathname: "/rider-job", params: { id: active.data!.id } } as never)} style={{ gap: 8, borderColor: colors.brand.green, borderWidth: 2 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text variant="title">Current delivery · {active.data.status_label}</Text>
            <ChevronRight size={18} color={colors.muted} />
          </View>
          <Text variant="caption" color="muted" numberOfLines={1}>{active.data.status === "accepted" ? `Pickup: ${active.data.pickup_address}` : `Drop-off: ${active.data.dropoff_address}`}</Text>
          <PillButton label="Open job" icon={<Navigation size={15} color="#FFF" />} onPress={() => router.push({ pathname: "/rider-job", params: { id: active.data!.id } } as never)} />
        </Card>
      ) : online ? (
        offers.data?.length ? offers.data.map((o) => <OfferCard key={o.id} offer={o} />) : (
          <EmptyState icon={<Bike size={22} color={colors.muted} />} title="Waiting for requests" body="Stay on this screen with location on. New requests appear here and on your notifications." />
        )
      ) : null}

      <Card onPress={() => router.push("/rider-earnings" as never)} style={{ gap: 10 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text variant="title" style={{ fontSize: 15 }}>Today</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Text variant="label" color="green">Earnings</Text><ChevronRight size={16} color={colors.brand.green} />
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Stat label="Earned" value={fee(earnings.data?.today ?? 0)} />
          <Stat label="Trips" value={String(earnings.data?.today_count ?? 0)} />
          <Stat label="Rating" value={Number(rider.rating_avg) ? `★ ${Number(rider.rating_avg).toFixed(1)}` : "New"} />
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <WalletIcon size={14} color={colors.muted} />
          <Text variant="caption" color="muted">Wallet balance {fee(earnings.data?.wallet_balance ?? 0)}</Text>
        </View>
      </Card>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.mist, borderRadius: 12, padding: 10 }}>
      <Text variant="caption" color="muted">{label}</Text>
      <Text variant="title" style={{ fontSize: 16 }}>{value}</Text>
    </View>
  );
}

function OfferCard({ offer }: { offer: Offer }) {
  const router = useRouter();
  const qc = useQueryClient();
  const d = offer.delivery;
  const [left, setLeft] = useState(() => Math.max(0, Math.round((new Date(offer.expires_at).getTime() - Date.now()) / 1000)));
  useEffect(() => {
    const id = setInterval(() => setLeft(Math.max(0, Math.round((new Date(offer.expires_at).getTime() - Date.now()) / 1000))), 1000);
    return () => clearInterval(id);
  }, [offer.expires_at]);

  const accept = useMutation({
    mutationFn: () => riderApi.accept(offer.id),
    onSuccess: (job) => {
      qc.setQueryData(["rider", "active"], job);
      qc.invalidateQueries({ queryKey: ["rider", "offers"] });
      router.push({ pathname: "/rider-job", params: { id: job.id } } as never);
    },
    onError: (e) => {
      qc.invalidateQueries({ queryKey: ["rider", "offers"] });
      const code = deliveryErrorCode(e);
      Alert.alert(code === "taken" || code === "offer_gone" ? "Too late" : "Couldn't accept", apiErrorMessage(e));
    },
  });
  const reject = useMutation({ mutationFn: () => riderApi.reject(offer.id), onSettled: () => qc.invalidateQueries({ queryKey: ["rider", "offers"] }) });
  if (left <= 0) return null;

  return (
    <Reveal>
      <Card style={{ gap: 12, borderColor: colors.brand.green, borderWidth: 2 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text variant="title">New delivery request</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: left <= 10 ? "rgba(159,18,57,0.08)" : colors.mist, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
            <Clock size={12} color={left <= 10 ? colors.danger : colors.muted} />
            <Text variant="caption" style={{ fontFamily: fonts.bold, color: left <= 10 ? colors.danger : colors.ink }}>{left}s</Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <MoneyChip amount={d.rider_payout} currency={d.currency} tone="dark" />
          <Text variant="caption" color="muted">{Number(offer.distance_km).toFixed(1)} km to pickup · {Number(d.distance_km).toFixed(1)} km trip</Text>
        </View>
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: "row", gap: 8 }}><MapPin size={15} color={colors.brand.green} /><Text variant="body" style={{ flex: 1 }} numberOfLines={2}>{d.pickup_address}</Text></View>
          <View style={{ flexDirection: "row", gap: 8 }}><MapPin size={15} color={colors.brand.red} /><Text variant="body" style={{ flex: 1 }} numberOfLines={2}>{d.dropoff_address}</Text></View>
          <Text variant="caption" color="muted">{CATEGORY_LABEL[d.package_category]} · {Number(d.weight_kg)} kg · {d.package_description}</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <PillButton label="Decline" tone="outline" icon={<XCircle size={15} color={colors.ink} />} style={{ flex: 1 }} loading={reject.isPending} disabled={accept.isPending} onPress={() => reject.mutate()} />
          <PillButton label="Accept" style={{ flex: 1.4 }} loading={accept.isPending} disabled={reject.isPending} onPress={() => accept.mutate()} />
        </View>
      </Card>
    </Reveal>
  );
}

