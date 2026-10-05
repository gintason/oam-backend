import { useState, useMemo } from "react";
import { View, Pressable, Modal, ScrollView, TextInput } from "react-native";
import { ChevronDown, Search, Check } from "lucide-react-native";
import { Text } from "@/shared/ui";
import { colors, fonts } from "@/shared/theme";

export type PickerOption = { value: string; label: string; sub?: string };

export function PickerField({
  label, value, options, onSelect, placeholder = "Select", searchable = true, title = "Choose",
}: {
  label?: string; value: string; options: PickerOption[]; onSelect: (value: string) => void;
  placeholder?: string; searchable?: boolean; title?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const selected = options.find((o) => o.value === value);
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? options.filter((o) => o.label.toLowerCase().includes(s) || o.value.toLowerCase().includes(s) || (o.sub ?? "").toLowerCase().includes(s)) : options;
  }, [q, options]);

  return (
    <View>
      {label ? <Text variant="label" style={{ marginBottom: 8 }}>{label}</Text> : null}
      <Pressable onPress={() => { setOpen(true); setQ(""); }} style={{ height: 48, borderRadius: 12, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.mist, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14 }}>
        <Text variant="body" color={selected ? "ink" : "muted"} numberOfLines={1} style={{ flex: 1 }}>{selected?.label ?? placeholder}</Text>
        <ChevronDown size={18} color={colors.muted} />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable onPress={() => setOpen(false)} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" }}>
          <Pressable onPress={() => {}} style={{ backgroundColor: colors.paper, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingTop: 16, paddingBottom: 24, maxHeight: "78%" }}>
            <Text variant="title" style={{ paddingHorizontal: 20, marginBottom: 10 }}>{title}</Text>
            {searchable ? (
              <View style={{ marginHorizontal: 20, marginBottom: 8, height: 44, borderRadius: 10, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.mist, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12 }}>
                <Search size={15} color={colors.muted} />
                <TextInput value={q} onChangeText={setQ} autoFocus placeholder="Search" placeholderTextColor={colors.muted} style={{ flex: 1, height: 44, fontFamily: fonts.regular, fontSize: 15, color: colors.ink }} />
              </View>
            ) : null}
            <ScrollView keyboardShouldPersistTaps="handled">
              {filtered.map((o) => {
                const sel = o.value === value;
                return (
                  <Pressable key={o.value} onPress={() => { onSelect(o.value); setOpen(false); }} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.hairline }}>
                    <View style={{ flex: 1 }}>
                      <Text variant="body" color={sel ? "green" : "ink"}>{o.label}</Text>
                      {o.sub ? <Text variant="caption" color="muted">{o.sub}</Text> : null}
                    </View>
                    {sel ? <Check size={18} strokeWidth={2.5} color={colors.brand.green} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
