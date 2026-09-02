import { View, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { ArrowLeft, Bus } from "lucide-react-native";
import { Screen, Text } from "@/shared/ui";
import { colors } from "@/shared/theme";

/** Placeholder — the full booking flow lands here next. */
export default function BusScreen() {
  const router = useRouter();
  return (
    <Screen edges={["top"]}>
      <View style={{ flex: 1, padding: 24 }}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 20 }}>
          <ArrowLeft size={16} color={colors.muted} /><Text variant="label" color="muted">Back</Text>
        </Pressable>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}>
          <View style={{ height: 64, width: 64, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(11,115,39,0.10)" }}>
            <Bus size={30} strokeWidth={1.5} color={colors.brand.green} />
          </View>
          <Text variant="heading">Bus Tickets</Text>
          <Text variant="body" color="muted" style={{ textAlign: "center" }}>
            Intercity bus booking is coming soon — search trips, pick seats and pay from your wallet, all in the app.
          </Text>
        </View>
      </View>
    </Screen>
  );
}
