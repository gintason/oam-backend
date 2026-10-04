/**
 * Delivery building blocks. Generic pieces (Card, PillButton, Field, TextBox…)
 * come from the jobs kit so every section of the app looks the same.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, TextInput, View } from "react-native";
import { usePathname, useRouter } from "expo-router";
import { WebView } from "react-native-webview";
import { Check, Crosshair, Lock, MapPin, Search, X } from "lucide-react-native";
import { Screen, Text } from "@/shared/ui";
import { colors, fonts } from "@/shared/theme";
import { BackToDashboard } from "@/features/jobs/ui/kit";
import { fee as money, STATUS_LABEL, STATUS_STEPS, type DeliveryStatus, type Place, type TimelineEvent } from "../api";
import { currentPosition, reverseGeocode, searchPlaces, type Hit } from "../location";

export {
  Card, PillButton, Field, TextBox, Chip, Loading, EmptyState, ErrorNote, Avatar, ToggleRow, useActionSheet,
} from "@/features/jobs/ui/kit";

/* ------------------------------------------------------------------ */
/* Screen scaffold                                                     */
/* ------------------------------------------------------------------ */

const SECTIONS = [
  { href: "/delivery-new", label: "Send a package" },
  { href: "/deliveries", label: "My deliveries" },
  { href: "/rider", label: "Ride & earn" },
];

