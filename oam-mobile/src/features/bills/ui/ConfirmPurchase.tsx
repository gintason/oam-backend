import { Modal, View, Pressable } from "react-native";
import { X, AlertCircle } from "lucide-react-native";
import { Text, Button } from "@/shared/ui";
import { useTranslation } from "react-i18next";
import { colors } from "@/shared/theme";

/** Final confirmation before money moves — restates the whole purchase. */
export function ConfirmPurchase({
  open,
  title,
  lines,
  confirmLabel,
  onConfirm,
  onCancel,
  pending,
}: {
  open: boolean;
  title: string;
  lines: { label: string; value: string }[];
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  pending?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onCancel} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" }}>
        <View
          style={{
            backgroundColor: colors.paper,
            borderTopLeftRadius: 22,
            borderTopRightRadius: 22,
            padding: 20,
            paddingBottom: 34,
          }}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text variant="title">{title}</Text>
            <Pressable onPress={onCancel} hitSlop={8}>
              <X size={20} color={colors.muted} />
            </Pressable>
          </View>

          <View style={{ marginTop: 16, borderRadius: 14, backgroundColor: colors.mist, padding: 14, gap: 9 }}>
            {lines.map((l) => (
              <View key={l.label} style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                <Text variant="caption" color="muted">
                  {l.label}
                </Text>
                <Text variant="label" color="ink" style={{ flex: 1, textAlign: "right" }} numberOfLines={1}>
                  {l.value}
                </Text>
              </View>
            ))}
          </View>

          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 6, marginTop: 12 }}>
            <AlertCircle size={13} color={colors.muted} style={{ marginTop: 2 }} />
            <Text variant="caption" color="muted" style={{ flex: 1 }}>
              {t("bills.confirmWarning")}
            </Text>
          </View>

          <View style={{ flexDirection: "row", gap: 10, marginTop: 18 }}>
            <Button title={t("common.back")} variant="secondary" onPress={onCancel} style={{ flex: 1 }} />
            <Button title={confirmLabel} onPress={onConfirm} loading={pending} style={{ flex: 1 }} />
          </View>
        </View>
      </View>
    </Modal>
  );
}
