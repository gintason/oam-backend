/**
 * Small motion kit: entrance animations and springy press feedback.
 * Honours the OS "Reduce motion" setting. Plain style objects only (NativeWind
 * drops Pressable function styles on devices).
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { AccessibilityInfo, Animated, Easing, Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";

let reduceMotionCache = false;
AccessibilityInfo.isReduceMotionEnabled().then((v) => { reduceMotionCache = v; }).catch(() => {});

export function useReduceMotion() {
  const [reduce, setReduce] = useState(reduceMotionCache);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => { reduceMotionCache = v; if (alive) setReduce(v); }).catch(() => {});
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", (v) => { reduceMotionCache = v; setReduce(v); });
    return () => { alive = false; sub.remove(); };
  }, []);
  return reduce;
}

/** Fades + slides its children in once, on mount. `from` sets the direction. */
export function Reveal({
  children, delay = 0, distance = 16, from = "bottom", scale = 1, style,
}: {
  children: ReactNode; delay?: number; distance?: number; from?: "bottom" | "left" | "right";
  scale?: number; style?: StyleProp<ViewStyle>;
}) {
  const reduce = useReduceMotion();
  const v = useRef(new Animated.Value(reduce ? 1 : 0)).current;
  useEffect(() => {
    if (reduce) { v.setValue(1); return; }
    const a = Animated.spring(v, { toValue: 1, delay, friction: 7, tension: 55, useNativeDriver: true });
    a.start();
    return () => a.stop();
  }, [v, delay, reduce]);

  const offset = v.interpolate({ inputRange: [0, 1], outputRange: [from === "left" ? -distance : distance, 0] });
  const transform = [
    from === "bottom" ? { translateY: offset } : { translateX: offset },
    ...(scale !== 1 ? [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [scale, 1] }) }] : []),
  ];
  const opacity = v.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 0.85, 1], extrapolate: "clamp" });
  return <Animated.View style={[{ opacity, transform }, style]}>{children}</Animated.View>;
}

/**
 * A Pressable that springs down a touch when pressed and bounces back.
 * `style` goes on the animated wrapper; `pressedStyle` is merged in while held.
 */
export function SpringPressable({
  children, style, pressedStyle, scaleTo = 0.96, ...rest
}: Omit<PressableProps, "style" | "children"> & {
  children: ReactNode; style?: StyleProp<ViewStyle>; pressedStyle?: StyleProp<ViewStyle>; scaleTo?: number;
}) {
  const reduce = useReduceMotion();
  const s = useRef(new Animated.Value(1)).current;
  const [pressed, setPressed] = useState(false);
  const to = (value: number) => {
    if (reduce) return;
    Animated.spring(s, { toValue: value, friction: 4, tension: 220, useNativeDriver: true }).start();
  };
  return (
    <Pressable
      {...rest}
      onPressIn={(e) => { setPressed(true); to(scaleTo); rest.onPressIn?.(e); }}
      onPressOut={(e) => { setPressed(false); to(1); rest.onPressOut?.(e); }}
    >
      <Animated.View style={[style, pressed ? pressedStyle : null, { transform: [{ scale: s }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

/** A gentle one-off "breath" used to draw the eye (e.g. the wallet card). */
export function usePulseOnce(delay = 0) {
  const reduce = useReduceMotion();
  const v = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (reduce) return;
    const a = Animated.sequence([
      Animated.delay(delay),
      Animated.timing(v, { toValue: 1.03, duration: 260, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.spring(v, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true }),
    ]);
    a.start();
    return () => a.stop();
  }, [v, delay, reduce]);
  return v;
}
