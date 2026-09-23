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

  const subtitle = step === "create"
    ? "Choose a 4-digit code to unlock the app quickly next time."
    : "Enter the same 4-digit code again to confirm.";
  return (
    <Screen edges={["top", "bottom"]}>
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 64, alignItems: "center" }}>
        <View style={{ height: 72, width: 72, borderRadius: 36, backgroundColor: "rgba(11,115,39,0.10)", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
          <Lock size={32} strokeWidth={1.75} color={colors.brand.green} />
        </View>
        <Text style={{ fontFamily: fonts.bold, fontSize: 26, color: colors.ink, textAlign: "center" }}>{title}</Text>
        <Text variant="body" color="muted" style={{ textAlign: "center", marginTop: 10, lineHeight: 22, paddingHorizontal: 8 }}>{subtitle}</Text>
        <View style={{ height: 48 }} />
        <PinPad value={pin} onChange={(v) => { setError(false); setPinValue(v); }} error={error} />
        <Text variant="body" color={error ? "danger" : "muted"} style={{ marginTop: 28, textAlign: "center" }}>{hint}</Text>
      </View>
    </Screen>
  );
}
