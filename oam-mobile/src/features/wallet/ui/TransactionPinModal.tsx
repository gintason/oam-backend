import { useEffect, useState } from "react";
import { View, Modal, Pressable, ActivityIndicator } from "react-native";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react-native";
import { Text, Input, Button } from "@/shared/ui";
import { colors } from "@/shared/theme";
import { apiErrorMessage } from "@/shared/api";
import { payoutsApi } from "@/features/wallet/api/payouts-api";

/**
 * Prompts for the backend TRANSACTION PIN that authorises money leaving the wallet
 * (withdraw / transfer). Mirrors the web:
 *  - if the user has NO PIN yet, they create one — authorised with their ACCOUNT
 *    PASSWORD (the backend requires it for first-time setup) — enter + confirm.
 *  - if they HAVE a PIN, they simply enter it.
 * On success the entered PIN is handed to onConfirm(), which the caller sends with
 * the withdraw/transfer request. PINs are 4–6 digits, like the web.
 */
export function TransactionPinModal({
  visible, onCancel, onConfirm, busy,
}: { visible: boolean; onCancel: () => void; onConfirm: (pin: string) => void; busy?: boolean }) {
  const { t } = useTranslation();
  const status = useQuery({ queryKey: ["wallet", "pin"], queryFn: payoutsApi.getPinStatus, enabled: visible });
  const hasPin = status.data?.has_pin;

  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) { setPassword(""); setPin(""); setConfirm(""); setError(null); }
  }, [visible]);

  const createPin = useMutation({
    mutationFn: () => payoutsApi.setPin({ pin, password }),
    onSuccess: () => onConfirm(pin),
    onError: (err) => setError(apiErrorMessage(err, t("pin.errSet", "Couldn't set your PIN. Check your password and try again."))),
  });

  const onlyDigits = (v: string) => v.replace(/[^\d]/g, "").slice(0, 6);
  const pinValid = /^\d{4,6}$/.test(pin);

  function submit() {
    setError(null);
    if (hasPin) {
      if (!pinValid) return setError(t("pin.errLen", "Enter your 4–6 digit PIN."));
      return onConfirm(pin);
    }
    // first-time setup
    if (!password) return setError(t("pin.errPassword", "Enter your account password."));
    if (!pinValid) return setError(t("pin.errLen", "PIN must be 4–6 digits."));
    if (pin !== confirm) return setError(t("pin.errMatch", "PINs don't match."));
    createPin.mutate();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" }}>
        <View style={{ backgroundColor: colors.paper, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, paddingBottom: 30 }}>
          <Pressable onPress={onCancel} hitSlop={8} style={{ alignSelf: "flex-end", marginBottom: 4 }}><X size={20} color={colors.muted} /></Pressable>

          {status.isLoading ? (
            <ActivityIndicator color={colors.brand.green} style={{ marginVertical: 30 }} />
          ) : (
            <>
              <Text variant="heading">{hasPin ? t("pin.enterTitle", "Enter your transaction PIN") : t("pin.setTitle", "Create a transaction PIN")}</Text>
              <Text variant="body" color="muted" style={{ marginTop: 6, marginBottom: 14 }}>
                {hasPin ? t("pin.enterBody", "Authorise this transfer with your PIN.") : t("pin.setBody", "You need a PIN to move money out of your wallet. Confirm with your account password to create one.")}
              </Text>
              {error ? <View style={{ borderRadius: 10, borderWidth: 1, borderColor: "rgba(159,18,57,0.3)", backgroundColor: "rgba(159,18,57,0.05)", paddingHorizontal: 12, paddingVertical: 9, marginBottom: 12 }}><Text variant="caption" color="danger">{error}</Text></View> : null}

              {!hasPin ? (
                <Input label={t("pin.passwordLabel", "Account password")} value={password} onChangeText={setPassword} secureTextEntry placeholder="••••••••" autoCapitalize="none" />
              ) : null}

              <Input label={hasPin ? t("pin.pinLabel", "Transaction PIN") : t("pin.newPinLabel", "New PIN (4–6 digits)")}
                     value={pin} onChangeText={(v) => setPin(onlyDigits(v))} secureTextEntry keyboardType="number-pad" placeholder="••••" />

              {!hasPin ? (
                <Input label={t("pin.confirmLabel", "Confirm PIN")} value={confirm} onChangeText={(v) => setConfirm(onlyDigits(v))} secureTextEntry keyboardType="number-pad" placeholder="••••" />
              ) : null}

              <Button
                title={hasPin ? t("pin.confirmBtn", "Confirm") : t("pin.createBtn", "Create PIN & continue")}
                onPress={submit}
                loading={busy || createPin.isPending}
                style={{ marginTop: 6 }}
              />
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}
