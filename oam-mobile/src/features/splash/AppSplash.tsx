import { View, StyleSheet, ActivityIndicator, Dimensions } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import {
  Smartphone, Wifi, Tv, Zap, Plane, Store, Send, Gift, Wallet, Wrench, Ticket, type LucideIcon,
} from "lucide-react-native";
import { Text } from "@/shared/ui";
import { colors, fonts } from "@/shared/theme";

const logo = require("../../../assets/images/oam-splash-logo.png");
const { height: H } = Dimensions.get("window");

// Static, dimmed service icons scattered around the edges (Hero look).
const ICONS: { Icon: LucideIcon; left: number; top: number; size: number; o: number }[] = [
  { Icon: Smartphone, left: 26, top: 96, size: 30, o: 0.08 },
  { Icon: Wifi, left: 232, top: 70, size: 26, o: 0.07 },
  { Icon: Tv, left: 150, top: 150, size: 32, o: 0.06 },
  { Icon: Zap, left: 44, top: 210, size: 28, o: 0.08 },
  { Icon: Plane, left: 244, top: 190, size: 30, o: 0.07 },
  { Icon: Store, left: 30, top: H - 250, size: 30, o: 0.07 },
  { Icon: Send, left: 236, top: H - 250, size: 28, o: 0.07 },
  { Icon: Gift, left: 60, top: H - 170, size: 26, o: 0.07 },
  { Icon: Wallet, left: 244, top: H - 160, size: 30, o: 0.08 },
  { Icon: Wrench, left: 140, top: H - 120, size: 26, o: 0.06 },
  { Icon: Ticket, left: 30, top: H - 110, size: 26, o: 0.06 },
];

export function AppSplash({ onReady }: { onReady?: () => void }) {
  return (
    <View style={{ flex: 1, backgroundColor: "#062616" }} onLayout={onReady}>
      <LinearGradient
        colors={["rgba(11,115,39,0.55)", "rgba(6,38,22,0.20)", "rgba(6,38,22,0.92)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* soft white cloud glows */}
      <View style={{ position: "absolute", top: -60, left: -46, height: 230, width: 230, borderRadius: 115, backgroundColor: "rgba(255,255,255,0.06)" }} />
      <View style={{ position: "absolute", bottom: 90, right: -64, height: 200, width: 200, borderRadius: 100, backgroundColor: "rgba(255,255,255,0.045)" }} />

      {/* scattered dimmed icons */}
      {ICONS.map((b, i) => (
        <View key={i} style={{ position: "absolute", left: b.left, top: b.top, opacity: b.o }}>
          <b.Icon size={b.size} strokeWidth={1.5} color="#FFFFFF" />
        </View>
      ))}

      {/* red | green edge seam */}
      <View style={{ position: "absolute", top: 0, bottom: 0, right: 0, width: 4 }}>
        <View style={{ flex: 1, backgroundColor: colors.brand.red }} />
        <View style={{ flex: 1, backgroundColor: colors.brand.green }} />
      </View>

      {/* centre: white logo panel (reduced height) + tagline */}
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 24 }}>
        <View style={{ width: 256, backgroundColor: "#FFFFFF", borderRadius: 26, paddingHorizontal: 18, paddingVertical: 16 }}>
          <Image source={logo} style={{ width: "100%", height: 84 }} contentFit="contain" />
        </View>
        <Text style={{ color: "rgba(255,255,255,0.80)", fontFamily: fonts.bold, fontSize: 13.5, letterSpacing: 0.4 }}>
          One App, Endless Possibilities
        </Text>
        <ActivityIndicator color="rgba(255,255,255,0.72)" style={{ marginTop: 2 }} />
      </View>
    </View>
  );
}
