import { useState } from "react";
import { View, Pressable, TextInput } from "react-native";
import { X } from "lucide-react-native";
import { Text } from "@/shared/ui";
import { colors, fonts } from "@/shared/theme";
import { useTranslation } from "react-i18next";

/** Tag input: type a skill and tap "done"/comma to add it; tap × to remove. */
export function SkillInput({ value, onChange, max = 30, placeholder }: {
  value: string[]; onChange: (v: string[]) => void; max?: number; placeholder?: string;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState("");
  function add(raw: string) {
    const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
    if (!parts.length) return;
    const lower = new Set(value.map((v) => v.toLowerCase()));
    const next = [...value];
    for (const p of parts) if (!lower.has(p.toLowerCase()) && next.length < max) { next.push(p); lower.add(p.toLowerCase()); }
    onChange(next);
    setDraft("");
  }
  return (
    <View style={{ borderRadius: 12, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.mist, padding: 8, gap: 8 }}>
      {value.length ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {value.map((s) => (
            <View key={s} style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingLeft: 10, paddingRight: 6, height: 30, borderRadius: 8, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.hairline }}>
              <Text variant="caption">{s}</Text>
              <Pressable onPress={() => onChange(value.filter((v) => v !== s))} hitSlop={8} accessibilityLabel={t("jobs.skillInput.removeS", { s })}>
                <X size={13} color={colors.muted} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}
      <TextInput
        value={draft}
        onChangeText={(v) => (v.endsWith(",") ? add(v) : setDraft(v))}
        onSubmitEditing={() => add(draft)}
        onBlur={() => add(draft)}
        blurOnSubmit={false}
        returnKeyType="done"
        placeholder={placeholder ?? t("jobs.skillInput.placeholder")}
        placeholderTextColor={colors.muted}
        style={{ height: 36, paddingHorizontal: 6, fontFamily: fonts.regular, fontSize: 15, color: colors.ink }}
      />
    </View>
  );
}
