import { createContext, useContext, useRef, useState, type ReactNode } from "react";
import { View, Pressable, Modal, Animated, Dimensions, ScrollView, Alert, Linking } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import {
  Info, Receipt, Store, Ticket, Wrench, Gift, ShoppingBag, LogOut, ChevronRight, ChevronDown, BadgeCheck,
  Smartphone, Wifi, Zap, Plane, Tv, Send, type LucideIcon,
} from "lucide-react-native";
import Svg, { Path } from "react-native-svg";
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

// Social links (open in browser). Update these URLs to your real OAM handles.
const SOCIALS: { key: string; url: string; d: string }[] = [
  { key: "facebook", url: "https://facebook.com/oamapp",
    d: "M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z" },
  { key: "x", url: "https://x.com/oamapp",
    d: "M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" },
  { key: "instagram", url: "https://instagram.com/oamapp",
    d: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" },
  { key: "tiktok", url: "https://tiktok.com/@oamapp",
    d: "M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" },
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
  const [aboutOpen, setAboutOpen] = useState(false);

  const companyPages: { key: string; label: string; route: string }[] = [
    { key: "c-about", label: t("company.about.title", "About OAM"), route: "/company-about" },
    { key: "c-contact", label: t("company.contact.title", "Contact"), route: "/company-contact" },
    { key: "c-terms", label: t("company.terms.title", "Terms of Service"), route: "/company-terms" },
    { key: "c-privacy", label: t("company.privacy.title", "Privacy Policy"), route: "/company-privacy" },
    { key: "c-refund", label: t("company.refund.title", "Refund Policy"), route: "/company-refund" },
  ];

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

  const links: { key: string; label: string; Icon: LucideIcon; onPress: () => void; expandable?: boolean }[] = [
    { key: "about", label: t("drawer.about", "About OAM"), Icon: Info, onPress: () => setAboutOpen((v) => !v), expandable: true },
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
        <View style={{ alignSelf: "center", backgroundColor: "#FFFFFF", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 }}>
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

        {/* Nav links: [green icon]  Label  › */}
        {links.map((l) => (
          <View key={l.key}>
            <Pressable
              onPress={l.onPress}
              style={({ pressed }) => ({
                borderRadius: 14, marginBottom: 6,
                backgroundColor: pressed ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.06)",
              })}
            >
              <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 11, paddingHorizontal: 12 }}>
                <View style={{ height: 36, width: 36, borderRadius: 10, backgroundColor: colors.brand.green, alignItems: "center", justifyContent: "center", marginRight: 12 }}>
                  <l.Icon size={18} strokeWidth={2} color="#FFFFFF" />
                </View>
                <Text style={{ flex: 1, fontFamily: fonts.bold, fontSize: 15, color: "#FFFFFF" }} numberOfLines={1}>{l.label}</Text>
                {l.expandable
                  ? <ChevronDown size={18} color="rgba(255,255,255,0.5)" style={{ transform: [{ rotate: aboutOpen ? "180deg" : "0deg" }] }} />
                  : <ChevronRight size={18} color="rgba(255,255,255,0.5)" />}
              </View>
            </Pressable>

            {l.key === "about" && aboutOpen ? (
              <View style={{ marginLeft: 20, marginBottom: 6, borderLeftWidth: 1, borderLeftColor: "rgba(255,255,255,0.14)", paddingLeft: 8 }}>
                {companyPages.map((cp) => (
                  <Pressable
                    key={cp.key}
                    onPress={() => go(cp.route)}
                    style={({ pressed }) => ({ borderRadius: 10, backgroundColor: pressed ? "rgba(255,255,255,0.12)" : "transparent" })}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: 12 }}>
                      <Text style={{ flex: 1, fontFamily: fonts.medium, fontSize: 14, color: "rgba(255,255,255,0.9)" }} numberOfLines={1}>{cp.label}</Text>
                      <ChevronRight size={15} color="rgba(255,255,255,0.4)" />
                    </View>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        ))}

        <View style={{ height: 1, backgroundColor: "rgba(255,255,255,0.12)", marginTop: 8, marginBottom: 6 }} />

        {/* Sign out — same horizontal row shape as the nav links */}
        <Pressable
          onPress={() => { onClose(); setTimeout(() => signOut().catch(() => {}), 150); }}
          style={({ pressed }) => ({ borderRadius: 12, backgroundColor: pressed ? "rgba(255,255,255,0.08)" : "transparent" })}
        >
          <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 11, paddingHorizontal: 12 }}>
            <View style={{ height: 36, width: 36, borderRadius: 10, backgroundColor: "rgba(227,16,18,0.20)", alignItems: "center", justifyContent: "center", marginRight: 12 }}>
              <LogOut size={18} strokeWidth={2} color="#FF6B6B" />
            </View>
            <Text style={{ flex: 1, fontFamily: fonts.bold, fontSize: 15, color: "#FFD7D7" }}>{t("drawer.signOut", "Sign out")}</Text>
          </View>
        </Pressable>

        {/* Social media */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 22 }}>
          {SOCIALS.map((sm) => (
            <Pressable key={sm.key} onPress={() => Linking.openURL(sm.url).catch(() => {})} style={{ height: 42, width: 42, borderRadius: 21, backgroundColor: "rgba(255,255,255,0.10)", alignItems: "center", justifyContent: "center", marginHorizontal: 7 }}>
              <Svg width={19} height={19} viewBox="0 0 24 24"><Path d={sm.d} fill="#FFFFFF" /></Svg>
            </Pressable>
          ))}
        </View>

        <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 18, textAlign: "center" }}>OAM · {t("drawer.tagline", "One app, everything")}</Text>
      </ScrollView>
    </View>
  );
}
