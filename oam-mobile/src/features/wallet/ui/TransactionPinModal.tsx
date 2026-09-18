import { useEffect, useState } from "react";
import { View, Modal, Pressable, ActivityIndicator } from "react-native";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react-native";
import { Text, Button } from "@/shared/ui";
import { colors } from "@/shared/theme";
import { apiErrorMessage } from "@/shared/api";
import { PinPad } from "@/features/auth/ui/PinPad";
import { payoutsApi } from "@/features/wallet/api/payouts-api";

/**
 * Prompts for the backend TRANSACTION PIN that authorises money leaving the wallet
 * (withdraw / transfer). If the user has no transaction PIN yet, it walks them
 * through setting one first. On success it hands the entered PIN back to onConfirm,
 * which the caller passes to the withdraw/transfer request. This mirrors the web,
 * where the same /wallet/pin/ status + set flow gates payouts.
 */
export function TransactionPinModal({
  visible, onCancel, onConfirm, busy,
}: { visible: boolean; onCancel: () => void; onConfirm: (pin: string) => void; busy?: boolean }) {
  const { t } = useTranslation();
  const status = useQuery({ queryKey: ["wallet", "pin"], queryFn: payoutsApi.getPinStatus, enabled: visible });
  const hasPin = status.data?.has_pin;

  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [stage, setStage] = useState<"enter" | "set" | "setConfirm">("enter");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) { setPin(""); setConfirm(""); setStage("enter"); setError(null); }
  }, [visible]);
  useEffect(() => {
    if (status.data) setStage(status.data.has_pin ? "enter" : "set");
  }, [status.data]);

  const setPinMut = useMutation({
    mutationFn: () => payoutsApi.setPin({ pin }),
    onSuccess: () => { onConfirm(pin); },
    onError: (err) => { setError(apiErrorMessage(err, t("pin.errSet", "Couldn't set your PIN. Try again."))); setPin(""); setConfirm(""); setStage("set"); },
  });

  function onPinChange(next: string, which: "pin" | "confirm") {
    setError(null);
    const set = which === "pin" ? setPin : setConfirm;
    set(next);
    if (next.length === 4) {
      if (stage === "enter") { onConfirm(next); }             // existing PIN -> hand back to caller
      else if (stage === "set" && which === "pin") { setStage("setConfirm"); }
      else if (stage === "setConfirm" && which === "confirm") {
        if (next === pin) setPinMut.mutate();
        else { setError(t("pin.mismatch", "PINs don't match. Try again.")); setPin(""); setConfirm(""); setStage("set"); }
      }
    }
  }

  const title = stage === "enter" ? t("pin.enterTitle", "Enter your transaction PIN")
    : stage === "set" ? t("pin.setTitle", "Create a transaction PIN")
    : t("pin.confirmTitle", "Confirm your PIN");
  const sub = stage === "enter" ? t("pin.enterBody", "Authorise this transfer with your 4-digit PIN.")
    : t("pin.setBody", "You need a PIN to move money out of your wallet.");
  const activeVal = stage === "setConfirm" ? confirm : pin;
  const which = stage === "setConfirm" ? "confirm" : "pin";

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" }}>
        <View style={{ backgroundColor: colors.paper, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, paddingBottom: 32 }}>
          <Pressable onPress={onCancel} hitSlop={8} style={{ alignSelf: "flex-end" }}><X size={20} color={colors.muted} /></Pressable>
          {status.isLoading ? (
            <ActivityIndicator color={colors.brand.green} style={{ marginVertical: 30 }} />
          ) : (
            <>
              <Text variant="heading" style={{ textAlign: "center" }}>{title}</Text>
              <Text variant="body" color="muted" style={{ textAlign: "center", marginTop: 6, marginBottom: 16 }}>{sub}</Text>
              {error ? <Text variant="caption" color="danger" style={{ textAlign: "center", marginBottom: 10 }}>{error}</Text> : null}
              {busy || setPinMut.isPending ? (
                <ActivityIndicator color={colors.brand.green} style={{ marginVertical: 24 }} />
              ) : (
                <PinPad value={activeVal} onChange={(v) => onPinChange(v, which)} length={4} error={!!error} />
              )}
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}
