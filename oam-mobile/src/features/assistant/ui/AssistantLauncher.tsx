/**
 * Floating O.A.M Assistant launcher — mirrors the web:
 *  - a round black button (green/red glow) that opens the assistant, with a
 *    small × badge to tuck it away;
 *  - tucked away, it becomes a slim tab peeking from the right edge, so it
 *    never covers content; tap the tab to bring the button back.
 * The tucked state lasts while the app is open (the web resets on reload too).
 * Plain style objects only (NativeWind drops function styles on devices).
 */
import { useEffect, useRef } from "react";
import { Animated, Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { MessageCircle, X } from "lucide-react-native";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import { create } from "zustand";
import { colors } from "@/shared/theme";

const useLauncherState = create<{ hidden: boolean; setHidden: (v: boolean) => void }>((set) => ({
  hidden: false,
  setHidden: (hidden) => set({ hidden }),
}));

const INK = "#0a0a0a";
const SHADOW = { shadowColor: INK, shadowOpacity: 0.28, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 8 } as const;

/** `bottom` = distance from the bottom of the screen area (keep it above tab bars). */
export function AssistantLauncher({ bottom = 22 }: { bottom?: number }) {
  const router = useRouter();
  const hidden = useLauncherState((s) => s.hidden);
  const setHidden = useLauncherState((s) => s.setHidden);

  // Pop the button in / slide the tab in whenever the state changes.
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    anim.setValue(0);
    Animated.spring(anim, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }).start();
  }, [hidden, anim]);

  if (hidden) {
    const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [28, 0] });
    return (
      <Animated.View style={{ position: "absolute", right: 0, bottom: bottom + 6, zIndex: 60, transform: [{ translateX }] }}>
        <Pressable
          onPress={() => setHidden(false)}
          accessibilityRole="button"
          accessibilityLabel="Show assistant"
          hitSlop={{ top: 8, bottom: 8, left: 12, right: 0 }}
          style={{
            height: 44, width: 28, borderTopLeftRadius: 12, borderBottomLeftRadius: 12,
            backgroundColor: INK, alignItems: "center", justifyContent: "center", ...SHADOW,
          }}
        >
          <MessageCircle size={15} strokeWidth={1.75} color="#fff" />
        </Pressable>
      </Animated.View>
    );
  }

  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });
  return (
    <Animated.View style={{ position: "absolute", right: 16, bottom, zIndex: 60, opacity: anim, transform: [{ scale }] }}>
      <Pressable
        onPress={() => router.push("/assistant")}
        accessibilityRole="button"
        accessibilityLabel="O.A.M Assistant"
        style={{ height: 56, width: 56, borderRadius: 28, backgroundColor: INK, alignItems: "center", justifyContent: "center", ...SHADOW }}
      >
        {/* Same glow as the web launcher: green top-left, red bottom-right. */}
        <View style={{ position: "absolute", top: 0, left: 0, height: 56, width: 56, borderRadius: 28, overflow: "hidden" }} pointerEvents="none">
          <Svg width={56} height={56}>
            <Defs>
              <RadialGradient id="g" cx="25%" cy="20%" r="60%">
                <Stop offset="0" stopColor={colors.brand.green} stopOpacity={0.55} />
                <Stop offset="1" stopColor={colors.brand.green} stopOpacity={0} />
              </RadialGradient>
              <RadialGradient id="r" cx="80%" cy="85%" r="55%">
                <Stop offset="0" stopColor={colors.brand.red} stopOpacity={0.28} />
                <Stop offset="1" stopColor={colors.brand.red} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Rect width={56} height={56} fill="url(#g)" />
            <Rect width={56} height={56} fill="url(#r)" />
          </Svg>
        </View>
        <MessageCircle size={22} strokeWidth={1.75} color="#fff" />
      </Pressable>

      {/* × badge — tuck the launcher away. */}
      <Pressable
        onPress={() => setHidden(true)}
        accessibilityRole="button"
        accessibilityLabel="Hide assistant"
        hitSlop={10}
        style={{
          position: "absolute", top: -4, right: -4, height: 20, width: 20, borderRadius: 10,
          backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.hairline,
          alignItems: "center", justifyContent: "center",
          shadowColor: INK, shadowOpacity: 0.15, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 9,
        }}
      >
        <X size={11} color={colors.ink} strokeWidth={2.2} />
      </Pressable>
    </Animated.View>
  );
}

