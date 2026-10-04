/**
 * Send a package: route (search / GPS / tap the map) → package & recipient →
 * fee breakdown + pay (wallet hold, or Flutterwave card in a WebView).
 */
import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Box, CreditCard, FileText, Package, PackageOpen, Utensils, Wallet as WalletIcon, Wine, type LucideIcon } from "lucide-react-native";
import { Text } from "@/shared/ui";
import { colors, fonts } from "@/shared/theme";
import { apiErrorMessage } from "@/shared/api";
import { useAuthStore } from "@/features/auth";
import { useWallets } from "@/features/wallet";
import {
  deliveriesApi, deliveryErrorCode, fee, MapView, reverseGeocode,
  type MapMarker, type PackageCategory, type PaymentMethod, type Place,
} from "@/features/deliveries";
import {
  Card, CheckoutModal, DeliveriesScreen, ErrorNote, FeeBreakdown, Field, LocationField, PillButton, TextBox,
} from "@/features/deliveries/ui/kit";

const CATS: { value: PackageCategory; label: string; hint: string; Icon: LucideIcon }[] = [
  { value: "documents", label: "Documents", hint: "Envelopes", Icon: FileText },
  { value: "small", label: "Small", hint: "Fits a bag", Icon: Package },
  { value: "medium", label: "Medium", hint: "Carton", Icon: Box },
  { value: "large", label: "Large", hint: "Car/van", Icon: PackageOpen },
  { value: "food", label: "Food", hint: "Upright", Icon: Utensils },
  { value: "fragile", label: "Fragile", hint: "Careful", Icon: Wine },
];
const PHONE = /^\+?[0-9 ()-]{7,20}$/;
const RETURN_URL = "https://oam-app.com/deliveries/payment-return";
type Step = "route" | "details" | "review";

