import { useState, useEffect } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { Screen, Text } from "@/shared/ui";
import { Lock } from "lucide-react-native";
import { colors, fonts } from "@/shared/theme";
import { useAuthStore } from "@/features/auth";
import { PinPad } from "@/features/auth/ui/PinPad";

export default function CreatePin() {
  const router = useRouter();
  const setPin = useAuthStore((s) => s.setPin);

  const [pin, setPinValue] = useState("");
  const [busy, setBusy] = useState(false);

  // Single entry: the moment 4 digits are in, save the PIN and continue.
  useEffect(() => {
    if (pin.length !== 4 || busy) return;
    (async () => {
      setBusy(true);
      try {
        await setPin(pin);
        router.replace("/home");
      } catch {
        setBusy(false);
        setPinValue("");
      }
    })();
  }, [pin]);

  return (
    <Screen edges={["top", "bottom"]}>
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 64, alignItems: "center" }}>
        <View style={{ height: 72, width: 72, borderRadius: 36, backgroundColor: "rgba(11,115,39,0.10)", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
          <Lock size={32} strokeWidth={1.75} color={colors.brand.green} />
        </View>
        <Text style={{ fontFamily: fonts.bold, fontSize: 26, color: colors.ink, textAlign: "center" }}>Create your Unlock Code</Text>
        <Text variant="body" color="muted" style={{ textAlign: "center", marginTop: 10, lineHeight: 22, paddingHorizontal: 8 }}>
          Choose a 4-digit code to unlock the app quickly next time.
        </Text>
        <View style={{ height: 48 }} />
        <PinPad value={pin} onChange={setPinValue} />
        <Text variant="body" color="muted" style={{ marginTop: 28, textAlign: "center" }}>
          You'll use this 4-digit code to unlock the app.
        </Text>
      </View>
    </Screen>
  );
}
