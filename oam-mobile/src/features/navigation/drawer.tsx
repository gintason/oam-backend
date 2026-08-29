import { createContext, useContext, useRef, useState, type ReactNode } from "react";
import { View, Pressable, Modal, Animated, Dimensions, ScrollView, Alert, Linking } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import {
  Info, Receipt, Store, Ticket, Wrench, Gift, ShoppingBag, LogOut, ChevronRight, BadgeCheck,
  Smartphone, Wifi, Zap, Plane, Tv, Send, type LucideIcon,
} from "lucide-react-native";
import { Text } from "@/shared/ui";
import { colors, fonts } from "@/shared/theme";
import { useAuthStore } from "@/features/auth";

// Logo lives at the project root, exactly like AuthScaffold's require.
const logo = require("../../../assets/images/logo.png");

const { width: SCREEN_W } = Dimensions.get("window");
const DRAWER_W = Math.min(322, SCREEN_W * 0.86);

// Dimmed, scattered service icons — mirrors the web Hero left-side background.
const BG_ICONS: { Icon: LucideIcon; left: number; top: number; size: number; o: number }[] = [
  { Icon: Smartphone, left: 26, top: 96, size: 30, o: 0.06 },
  { Icon: Wifi, left: 232, top: 64, size: 26, o: 0.05 },
  { Icon: Tv, left: 150, top: 158, size: 34, o: 0.05 },
  { Icon: Zap, left: 44, top: 226, size: 28, o: 0.06 },
  { Icon: Store, left: 244, top: 214, size: 30, o: 0.055 },
  { Icon: Plane, left: 64, top: 356, size: 32, o: 0.05 },
  { Icon: Wrench, left: 214, top: 336, size: 28, o: 0.06 },
  { Icon: Gift, left: 32, top: 470, size: 26, o: 0.05 },
  { Icon: Send, left: 206, top: 486, size: 30, o: 0.05 },
  { Icon: Ticket, left: 126, top: 576, size: 28, o: 0.05 },
];

type Ctx = { open: () => void; close: () => void };
const DrawerCtx = createContext<Ctx>({ open: () => {}, close: () => {} });
export const useDrawer = () => useContext(DrawerCtx);

export function DrawerProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const tx = useRef(new Animated.Value(-DRAWER_W)).current;
  const fade = useRef(new Animated.Value(0)).current;

  function open() {
    setVisible(true);
    Animated.parallel([
      Animated.timing(tx, { toValue: 0, duration: 260, useNativeDriver: true }),
      Animated.timing(fade, { toValue: 1, duration: 260, useNativeDriver: true }),
    ]).start();
  }
  function close() {
    Animated.parallel([
      Animated.timing(tx, { toValue: -DRAWER_W, duration: 220, useNativeDriver: true }),
      Animated.timing(fade, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => setVisible(false));
  }

  return (
    <DrawerCtx.Provider value={{ open, close }}>
      {children}
      <Modal visible={visible} transparent animationType="none" onRequestClose={close} statusBarTranslucent>
        <View style={{ flex: 1 }}>
          <Animated.View style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: "rgba(0,0,0,0.5)", opacity: fade }}>
            <Pressable style={{ flex: 1 }} onPress={close} />
          </Animated.View>
          <Animated.View style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: DRAWER_W, transform: [{ translateX: tx }] }}>
            <DrawerPanel onClose={close} />
          </Animated.View>
        </View>
      </Modal>
    </DrawerCtx.Provider>
  );
}

