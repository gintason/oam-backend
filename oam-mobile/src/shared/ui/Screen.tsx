import type { ReactNode } from "react";
import { Platform, View } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { colors } from "@/shared/theme/colors";
import { KeyboardAware } from "./keyboard";

/**
 * Safe-area screen container on the paper surface.
 * On Android it also shrinks above the on-screen keyboard (edge-to-edge
 * windows don't resize for it), so the field you're typing in stays visible.
 */
export function Screen({
  children,
  edges = ["top", "bottom"],
  className,
}: {
  children: ReactNode;
  edges?: readonly Edge[];
  className?: string;
}) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.paper }} edges={edges}>
      <KeyboardAware enabled={Platform.OS === "android"}>
        <View style={{ flex: 1 }} className={className}>
          {children}
        </View>
      </KeyboardAware>
    </SafeAreaView>
  );
}