export default function DeliveryNew() {
  const router = useRouter();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [step, setStep] = useState<Step>("route");
  const [pickup, setPickup] = useState<Place | null>(null);
  const [dropoff, setDropoff] = useState<Place | null>(null);
  const [activePin, setActivePin] = useState<"pickup" | "dropoff">("pickup");
  const [category, setCategory] = useState<PackageCategory>("small");
  const [weight, setWeight] = useState("1");
  const [form, setForm] = useState(() => ({
    package_description: "", recipient_name: "", recipient_phone: "", dropoff_note: "",
    pickup_contact_name: [user?.first_name, user?.last_name].filter(Boolean).join(" "),
    pickup_contact_phone: (user as { phone?: string } | null)?.phone ?? "", pickup_note: "",
  }));
  const [method, setMethod] = useState<PaymentMethod>("wallet");
  const [error, setError] = useState<string | null>(null);
  const [checkout, setCheckout] = useState<{ url: string; id: string } | null>(null);

  const wallets = useWallets();
  const ngn = Number(wallets.data?.wallets.find((w) => w.currency === "NGN")?.balance ?? 0);

  const input = useMemo(() => pickup && dropoff ? {
    pickup_lat: pickup.lat, pickup_lng: pickup.lng, dropoff_lat: dropoff.lat, dropoff_lng: dropoff.lng,
    weight_kg: Number(weight) || 0, package_category: category,
  } : null, [pickup, dropoff, weight, category]);

  const quote = useQuery({
    queryKey: ["deliveries", "quote", input],
    queryFn: () => deliveriesApi.quote(input!),
    enabled: Boolean(input), retry: false, staleTime: 30_000,
  });

  const create = useMutation({
    mutationFn: () => deliveriesApi.create({
      ...input!, pickup_address: pickup!.address, dropoff_address: dropoff!.address, ...form,
      payment_method: method, expected_fee: quote.data?.fee, return_url: method === "card" ? RETURN_URL : undefined,
    }),
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["wallets"] });
      qc.invalidateQueries({ queryKey: ["deliveries"] });
      if (d.payment_method === "card" && d.payment_status === "unpaid" && d.payment_url) {
        setCheckout({ url: d.payment_url, id: d.id });
        return;
      }
      router.replace({ pathname: "/delivery", params: { id: d.id } } as never);
    },
    onError: (e) => {
      if (deliveryErrorCode(e) === "price_changed") qc.invalidateQueries({ queryKey: ["deliveries", "quote"] });
      setError(apiErrorMessage(e, "Couldn't place the delivery."));
    },
  });

  async function afterCard() {
    const id = checkout?.id;
    setCheckout(null);
    if (!id) return;
    try { await deliveriesApi.verifyPayment(id); } catch { /* tracking screen retries */ }
    router.replace({ pathname: "/delivery", params: { id } } as never);
  }

  function pick(lat: number, lng: number) {
    const place = { lat, lng, address: `${lat.toFixed(5)}, ${lng.toFixed(5)}` };
    const set = activePin === "pickup" ? setPickup : setDropoff;
    set(place);
    reverseGeocode(lat, lng).then((address) => set((cur) => (cur && cur.lat === lat && cur.lng === lng ? { ...cur, address } : cur)));
    if (activePin === "pickup" && !dropoff) setActivePin("dropoff");
  }

  const markers: MapMarker[] = [
    ...(pickup ? [{ id: "p", lat: pickup.lat, lng: pickup.lng, kind: "pickup" as const }] : []),
    ...(dropoff ? [{ id: "d", lat: dropoff.lat, lng: dropoff.lng, kind: "dropoff" as const }] : []),
  ];
  const detailsOk = form.package_description.trim().length >= 3 && form.recipient_name.trim().length >= 2
    && PHONE.test(form.recipient_phone.trim()) && Number(weight) >= 0 && Number(weight) <= 200;
  const short = method === "wallet" && Number(quote.data?.fee ?? 0) > ngn;
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <DeliveriesScreen title="Send a package" subtitle="A nearby rider picks it up in minutes.">
      <StepBar step={step} onBack={(s) => setStep(s)} />

      {step === "route" ? (
        <>
          <LocationField label="Pickup" kind="pickup" value={pickup} onChange={setPickup} active={activePin === "pickup"} onFocus={() => setActivePin("pickup")} />
          <LocationField label="Drop-off" kind="dropoff" value={dropoff} onChange={setDropoff} near={pickup ?? undefined} active={activePin === "dropoff"} onFocus={() => setActivePin("dropoff")} />
          <MapView markers={markers} onPick={pick} height={260} />
          {quote.isError ? <ErrorNote>{apiErrorMessage(quote.error, "We can't deliver on this route.")}</ErrorNote> : null}
          {quote.data ? (
            <Card style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12 }}>
              <Text variant="caption" color="muted">{Number(quote.data.distance_km).toFixed(1)} km · ≈ {quote.data.duration_min} min</Text>
              <Text variant="title">from {fee(quote.data.fee)}</Text>
            </Card>
          ) : null}
          <PillButton label="Continue" icon={<ArrowRight size={16} color="#FFF" />} onPress={() => setStep("details")} disabled={!quote.data} />
        </>
      ) : null}

      {step === "details" ? (
        <>
          <Text variant="label">What are you sending?</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {CATS.map((c) => {
              const on = category === c.value;
              return (
                <Pressable key={c.value} onPress={() => setCategory(c.value)} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={c.label}
                  style={{ width: "31.5%", alignItems: "center", paddingVertical: 10, borderRadius: 14, borderWidth: on ? 2 : 1,
                           borderColor: on ? colors.brand.green : colors.hairline, backgroundColor: on ? "rgba(11,115,39,0.05)" : colors.paper }}>
                  <c.Icon size={20} color={on ? colors.brand.green : colors.muted} strokeWidth={1.75} />
                  <Text variant="label" style={{ marginTop: 4 }}>{c.label}</Text>
                  <Text variant="caption" color="muted" style={{ fontSize: 10.5 }}>{c.hint}</Text>
                </Pressable>
              );
            })}
          </View>
          <Field label="Description"><TextBox value={form.package_description} onChangeText={set("package_description")} placeholder="e.g. Blue envelope with documents" maxLength={255} /></Field>
          <Field label="Weight (kg)"><TextBox value={weight} onChangeText={setWeight} keyboardType="decimal-pad" /></Field>
          <Text variant="title" style={{ marginTop: 6 }}>Recipient</Text>
          <Field label="Name"><TextBox value={form.recipient_name} onChangeText={set("recipient_name")} placeholder="Who receives it?" /></Field>
          <Field label="Phone"><TextBox value={form.recipient_phone} onChangeText={set("recipient_phone")} placeholder="0803 123 4567" keyboardType="phone-pad" /></Field>
          <Field label="Note for the rider (optional)"><TextBox value={form.dropoff_note} onChangeText={set("dropoff_note")} placeholder="Gate code, landmark, floor…" /></Field>
          <Text variant="title" style={{ marginTop: 6 }}>Pickup contact</Text>
          <Field label="Name"><TextBox value={form.pickup_contact_name} onChangeText={set("pickup_contact_name")} /></Field>
          <Field label="Phone"><TextBox value={form.pickup_contact_phone} onChangeText={set("pickup_contact_phone")} keyboardType="phone-pad" /></Field>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <PillButton label="Back" tone="outline" onPress={() => setStep("route")} />
            <PillButton label="Review price" style={{ flex: 1 }} icon={<ArrowRight size={16} color="#FFF" />} onPress={() => setStep("review")} disabled={!detailsOk || !quote.data} />
          </View>
        </>
      ) : null}

      {step === "review" && quote.data ? (
        <>
          <Card>
            <Text variant="caption" color="muted" style={{ fontFamily: fonts.bold, letterSpacing: 0.5, marginBottom: 6 }}>FEE BREAKDOWN</Text>
            <FeeBreakdown q={quote.data} />
          </Card>
          <Card style={{ gap: 6 }}>
            <Text variant="caption" color="muted" style={{ fontFamily: fonts.bold, letterSpacing: 0.5 }}>PICKUP → DROP-OFF</Text>
            <Text variant="body">{pickup?.address}</Text>
            <Text variant="body">{dropoff?.address}</Text>
            <Text variant="caption" color="muted">To {form.recipient_name} · {form.recipient_phone}</Text>
          </Card>
          <Text variant="label">Pay with</Text>
          <PayOption on={method === "wallet"} onPress={() => setMethod("wallet")} Icon={WalletIcon} title="OAM wallet"
            sub={wallets.isLoading ? "Checking balance…" : `Balance ${fee(ngn)}`} warn={short ? "Low balance" : undefined} />
          <PayOption on={method === "card"} onPress={() => setMethod("card")} Icon={CreditCard} title="Card, bank or USSD" sub="Secure checkout by Flutterwave" />
          {short ? <Text variant="caption" color="muted">Top up your wallet, or pay by card.</Text> : null}
          <ErrorNote>{error}</ErrorNote>
          <PillButton tone="red" style={{ height: 50 }} loading={create.isPending} disabled={short || quote.isFetching}
            label={method === "card" ? `Pay ${fee(quote.data.fee)} & request rider` : `Confirm & pay ${fee(quote.data.fee)}`}
            onPress={() => { setError(null); create.mutate(); }} />
          <PillButton label="Back" tone="outline" onPress={() => { setError(null); setStep("details"); }} />
          <Text variant="caption" color="muted" style={{ textAlign: "center" }}>Cancel before pickup for a full refund to your wallet.</Text>
        </>
      ) : null}

      <CheckoutModal url={checkout?.url ?? null} onComplete={afterCard} onCancel={afterCard} />
    </DeliveriesScreen>
  );
}

