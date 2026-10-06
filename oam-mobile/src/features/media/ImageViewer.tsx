/**
 * Full-screen photo viewer: swipe between photos, pinch to zoom (up to 5×),
 * double-tap to zoom in/out, drag around while zoomed.
 * Uses gesture-handler + reanimated, which the app already ships.
 */
import { useCallback, useRef, useState } from "react";
import { FlatList, Image, Modal, Pressable, StatusBar, View, useWindowDimensions, type ListRenderItem } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Text } from "@/shared/ui";

const MAX = 5;
const DOUBLE = 2.5;

function ZoomableImage({ uri, width, height, onZoom }: { uri: string; width: number; height: number; onZoom: (zoomed: boolean) => void }) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const savedTx = useSharedValue(0);
  const savedTy = useSharedValue(0);

  const clamp = (v: number, lo: number, hi: number) => {
    "worklet";
    return Math.min(hi, Math.max(lo, v));
  };
  const bounds = (s: number) => {
    "worklet";
    return { x: (width * (s - 1)) / 2, y: (height * (s - 1)) / 2 };
  };
  const reset = () => {
    "worklet";
    scale.value = withTiming(1); savedScale.value = 1;
    tx.value = withTiming(0); ty.value = withTiming(0); savedTx.value = 0; savedTy.value = 0;
    runOnJS(onZoom)(false);
  };

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      const s = clamp(savedScale.value * e.scale, 1, MAX);
      scale.value = s;
      const b = bounds(s);
      tx.value = clamp(tx.value, -b.x, b.x);
      ty.value = clamp(ty.value, -b.y, b.y);
    })
    .onEnd(() => {
      if (scale.value <= 1.02) { reset(); return; }
      savedScale.value = scale.value; savedTx.value = tx.value; savedTy.value = ty.value;
      runOnJS(onZoom)(true);
    });

  // Only take over the drag when zoomed in; otherwise let the list swipe to the next photo.
  const pan = Gesture.Pan()
    .averageTouches(true)
    .manualActivation(true)
    .onTouchesMove((e, state) => {
      if (savedScale.value > 1 || e.numberOfTouches > 1) state.activate();
      else state.fail();
    })
    .onUpdate((e) => {
      const b = bounds(scale.value);
      tx.value = clamp(savedTx.value + e.translationX, -b.x, b.x);
      ty.value = clamp(savedTy.value + e.translationY, -b.y, b.y);
    })
    .onEnd(() => { savedTx.value = tx.value; savedTy.value = ty.value; });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .maxDelay(260)
    .onEnd((e) => {
      if (savedScale.value > 1) { reset(); return; }
      // Zoom towards the tapped point.
      const b = bounds(DOUBLE);
      const nx = clamp((width / 2 - e.x) * (DOUBLE - 1), -b.x, b.x);
      const ny = clamp((height / 2 - e.y) * (DOUBLE - 1), -b.y, b.y);
      scale.value = withTiming(DOUBLE); savedScale.value = DOUBLE;
      tx.value = withTiming(nx); ty.value = withTiming(ny); savedTx.value = nx; savedTy.value = ny;
      runOnJS(onZoom)(true);
    });

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }));

  return (
    // touchAction (browser only): keep swiping between photos; the pinch goes to us, not page zoom.
    <GestureDetector gesture={Gesture.Simultaneous(pinch, pan, doubleTap)} touchAction="pan-x pan-y">
      <View style={{ width, height, overflow: "hidden", alignItems: "center", justifyContent: "center" }} collapsable={false}>
        <Animated.View style={[{ width, height }, style]}>
          <Image source={{ uri }} style={{ width, height }} resizeMode="contain" accessibilityIgnoresInvertColors />
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

export function ImageViewer({
  images, index, onClose,
}: { images: string[]; index: number | null; onClose: () => void }) {
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState(index ?? 0);
  const [zoomed, setZoomed] = useState(false);
  const opened = useRef<number | null>(null);
  if (index !== opened.current) { opened.current = index; if (index != null) { setCurrent(index); setZoomed(false); } }

  const renderItem = useCallback<ListRenderItem<string>>(
    ({ item }) => <ZoomableImage uri={item} width={width} height={height} onZoom={setZoomed} />,
    [width, height],
  );

  return (
    <Modal visible={index != null} transparent={false} animationType="fade" onRequestClose={onClose} statusBarTranslucent supportedOrientations={["portrait", "landscape"]}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#000" }}>
        {index != null ? (
          <FlatList
            data={images}
            keyExtractor={(u, i) => `${i}-${u}`}
            renderItem={renderItem}
            horizontal
            pagingEnabled
            scrollEnabled={!zoomed}
            initialScrollIndex={index}
            getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={32}
            onScroll={(e) => {
              const i = Math.round(e.nativeEvent.contentOffset.x / width);
              if (i !== current) setCurrent(i);
            }}
          />
        ) : null}
        <View pointerEvents="box-none" style={{ position: "absolute", top: insets.top + 8, left: 0, right: 0, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14 }}>
          <View style={{ backgroundColor: "rgba(255,255,255,0.14)", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 }}>
            <Text variant="label" color="paper">{images.length ? `${current + 1} / ${images.length}` : ""}</Text>
          </View>
          <Pressable onPress={onClose} hitSlop={10} accessibilityLabel={t("media.close", "Close")} style={{ height: 40, width: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center" }}>
            <X size={22} color="#FFF" />
          </Pressable>
        </View>
        <View pointerEvents="none" style={{ position: "absolute", bottom: insets.bottom + 18, left: 0, right: 0, alignItems: "center" }}>
          <Text variant="caption" style={{ color: "rgba(255,255,255,0.6)" }}>{t("media.zoomHint", "Pinch or double-tap to zoom")}</Text>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}
