/**
 * Keep text inputs above the on-screen keyboard.
 *
 * The app runs edge-to-edge on Android (app.json `edgeToEdgeEnabled`), and in
 * that mode Android no longer shrinks the window when the keyboard opens — so
 * the keyboard was drawn over whatever field you were typing in. Instead we
 * measure how much of a container the keyboard actually overlaps and pad its
 * bottom by exactly that much: scroll views shrink to the visible area and
 * Android scrolls the focused field into view.
 *
 *  - `useKeyboardInset(ref)`: overlap (px) between the keyboard and `ref`'s box.
 *  - `<KeyboardAware>`: a flex:1 wrapper padded by that overlap. Used by
 *    `Screen` (Android) and inside bottom-sheet modals (both platforms).
 */
import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { Dimensions, Keyboard, Platform, View, type KeyboardEvent, type StyleProp, type ViewStyle } from "react-native";

export function useKeyboardInset(ref: RefObject<View | null>, enabled = true) {
  const [inset, setInset] = useState(0);
  useEffect(() => {
    if (!enabled || Platform.OS === "web") return;
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const onShow = (e: KeyboardEvent) => {
      const screenH = Dimensions.get(Platform.OS === "android" ? "screen" : "window").height;
      const kbTop = e.endCoordinates.screenY > 0 && e.endCoordinates.screenY < screenH
        ? e.endCoordinates.screenY : screenH - e.endCoordinates.height;
      const node = ref.current;
      if (!node) { setInset(e.endCoordinates.height); return; }
      node.measureInWindow((_x, y, _w, h) => {
        // Overlap of the keyboard with this box; fall back to the full height if unmeasurable.
        const overlap = Number.isFinite(y) && h > 0 ? y + h - kbTop : e.endCoordinates.height;
        setInset(Math.max(0, Math.round(overlap)));
      });
    };
    const subs = [Keyboard.addListener(showEvt, onShow), Keyboard.addListener(hideEvt, () => setInset(0))];
    return () => subs.forEach((s) => s.remove());
  }, [ref, enabled]);
  return inset;
}

export function KeyboardAware({
  children, style, enabled = true,
}: { children: ReactNode; style?: StyleProp<ViewStyle>; enabled?: boolean }) {
  const ref = useRef<View>(null);
  const inset = useKeyboardInset(ref, enabled);
  return (
    <View ref={ref} style={[{ flex: 1, paddingBottom: inset }, style]} collapsable={false}>
      {children}
    </View>
  );
}