function StepBar({ step, onBack }: { step: Step; onBack: (s: Step) => void }) {
  const steps: { key: Step; label: string }[] = [{ key: "route", label: "Route" }, { key: "details", label: "Details" }, { key: "review", label: "Pay" }];
  const at = steps.findIndex((s) => s.key === step);
  return (
    <View style={{ flexDirection: "row", gap: 6 }}>
      {steps.map((s, i) => (
        <Pressable key={s.key} disabled={i >= at} onPress={() => onBack(s.key)}
          style={{ flex: 1, height: 30, borderRadius: 999, alignItems: "center", justifyContent: "center",
                   backgroundColor: i === at ? colors.ink : i < at ? "rgba(11,115,39,0.10)" : colors.paper, borderWidth: i > at ? 1 : 0, borderColor: colors.hairline }}>
          <Text variant="caption" style={{ fontFamily: fonts.bold, color: i === at ? "#FFF" : i < at ? colors.brand.green : colors.muted }}>{i + 1}. {s.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function PayOption({ on, onPress, Icon, title, sub, warn }: { on: boolean; onPress: () => void; Icon: LucideIcon; title: string; sub: string; warn?: string }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={title}
      style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 14, borderWidth: on ? 2 : 1,
               borderColor: on ? colors.brand.green : colors.hairline, backgroundColor: on ? "rgba(11,115,39,0.05)" : colors.paper }}>
      <View style={{ height: 38, width: 38, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: on ? colors.brand.green : colors.mist }}>
        <Icon size={18} color={on ? "#FFF" : colors.muted} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="title" style={{ fontSize: 15 }}>{title}</Text>
        <Text variant="caption" color="muted">{sub}</Text>
      </View>
      {warn ? <Text variant="caption" color="warn" style={{ fontFamily: fonts.bold }}>{warn}</Text> : null}
    </Pressable>
  );
}