function DrawerPanel({ onClose }: { onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);

  const name = [user?.first_name, user?.last_name].filter(Boolean).join(" ") || t("drawer.user", "OAM User");
  const initial = (user?.first_name?.[0] || "O").toUpperCase();
  const subtitle = user?.email || user?.phone || "";

  function go(route: string) {
    onClose();
    setTimeout(() => router.push(route as never), 170);
  }
  function soon(label: string) {
    onClose();
    setTimeout(() => Alert.alert(label, t("drawer.soon", "This arrives in an upcoming update.")), 220);
  }
  function openSite() {
    onClose();
    setTimeout(() => Linking.openURL("https://oam-app.com").catch(() => {}), 170);
  }

  const links: { key: string; label: string; Icon: LucideIcon; onPress: () => void }[] = [
    { key: "about", label: t("drawer.about", "About OAM"), Icon: Info, onPress: openSite },
    { key: "bills", label: t("drawer.payBills", "Pay Bills"), Icon: Receipt, onPress: () => go("/airtime") },
    { key: "marketplace", label: t("drawer.marketplace", "Market Place"), Icon: Store, onPress: () => go("/marketplace") },
    { key: "betting", label: t("drawer.betting", "Fund Betting Wallet"), Icon: Ticket, onPress: () => go("/betting") },
    { key: "artisans", label: t("drawer.artisans", "Find An Artisan"), Icon: Wrench, onPress: () => go("/artisans-find") },
    { key: "referral", label: t("drawer.referral", "Get Referral Link"), Icon: Gift, onPress: () => go("/referral") },
    { key: "ecommerce", label: t("drawer.ecommerce", "E-commerce"), Icon: ShoppingBag, onPress: () => go("/ecommerce") },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: "#062616", overflow: "hidden" }}>
      {/* Green wash from the top-left, fading down — the Hero mood. */}
      <LinearGradient
        colors={["rgba(11,115,39,0.55)", "rgba(6,38,22,0.35)", "rgba(6,38,22,0.9)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
      />
      {/* Soft white "cloud" glows. */}
      <View style={{ position: "absolute", top: -60, left: -40, height: 240, width: 240, borderRadius: 120, backgroundColor: "rgba(255,255,255,0.06)" }} />
      <View style={{ position: "absolute", top: 260, right: -70, height: 200, width: 200, borderRadius: 100, backgroundColor: "rgba(255,255,255,0.045)" }} />
      {/* Dimmed drifting-style service icons. */}
      {BG_ICONS.map((b, i) => (
        <View key={i} style={{ position: "absolute", left: b.left, top: b.top, opacity: b.o }}>
          <b.Icon size={b.size} strokeWidth={1.5} color="#FFFFFF" />
        </View>
      ))}
      {/* Red | green accent seam down the trailing edge. */}
      <View style={{ position: "absolute", top: 0, bottom: 0, right: 0, width: 3 }}>
        <View style={{ flex: 1, backgroundColor: colors.brand.red }} />
        <View style={{ flex: 1, backgroundColor: colors.brand.green }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 22, paddingBottom: insets.bottom + 20, paddingHorizontal: 20 }} showsVerticalScrollIndicator={false}>
        {/* Logo — kept on a white chip so it reads on the dark background. */}
        <View style={{ alignSelf: "flex-start", backgroundColor: "#FFFFFF", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 }}>
          <Image source={logo} style={{ width: 96, height: 30 }} contentFit="contain" />
        </View>

        {/* Profile */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 22 }}>
          <View style={{ height: 52, width: 52, borderRadius: 26, backgroundColor: "rgba(255,255,255,0.14)", borderWidth: 1, borderColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontFamily: fonts.bold, fontSize: 20, color: "#FFFFFF" }}>{initial}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <Text style={{ fontFamily: fonts.bold, fontSize: 16, color: "#FFFFFF" }} numberOfLines={1}>{name}</Text>
              {user?.is_verified ? <BadgeCheck size={15} strokeWidth={2} color="#7CE0A0" /> : null}
            </View>
            {subtitle ? <Text style={{ fontSize: 12.5, color: "rgba(255,255,255,0.6)", marginTop: 1 }} numberOfLines={1}>{subtitle}</Text> : null}
          </View>
        </View>

        <View style={{ height: 1, backgroundColor: "rgba(255,255,255,0.12)", marginTop: 20, marginBottom: 6 }} />

        {/* Nav links, one after the other */}
        {links.map((l) => (
          <Pressable
            key={l.key}
            onPress={l.onPress}
            style={({ pressed }) => ({
              flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 14, paddingHorizontal: 6,
              borderRadius: 12, backgroundColor: pressed ? "rgba(255,255,255,0.08)" : "transparent",
            })}
          >
            <View style={{ height: 38, width: 38, borderRadius: 11, backgroundColor: "rgba(255,255,255,0.10)", alignItems: "center", justifyContent: "center" }}>
              <l.Icon size={19} strokeWidth={1.75} color="#FFFFFF" />
            </View>
            <Text style={{ fontFamily: fonts.bold, fontSize: 14.5, color: "#FFFFFF" }}>{l.label}</Text>
            <ChevronRight size={16} color="rgba(255,255,255,0.4)" style={{ marginLeft: 4 }} />
          </Pressable>
        ))}

        <View style={{ height: 1, backgroundColor: "rgba(255,255,255,0.12)", marginTop: 8, marginBottom: 6 }} />

        {/* Sign out */}
        <Pressable
          onPress={() => { onClose(); setTimeout(() => signOut().catch(() => {}), 150); }}
          style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 14, paddingHorizontal: 6, borderRadius: 12, backgroundColor: pressed ? "rgba(255,255,255,0.08)" : "transparent" })}
        >
          <View style={{ height: 38, width: 38, borderRadius: 11, backgroundColor: "rgba(227,16,18,0.20)", alignItems: "center", justifyContent: "center" }}>
            <LogOut size={18} strokeWidth={1.75} color="#FF6B6B" />
          </View>
          <Text style={{ flex: 1, fontFamily: fonts.bold, fontSize: 14.5, color: "#FFD7D7" }}>{t("drawer.signOut", "Sign out")}</Text>
        </Pressable>

        <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 14, paddingHorizontal: 6 }}>OAM · {t("drawer.tagline", "One app, everything")}</Text>
      </ScrollView>
    </View>
  );
}
