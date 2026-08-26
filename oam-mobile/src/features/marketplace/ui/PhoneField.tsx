import { useState, useMemo } from "react";
import { View, Pressable, Modal, ScrollView, TextInput } from "react-native";
import { ChevronDown, Search, Check } from "lucide-react-native";
import { Text } from "@/shared/ui";
import { colors, fonts } from "@/shared/theme";

/** Common dialling codes, Nigeria first. name + dial code only (no flag glyphs). */
export const COUNTRY_CODES: { name: string; dial: string }[] = [
  { name: "Nigeria", dial: "+234" }, { name: "Ghana", dial: "+233" }, { name: "Kenya", dial: "+254" },
  { name: "South Africa", dial: "+27" }, { name: "Egypt", dial: "+20" }, { name: "Côte d'Ivoire", dial: "+225" },
  { name: "Cameroon", dial: "+237" }, { name: "Senegal", dial: "+221" }, { name: "Tanzania", dial: "+255" },
  { name: "Uganda", dial: "+256" }, { name: "Rwanda", dial: "+250" }, { name: "United Kingdom", dial: "+44" },
  { name: "United States / Canada", dial: "+1" }, { name: "UAE", dial: "+971" }, { name: "Saudi Arabia", dial: "+966" },
  { name: "Qatar", dial: "+974" }, { name: "India", dial: "+91" }, { name: "China", dial: "+86" },
  { name: "Germany", dial: "+49" }, { name: "France", dial: "+33" }, { name: "Italy", dial: "+39" },
  { name: "Spain", dial: "+34" }, { name: "Netherlands", dial: "+31" }, { name: "Türkiye", dial: "+90" },
  { name: "Brazil", dial: "+55" }, { name: "Australia", dial: "+61" },
];

const DIALS = [...COUNTRY_CODES.map((c) => c.dial)].sort((a, b) => b.length - a.length);

function parseInitial(initial?: string): { dial: string; local: string } {
  const v = (initial ?? "").trim();
  if (v.startsWith("+")) {
    const match = DIALS.find((d) => v.startsWith(d));
    if (match) return { dial: match, local: v.slice(match.length).replace(/\D/g, "") };
  }
  return { dial: "+234", local: v.replace(/\D/g, "").replace(/^0+/, "") };
}

/** Phone entry with a country-code picker. Emits full E.164, e.g. +2348012345678. */
export function PhoneField({
  label, initial, onChange, placeholder = "Phone number",
}: {
  label?: string; initial?: string; onChange: (full: string) => void; placeholder?: string;
}) {
  const start = useMemo(() => parseInitial(initial), [initial]);
  const [dial, setDial] = useState(start.dial);
  const [local, setLocal] = useState(start.local);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  function emit(nextDial: string, nextLocal: string) {
    const digits = nextLocal.replace(/\D/g, "").replace(/^0+/, "");
    onChange(digits ? `${nextDial}${digits}` : "");
  }

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? COUNTRY_CODES.filter((c) => c.name.toLowerCase().includes(s) || c.dial.includes(s)) : COUNTRY_CODES;
  }, [q]);

  return (
    <View style={{ marginBottom: 16 }}>
      {label ? <Text variant="label" color="ink" style={{ marginBottom: 6 }}>{label}</Text> : null}
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable onPress={() => { setOpen(true); setQ(""); }} style={{ height: 48, borderRadius: 12, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.mist, flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12 }}>
          <Text variant="body" color="ink">{dial}</Text>
          <ChevronDown size={16} color={colors.muted} />
        </Pressable>
        <View style={{ flex: 1, height: 48, borderRadius: 12, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.mist, justifyContent: "center", paddingHorizontal: 14 }}>
          <TextInput
            value={local}
            onChangeText={(t) => { const v = t.replace(/[^\d]/g, ""); setLocal(v); emit(dial, v); }}
            keyboardType="phone-pad"
            placeholder={placeholder}
            placeholderTextColor={colors.muted}
            style={{ height: 48, fontFamily: fonts.regular, fontSize: 15, color: colors.ink }}
          />
        </View>
      </View>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable onPress={() => setOpen(false)} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" }}>
          <Pressable onPress={() => {}} style={{ backgroundColor: colors.paper, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingTop: 16, paddingBottom: 24, maxHeight: "72%" }}>
            <Text variant="title" style={{ paddingHorizontal: 20, marginBottom: 10 }}>Country code</Text>
            <View style={{ marginHorizontal: 20, marginBottom: 8, height: 44, borderRadius: 10, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.mist, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12 }}>
              <Search size={15} color={colors.muted} />
              <TextInput value={q} onChangeText={setQ} autoFocus placeholder="Search country" placeholderTextColor={colors.muted} style={{ flex: 1, height: 44, fontFamily: fonts.regular, fontSize: 15, color: colors.ink }} />
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">
              {filtered.map((c) => {
                const sel = c.dial === dial && true;
                return (
                  <Pressable key={c.name} onPress={() => { setDial(c.dial); emit(c.dial, local); setOpen(false); }} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.hairline }}>
                    <Text variant="body" color="ink">{c.name}</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Text variant="label" color="muted">{c.dial}</Text>
                      {sel ? <Check size={16} strokeWidth={2.5} color={colors.brand.green} /> : null}
                    </View>
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
