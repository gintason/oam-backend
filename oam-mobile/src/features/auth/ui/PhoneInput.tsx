import { useMemo, useState } from "react";
import { View, Pressable, Modal, ScrollView, TextInput } from "react-native";
import { ChevronDown, Search, X } from "lucide-react-native";
import { Text } from "@/shared/ui";
import { colors, fonts } from "@/shared/theme";
import { COUNTRIES, type Country } from "./countries";

/**
 * Phone field with a country-code selector. Tapping the flag/code opens a
 * searchable list of every country; the chosen dial code is combined with the
 * local number. onChangeText reports the full E.164-style number (e.g. +2348012345678).
 * Note: flag emoji render on iOS; on Android they fall back to the 2-letter code,
 * which stays informative alongside the country name and dial code.
 */
export function PhoneInput({
  label, valueLocal, onChangeLocal, onChangeFull, country, onChangeCountry, placeholder,
}: {
  label: string;
  valueLocal: string;
  onChangeLocal: (local: string) => void;
  onChangeFull: (full: string) => void;
  country: Country;
  onChangeCountry: (c: Country) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? COUNTRIES.filter((c) => c.name.toLowerCase().includes(q) || c.dial.includes(q)) : COUNTRIES;
  }, [search]);

  function setLocal(v: string) {
    const local = v.replace(/[^\d]/g, "");
    onChangeLocal(local);
    onChangeFull(`+${country.dial}${local}`);
  }
  function pick(c: Country) {
    onChangeCountry(c);
    onChangeFull(`+${c.dial}${valueLocal}`);
    setOpen(false); setSearch("");
  }

  return (
    <View style={{ marginBottom: 6 }}>
      <Text variant="label" style={{ marginBottom: 8 }}>{label}</Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable
          onPress={() => setOpen(true)}
          style={{ height: 52, borderRadius: 12, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.mist, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12 }}
        >
          <Text style={{ fontSize: 18 }}>{country.flag}</Text>
          <Text variant="body" color="ink">+{country.dial}</Text>
          <ChevronDown size={16} color={colors.muted} />
        </Pressable>
        <View style={{ flex: 1, height: 52, borderRadius: 12, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.mist, justifyContent: "center", paddingHorizontal: 14 }}>
          <TextInput
            value={valueLocal}
            onChangeText={setLocal}
            keyboardType="phone-pad"
            placeholder={placeholder || "8012345678"}
            placeholderTextColor={colors.muted}
            style={{ fontFamily: fonts.regular, fontSize: 15, color: colors.ink }}
          />
        </View>
      </View>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable onPress={() => setOpen(false)} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" }}>
          <Pressable onPress={() => {}} style={{ backgroundColor: colors.paper, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingTop: 16, paddingBottom: 24, maxHeight: "80%" }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, marginBottom: 10 }}>
              <Text variant="title">Select country</Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={8}><X size={20} color={colors.muted} /></Pressable>
            </View>
            <View style={{ marginHorizontal: 20, marginBottom: 8, height: 44, borderRadius: 10, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.mist, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12 }}>
              <Search size={15} color={colors.muted} />
              <TextInput value={search} onChangeText={setSearch} autoFocus placeholder="Search country or code" placeholderTextColor={colors.muted} style={{ flex: 1, height: 44, fontFamily: fonts.regular, fontSize: 15, color: colors.ink }} />
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">
              {list.map((c) => (
                <Pressable key={c.iso} onPress={() => pick(c)} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.hairline }}>
                  <Text style={{ fontSize: 20 }}>{c.flag}</Text>
                  <Text variant="body" color="ink" style={{ flex: 1 }}>{c.name}</Text>
                  <Text variant="body" color="muted">+{c.dial}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
