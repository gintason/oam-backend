import { useEffect, useRef } from "react";
import { View, StyleSheet, Dimensions, Animated, Easing } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import {
  Smartphone, Wifi, Tv, Zap, Plane, Store, Send, Gift, Wallet, Wrench, Ticket, Bus, type LucideIcon,
} from "lucide-react-native";

const logo = require("../../../assets/images/oam-splash-logo.png");
const { height: H } = Dimensions.get("window");

// Dimmed, scattered service icons — the Hero look.
const ICONS: { Icon: LucideIcon; left: number; top: number; size: number; o: number }[] = [
  { Icon: Smartphone, left: 26, top: 90, size: 30, o: 0.08 },
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
  { Icon: Bus, left: 176, top: 240, size: 26, o: 0.06 },
];

export function AppSplash({ onReady }: { onReady?: () => void }) {
  // Wordmark colour animation: red -> black -> light green (plays once, holds green).
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 2600, easing: Easing.inOut(Easing.ease), useNativeDriver: false }).start();
  }, [anim]);
  const color = anim.interpolate({
    inputRange: [0, 0.45, 1],
    outputRange: ["#E31012", "#111111", "#22A352"], // red -> black -> light green
  });

  return (
    <View style={{ flex: 1, backgroundColor: "#062616" }} onLayout={onReady}>
      <LinearGradient
        colors={["rgba(11,115,39,0.55)", "rgba(6,38,22,0.20)", "rgba(6,38,22,0.92)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={{ position: "absolute", top: -60, left: -46, height: 230, width: 230, borderRadius: 115, backgroundColor: "rgba(255,255,255,0.06)" }} />
      <View style={{ position: "absolute", bottom: 90, right: -64, height: 200, width: 200, borderRadius: 100, backgroundColor: "rgba(255,255,255,0.045)" }} />

      {ICONS.map((b, i) => (
        <View key={i} style={{ position: "absolute", left: b.left, top: b.top, opacity: b.o }}>
          <b.Icon size={b.size} strokeWidth={1.5} color="#FFFFFF" />
        </View>
      ))}

      {/* red | green edge seam */}
      <View style={{ position: "absolute", top: 0, bottom: 0, right: 0, width: 4 }}>
        <View style={{ flex: 1, backgroundColor: "#E31012" }} />
        <View style={{ flex: 1, backgroundColor: "#0B7327" }} />
      </View>

      {/* centre: TIGHT, solid-white logo panel (hugs the logo) + animated wordmark */}
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 22 }}>
        <View
          style={{
            backgroundColor: "#FFFFFF",          // fully opaque
            borderRadius: 18,
            paddingHorizontal: 12,
            paddingVertical: 9,
            alignSelf: "center",
            shadowColor: "#000",
            shadowOpacity: 0.18,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 6 },
            elevation: 8,
          }}
        >
          <Image source={logo} style={{ width: 176, height: 63 }} contentFit="contain" />
        </View>

        <Animated.Text style={{ fontSize: 22, fontWeight: "800", letterSpacing: 0.5, color, textShadowColor: "rgba(0,0,0,0.25)", textShadowRadius: 6 }}>
          O.A.M Mobile
        </Animated.Text>

        <View style={{ flexDirection: "row", gap: 6, marginTop: 2 }}>
          {[0, 1, 2].map((i) => <View key={i} style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.5)" }} />)}
        </View>
      </View>
    </View>
  );
}
