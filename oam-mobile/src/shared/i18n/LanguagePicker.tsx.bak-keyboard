import { useMemo, useState } from "react";
import { View, Pressable, Modal, ScrollView, TextInput } from "react-native";
import { useTranslation } from "react-i18next";
import { Globe, Check, Search, ChevronRight, X } from "lucide-react-native";
import { Text } from "@/shared/ui";
import { colors, fonts } from "@/shared/theme";
import { LANGUAGES, setLanguage } from "@/shared/i18n";

/**
 * Language selector. Two looks:
 *  - variant="compact"  → a small pill (globe + native name) for the auth header
 *  - variant="row"      → a full-width settings row for the Profile tab
 */
export function LanguagePicker({ variant = "row", onDark = false }: { variant?: "compact" | "row"; onDark?: boolean }) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const base = (i18n.language || "en").split("-")[0];
  const active = LANGUAGES.find((l) => l.code === base) ?? LANGUAGES[0];

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? LANGUAGES.filter((l) => l.label.toLowerCase().includes(s) || l.native.toLowerCase().includes(s)) : LANGUAGES;
  }, [q]);

  async function choose(code: string) {
    await setLanguage(code);
    setOpen(false);
    setQ("");
  }

  const trigger =
    variant === "compact" ? (
      <Pressable
        onPress={() => setOpen(true)}
        hitSlop={6}
        style={{ flexDirection: "row", alignItems: "center", gap: 6, height: 36, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: onDark ? "rgba(255,255,255,0.25)" : colors.hairline, backgroundColor: onDark ? "rgba(255,255,255,0.08)" : colors.paper }}
      >
        <Globe size={15} strokeWidth={1.75} color={onDark ? "#FFF" : colors.ink} />
        <Text variant="caption" style={{ color: onDark ? "#FFF" : colors.ink }}>{active.native}</Text>
      </Pressable>
    ) : (
      <Pressable
        onPress={() => setOpen(true)}
        style={{ flexDirection: "row", alignItems: "center", gap: 12, height: 56, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper }}
      >
        <View style={{ height: 34, width: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(11,115,39,0.10)" }}>
          <Globe size={17} strokeWidth={1.75} color={colors.brand.green} />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="label" color="ink">{t("language.label")}</Text>
          <Text variant="caption" color="muted">{active.native}</Text>
        </View>
        <ChevronRight size={18} color={colors.muted} />
      </Pressable>
    );

  return (
    <>
      {trigger}
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable onPress={() => setOpen(false)} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" }}>
          <Pressable onPress={() => {}} style={{ backgroundColor: colors.paper, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingTop: 16, paddingBottom: 24, maxHeight: "82%" }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, marginBottom: 10 }}>
              <Text variant="heading" style={{ fontSize: 18 }}>{t("language.select")}</Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={8}><X size={20} color={colors.muted} /></Pressable>
            </View>
            <View style={{ marginHorizontal: 20, marginBottom: 8, height: 44, borderRadius: 10, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.mist, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12 }}>
              <Search size={15} color={colors.muted} />
              <TextInput value={q} onChangeText={setQ} placeholder={t("language.searchPlaceholder")} placeholderTextColor={colors.muted} style={{ flex: 1, height: 44, fontFamily: fonts.regular, fontSize: 15, color: colors.ink }} />
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">
              {filtered.map((l) => {
                const sel = l.code === active.code;
                return (
                  <Pressable key={l.code} onPress={() => choose(l.code)} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.hairline }}>
                    <View>
                      <Text variant="label" color="ink">{l.native}</Text>
                      <Text variant="caption" color="muted">{l.label}</Text>
                    </View>
                    {sel ? <Check size={18} strokeWidth={2.5} color={colors.brand.green} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