export function DeliveriesScreen({
  title, subtitle, tabs = true, right, children, scroll = true, footer, back,
}: {
  title: string; subtitle?: string; tabs?: boolean; right?: ReactNode; children: ReactNode;
  scroll?: boolean; footer?: ReactNode; back?: ReactNode;
}) {
  const router = useRouter();
  const path = usePathname();
  return (
    <Screen edges={["top"]}>
      <View style={{ paddingTop: 16, paddingBottom: 12, gap: 12, borderBottomWidth: tabs ? 1 : 0, borderBottomColor: colors.hairline }}>
        <View style={{ paddingHorizontal: 20, gap: 10 }}>
          {back ?? <BackToDashboard />}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text variant="heading">{title}</Text>
              {subtitle ? <Text variant="caption" color="muted" style={{ marginTop: 2 }}>{subtitle}</Text> : null}
            </View>
            {right}
          </View>
        </View>
        {tabs ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}>
            {SECTIONS.map((s) => {
              const active = path === s.href;
              return (
                <Pressable key={s.href} onPress={() => !active && router.push(s.href as never)}
                  style={{ height: 34, paddingHorizontal: 14, borderRadius: 999, justifyContent: "center",
                           backgroundColor: active ? colors.ink : colors.paper, borderWidth: 1, borderColor: active ? colors.ink : colors.hairline }}>
                  <Text variant="label" color={active ? "paper" : "ink"} style={{ fontSize: 13 }}>{s.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}
      </View>
      {scroll ? (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48, gap: 14 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : <View style={{ flex: 1 }}>{children}</View>}
      {footer}
    </Screen>
  );
}

/* ------------------------------------------------------------------ */
/* Status                                                              */
/* ------------------------------------------------------------------ */

const TONE: Record<DeliveryStatus, { bg: string; fg: string }> = {
  pending: { bg: "rgba(180,83,9,0.10)", fg: colors.warn },
  accepted: { bg: "rgba(11,115,39,0.10)", fg: colors.brand.green },
  picked_up: { bg: "rgba(11,115,39,0.10)", fg: colors.brand.green },
  in_transit: { bg: "rgba(11,115,39,0.16)", fg: colors.brand.green },
  delivered: { bg: colors.brand.green, fg: "#FFFFFF" },
  cancelled: { bg: colors.mist, fg: colors.muted },
};

export function DeliveryStatusPill({ status }: { status: DeliveryStatus }) {
  const t = TONE[status];
  return (
    <View style={{ paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999, backgroundColor: t.bg, alignSelf: "flex-start" }}>
      <Text variant="caption" style={{ color: t.fg, fontFamily: fonts.bold, fontSize: 11.5 }}>{STATUS_LABEL[status]}</Text>
    </View>
  );
}

export function StatusStepper({ status }: { status: DeliveryStatus }) {
  if (status === "cancelled") return null;
  const at = STATUS_STEPS.indexOf(status);
  const short = ["Matching", "Accepted", "Picked up", "On the way", "Delivered"];
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
      {STATUS_STEPS.map((s, i) => {
        const done = i < at || status === "delivered";
        const cur = i === at && status !== "delivered";
        return (
          <View key={s} style={{ flex: 1, alignItems: "center" }}>
            <View style={{ flexDirection: "row", alignItems: "center", width: "100%" }}>
              <View style={{ flex: 1, height: 2, backgroundColor: i === 0 ? "transparent" : i <= at ? colors.brand.green : colors.hairline }} />
              <View style={{ height: 24, width: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 2,
                             borderColor: done || cur ? colors.brand.green : colors.hairline, backgroundColor: done ? colors.brand.green : colors.paper }}>
                {done ? <Check size={13} color="#FFF" strokeWidth={3} /> : <Text variant="caption" style={{ fontSize: 10, fontFamily: fonts.bold, color: cur ? colors.brand.green : colors.muted }}>{i + 1}</Text>}
              </View>
              <View style={{ flex: 1, height: 2, backgroundColor: i === STATUS_STEPS.length - 1 ? "transparent" : i < at ? colors.brand.green : colors.hairline }} />
            </View>
            <Text variant="caption" style={{ fontSize: 10, marginTop: 4, color: i <= at ? colors.ink : colors.muted, fontFamily: fonts.medium, textAlign: "center" }}>{short[i]}</Text>
          </View>
        );
      })}
    </View>
  );
}

export function Timeline({ events }: { events: TimelineEvent[] }) {
  return (
    <View style={{ gap: 12 }}>
      {[...events].reverse().map((e, i) => (
        <View key={i} style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ height: 10, width: 10, borderRadius: 5, marginTop: 5, backgroundColor: i === 0 ? colors.brand.green : colors.hairline }} />
          <View style={{ flex: 1 }}>
            <Text variant="label">{e.note || e.status_label}</Text>
            <Text variant="caption" color="muted">{new Date(e.created_at).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

type Fees = {
  base_fare: string; distance_fare: string; weight_fare: string; zone_multiplier: string; category_multiplier: string;
  surge_multiplier: string; fee: string; currency: string; distance_km: string; duration_min?: number; surge_reason?: string;
  min_fare_applied?: boolean;
};

export function FeeBreakdown({ q }: { q: Fees }) {
  const ccy = q.currency || "NGN";
  const row = (label: ReactNode, value: string, muted = false) => (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 }}>
      {typeof label === "string" ? <Text variant="body" color={muted ? "muted" : "ink"}>{label}</Text> : label}
      <Text variant="label" color={muted ? "muted" : "ink"}>{value}</Text>
    </View>
  );
  const m = (v: string) => Number(v) !== 1;
  return (
    <View>
      {row("Base fare", money(q.base_fare, ccy))}
      {row(`Distance · ${Number(q.distance_km).toFixed(1)} km`, money(q.distance_fare, ccy))}
      {Number(q.weight_fare) > 0 ? row("Extra weight", money(q.weight_fare, ccy)) : null}
      {m(q.zone_multiplier) ? row("Area adjustment", `×${Number(q.zone_multiplier).toFixed(2)}`, true) : null}
      {m(q.category_multiplier) ? row("Package handling", `×${Number(q.category_multiplier).toFixed(2)}`, true) : null}
      {m(q.surge_multiplier) ? row(
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <View style={{ backgroundColor: "rgba(180,83,9,0.12)", borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 }}>
            <Text variant="caption" style={{ color: colors.warn, fontFamily: fonts.bold, fontSize: 10 }}>SURGE</Text>
          </View>
          <Text variant="body" color="muted">{q.surge_reason || "Busy period"}</Text>
        </View>, `×${Number(q.surge_multiplier).toFixed(2)}`, true) : null}
      {q.min_fare_applied ? row("Minimum fare applied", "", true) : null}
      <View style={{ height: 1, backgroundColor: colors.hairline, marginVertical: 8 }} />
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text variant="title">Total{q.duration_min ? <Text variant="caption" color="muted">  ≈ {q.duration_min} min</Text> : null}</Text>
        <Text variant="heading" style={{ fontSize: 24 }}>{money(q.fee, ccy)}</Text>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Location field                                                      */
/* ------------------------------------------------------------------ */

export function LocationField({
  label, kind, value, onChange, near, active, onFocus,
}: {
  label: string; kind: "pickup" | "dropoff"; value: Place | null; onChange: (p: Place | null) => void;
  near?: { lat: number; lng: number }; active?: boolean; onFocus?: () => void;
}) {
  const [text, setText] = useState(value?.address ?? "");
  const [hits, setHits] = useState<Hit[]>([]);
  const [busy, setBusy] = useState<"search" | "gps" | null>(null);
  const [err, setErr] = useState("");
  const lastAddr = useRef(value?.address);

  if (value?.address !== lastAddr.current) {
    lastAddr.current = value?.address;
    if (value?.address && value.address !== text) setText(value.address);
  }

  useEffect(() => {
    if (text.trim().length < 3 || text === value?.address) { setHits([]); return; }
    const id = setTimeout(async () => {
      setBusy("search");
      setHits(await searchPlaces(text, near));
      setBusy(null);
    }, 650);
    return () => clearTimeout(id);
  }, [text, near, value?.address]);

  async function gps() {
    setErr(""); setBusy("gps");
    try {
      const p = await currentPosition();
      onChange({ ...p, address: await reverseGeocode(p.lat, p.lng) });
    } catch (e) { setErr((e as Error).message); } finally { setBusy(null); }
  }

  const dot = kind === "pickup" ? colors.brand.green : colors.brand.red;
  return (
    <View style={{ borderRadius: 14, borderWidth: active ? 2 : 1, borderColor: active ? colors.brand.green : colors.hairline, backgroundColor: colors.paper }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingTop: 10 }}>
        <View style={{ height: 9, width: 9, borderRadius: 5, backgroundColor: dot }} />
        <Text variant="caption" color="muted" style={{ fontFamily: fonts.bold, letterSpacing: 0.5 }}>{label.toUpperCase()}</Text>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingBottom: 6 }}>
        <Search size={16} color={colors.muted} />
        <TextInput
          value={text}
          onChangeText={(v) => { setText(v); if (value) onChange(null); }}
          onFocus={onFocus}
          placeholder={kind === "pickup" ? "Where should the rider collect it?" : "Where is it going?"}
          placeholderTextColor={colors.muted}
          accessibilityLabel={label}
          style={{ flex: 1, height: 42, fontFamily: fonts.regular, fontSize: 15, color: colors.ink }}
        />
        {busy === "search" ? <ActivityIndicator size="small" color={colors.muted} /> : null}
        {value ? <Check size={17} color={colors.brand.green} /> : null}
        {text ? <Pressable onPress={() => { setText(""); onChange(null); }} hitSlop={8} accessibilityLabel="Clear"><X size={16} color={colors.muted} /></Pressable> : null}
        {kind === "pickup" ? (
          <Pressable onPress={gps} hitSlop={6} accessibilityLabel="Use my location"
            style={{ height: 32, width: 32, borderRadius: 9, borderWidth: 1, borderColor: colors.hairline, alignItems: "center", justifyContent: "center" }}>
            {busy === "gps" ? <ActivityIndicator size="small" color={colors.brand.green} /> : <Crosshair size={16} color={colors.brand.green} />}
          </Pressable>
        ) : null}
      </View>
      {err ? <Text variant="caption" color="danger" style={{ paddingHorizontal: 14, paddingBottom: 8 }}>{err}</Text> : null}
      {hits.length ? (
        <View style={{ borderTopWidth: 1, borderTopColor: colors.hairline }}>
          {hits.map((h, i) => (
            <Pressable key={i} onPress={() => { onChange(h); setText(h.address); setHits([]); }}
              style={{ flexDirection: "row", gap: 10, paddingHorizontal: 14, paddingVertical: 11, borderTopWidth: i ? 1 : 0, borderTopColor: colors.hairline }}>
              <MapPin size={16} color={colors.muted} style={{ marginTop: 1 }} />
              <Text variant="body" style={{ flex: 1 }}>{h.address}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      {active && !value && !hits.length ? (
        <Text variant="caption" color="muted" style={{ paddingHorizontal: 14, paddingBottom: 10 }}>Or tap the map to drop the pin.</Text>
      ) : null}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Card checkout (Flutterwave) in a WebView                            */
/* ------------------------------------------------------------------ */

const RETURN_MARKERS = ["/deliveries/payment-return", "/payment/flutterwave-callback"];
const OPEN_IN_SAME_VIEW = `(function(){try{window.open=function(u){if(u){window.location.href=u;}return{closed:false,close:function(){},focus:function(){},blur:function(){},postMessage:function(){},location:window.location};};}catch(e){}})();true;`;

export function CheckoutModal({ url, onComplete, onCancel }: { url: string | null; onComplete: (returnUrl: string) => void; onCancel: () => void }) {
  const isReturn = (u: string) => RETURN_MARKERS.some((m) => u.includes(m));
  return (
    <Modal visible={Boolean(url)} animationType="slide" onRequestClose={onCancel}>
      <Screen edges={["top"]}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.hairline }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Lock size={15} color={colors.brand.green} />
            <Text variant="title">Secure payment · Flutterwave</Text>
          </View>
          <Pressable onPress={onCancel} hitSlop={8} accessibilityLabel="Close payment"><X size={22} color={colors.ink} /></Pressable>
        </View>
        {url ? (
          <WebView
            source={{ uri: url }} startInLoadingState originWhitelist={["*"]} javaScriptEnabled domStorageEnabled
            thirdPartyCookiesEnabled sharedCookiesEnabled javaScriptCanOpenWindowsAutomatically setSupportMultipleWindows={false}
            mixedContentMode="always" injectedJavaScriptBeforeContentLoaded={OPEN_IN_SAME_VIEW}
            renderLoading={() => <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={colors.brand.green} /></View>}
            onNavigationStateChange={(nav) => { if (isReturn(nav.url)) onComplete(nav.url); }}
            onShouldStartLoadWithRequest={(req) => { if (isReturn(req.url)) { onComplete(req.url); return false; } return true; }}
          />
        ) : null}
      </Screen>
    </Modal>
  );
}

/** Small "₦1,200" chip used on offer and job cards. */
export function MoneyChip({ amount, currency = "NGN", tone = "green" }: { amount: string; currency?: string; tone?: "green" | "dark" }) {
  return (
    <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: tone === "green" ? "rgba(11,115,39,0.10)" : colors.ink }}>
      <Text variant="label" style={{ color: tone === "green" ? colors.brand.green : "#FFF", fontFamily: fonts.bold }}>{money(amount, currency)}</Text>
    </View>
  );
}
