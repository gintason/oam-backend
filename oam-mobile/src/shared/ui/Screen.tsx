import type { ReactNode } from "react";
import { View } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { colors } from "@/shared/theme/colors";

/** Safe-area screen container on the paper surface. */
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
      <View style={{ flex: 1 }} className={className}>
        {children}
      </View>
    </SafeAreaView>
  );
}
