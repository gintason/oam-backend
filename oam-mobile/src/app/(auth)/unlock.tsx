import { useState, useEffect } from "react";
import { View } from "react-native";
import { Screen, Text } from "@/shared/ui";
import { colors } from "@/shared/theme";
import { Pressable } from "react-native";
import { useAuthStore } from "@/features/auth";
import { PinPad } from "@/features/auth/ui/PinPad";

export default function Unlock() {
  const unlock = useAuthStore((s) => s.unlock);
  const signOut = useAuthStore((s) => s.signOut);
  const name = useAuthStore((s) => s.lockedName || s.user?.first_name || "");

  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    if (pin.length !== 4) return;
    (async () => {
      const ok = await unlock(pin);
      if (!ok) {
        setError(true);
        setTimeout(() => { setPin(""); setError(false); }, 700);
      }
    })();
  }, [pin]);

  return (
    <Screen edges={["top", "bottom"]}>
      <View style={{ flex: 1, paddingHorizontal: 28, paddingTop: 40, alignItems: "center" }}>
        <Text variant="heading" style={{ textAlign: "center" }}>{name ? `Welcome back, ${name}` : "Welcome back"}</Text>

        <View style={{ height: 40 }} />
        <PinPad value={pin} onChange={(v) => { setError(false); setPin(v); }} error={error} />
        <Text variant="body" color={error ? "danger" : "muted"} style={{ marginTop: 22 }}>
          {error ? "Incorrect PIN. Try again." : "Enter your Unlock Code"}
        </Text>

        <View style={{ flex: 1 }} />
        <Pressable onPress={signOut} hitSlop={8} style={{ paddingVertical: 16 }}>
          <Text variant="body" color="muted">
            {name ? `Not ${name}? ` : ""}<Text variant="body" color="green">Switch account</Text>
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}
