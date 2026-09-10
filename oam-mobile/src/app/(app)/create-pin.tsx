import { useState, useEffect } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { Screen, Text } from "@/shared/ui";
import { useAuthStore } from "@/features/auth";
import { PinPad } from "@/features/auth/ui/PinPad";

export default function CreatePin() {
  const router = useRouter();
  const setPin = useAuthStore((s) => s.setPin);

  const [step, setStep] = useState<"create" | "confirm">("create");
  const [first, setFirst] = useState("");
  const [pin, setPinValue] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    if (pin.length !== 4) return;
    (async () => {
      if (step === "create") {
        setFirst(pin);
        setPinValue("");
        setStep("confirm");
      } else {
        if (pin === first) {
          await setPin(pin);
          router.replace("/home");
        } else {
          setError(true);
          setTimeout(() => { setPinValue(""); setError(false); setFirst(""); setStep("create"); }, 800);
        }
      }
    })();
  }, [pin]);

  const title = step === "create" ? "Create your Unlock Code" : "Confirm your Unlock Code";
  const hint = error ? "PINs didn't match. Start again." : step === "create"
    ? "Choose a 4-digit PIN to unlock the app next time"
    : "Enter it once more to confirm";

  return (
    <Screen edges={["top", "bottom"]}>
      <View style={{ flex: 1, paddingHorizontal: 28, paddingTop: 48, alignItems: "center" }}>
        <Text variant="heading" style={{ textAlign: "center" }}>{title}</Text>
        <View style={{ height: 44 }} />
        <PinPad value={pin} onChange={(v) => { setError(false); setPinValue(v); }} error={error} />
        <Text variant="body" color={error ? "danger" : "muted"} style={{ marginTop: 22, textAlign: "center" }}>{hint}</Text>
      </View>
    </Screen>
  );
}
