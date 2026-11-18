import { Pressable } from "react-native";
import { Text } from "@/shared/ui";
import { colors } from "@/shared/theme";

/** Selectable pill used by the Education and ePIN screens. */
export function Chip({ label, sub, active, disabled, onPress, flex }: {
  label: string; sub?: string; active?: boolean; disabled?: boolean; onPress: () => void; flex?: boolean;
}) {
  return (
    <Pressable onPress={onPress} disabled={disabled}
               style={{ flex: flex ? 1 : undefined, minHeight: 46, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1,
                        borderColor: active ? colors.brand.green : colors.hairline,
                        backgroundColor: active ? "rgba(11,115,39,0.08)" : colors.paper,
                        alignItems: "center", justifyContent: "center", opacity: disabled ? 0.4 : 1 }}>
      <Text variant="label" color={active ? "green" : "ink"}>{label}</Text>
      {sub ? <Text variant="caption" color="muted" style={{ fontSize: 10 }}>{sub}</Text> : null}
    </Pressable>
  );
}
