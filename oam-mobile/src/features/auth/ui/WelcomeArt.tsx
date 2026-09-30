/**
 * Hero illustration for the Welcome-back screen: large OAM service icons on
 * soft tiles. Once the launch splash is gone they pop in one after another,
 * then float, sway and "breathe" on their own rhythms. Honours the OS "Reduce motion" setting. Plain style
 * objects only (NativeWind drops function styles on devices).
 */
import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, View } from "react-native";
import { Plane, Smartphone, Store, Tv, Wallet, Zap, type LucideIcon } from "lucide-react-native";
import { colors } from "@/shared/theme";
import { useSplashState } from "@/features/splash/splash-state";

type Tile = { Icon: LucideIcon; x: number; y: number; size: number; color: string; bg: string; tilt: number; delay: number };

// x / y = top-left corner as a fraction of the art box; size in px.
const TILES: Tile[] = [
  { Icon: Wallet,     x: 0.04, y: 0.06, size: 78, color: colors.brand.green, bg: "#E7F6EC", tilt: -6, delay: 0 },
  { Icon: Plane,      x: 0.38, y: 0.0,  size: 66, color: colors.brand.red,   bg: "#FDECEC", tilt: 5,  delay: 140 },
  { Icon: Smartphone, x: 0.70, y: 0.08, size: 74, color: colors.ink,         bg: "#F1F2F4", tilt: 7,  delay: 280 },
  { Icon: Zap,        x: 0.14, y: 0.56, size: 68, color: "#D97706",          bg: "#FEF3E2", tilt: 4,  delay: 420 },
  { Icon: Tv,         x: 0.46, y: 0.46, size: 78, color: colors.brand.green, bg: "#E7F6EC", tilt: -4, delay: 560 },
  { Icon: Store,      x: 0.77, y: 0.6,  size: 64, color: colors.brand.red,   bg: "#FDECEC", tilt: -7, delay: 700 },
];

function useReduceMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => alive && setReduce(v)).catch(() => {});
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduce);
    return () => { alive = false; sub.remove(); };
  }, []);
  return reduce;
}

/** A 0→1→0 loop with its own period, started after `delay`. */
function useWave(period: number, delay: number, run: boolean) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!run) { v.setValue(0); return; }
    const half = period / 2;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: half, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: half, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    const t = setTimeout(() => loop.start(), delay);
    return () => { clearTimeout(t); loop.stop(); };
  }, [v, period, delay, run]);
  return v;
}

function ServiceTile({ Icon, size, color, bg, tilt, delay, reduce, index, start }: Tile & { reduce: boolean; index: number; start: boolean }) {
  // Entrance: pop in with a spring, staggered — only once the splash is gone.
  const enter = useRef(new Animated.Value(reduce ? 1 : 0)).current;
  useEffect(() => {
    if (reduce) { enter.setValue(1); return; }
    if (!start) return;
    const a = Animated.spring(enter, { toValue: 1, delay, friction: 5, tension: 70, useNativeDriver: true });
    a.start();
    return () => a.stop();
  }, [enter, delay, reduce, start]);

  // Idle: each tile gets slightly different periods so they never move in lockstep.
  const run = !reduce && start;
  const float = useWave(2600 + index * 230, delay + 600, run);
  const sway = useWave(3400 + index * 310, delay + 900, run);
  const breathe = useWave(2200 + index * 170, delay + 1200, run);

  const translateY = Animated.add(
    enter.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }),
    float.interpolate({ inputRange: [0, 1], outputRange: [0, -10] }),
  );
  const rotate = sway.interpolate({ inputRange: [0, 1], outputRange: [`${tilt - 4}deg`, `${tilt + 4}deg`] });
  const scale = Animated.multiply(
    enter.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }),
    breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] }),
  );

  return (
    <Animated.View
      style={{
        opacity: enter,
        transform: [{ translateY }, { rotate: reduce ? `${tilt}deg` : rotate }, { scale }],
        height: size, width: size, borderRadius: size * 0.3, backgroundColor: bg,
        alignItems: "center", justifyContent: "center",
        borderWidth: 1, borderColor: "rgba(17,17,17,0.04)",
        shadowColor: "#0B2716", shadowOpacity: 0.12, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 4,
      }}
    >
      <Icon size={Math.round(size * 0.46)} color={color} strokeWidth={1.9} />
    </Animated.View>
  );
}

export function WelcomeArt({ height = 230 }: { height?: number }) {
  const reduce = useReduceMotion();
  const start = useSplashState((s) => s.done);
  return (
    <View style={{ height, width: "100%", alignItems: "center", justifyContent: "center" }}>
      <View style={{ width: "100%", maxWidth: 360, height: height - 10 }}>
        {TILES.map((t, i) => (
          <View key={t.x + ":" + t.y} style={{ position: "absolute", left: `${t.x * 100}%`, top: `${t.y * 100}%` }}>
            <ServiceTile {...t} index={i} reduce={reduce} start={start} />
          </View>
        ))}
      </View>
    </View>
  );
}
