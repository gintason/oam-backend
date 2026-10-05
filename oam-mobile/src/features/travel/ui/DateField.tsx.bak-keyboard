import { useState } from "react";
import { View, Pressable, Platform, Modal } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Calendar } from "lucide-react-native";
import { Text, Button } from "@/shared/ui";
import { colors } from "@/shared/theme";

const fmt = (d: Date) => d.toISOString().slice(0, 10);
const parse = (v?: string) => (v ? new Date(v + "T00:00:00") : undefined);

export function DateField({
  label, value, onChange, minimumDate, placeholder = "Select date",
}: {
  label?: string; value: string; onChange: (v: string) => void; minimumDate?: Date; placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  const [temp, setTemp] = useState<Date>(parse(value) ?? minimumDate ?? new Date());

  function openPicker() {
    setTemp(parse(value) ?? minimumDate ?? new Date());
    setShow(true);
  }

  return (
    <View>
      {label ? <Text variant="label" style={{ marginBottom: 8 }}>{label}</Text> : null}
      <Pressable onPress={openPicker} style={{ height: 48, borderRadius: 12, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.mist, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14 }}>
        <Calendar size={16} color={colors.muted} />
        <Text variant="body" color={value ? "ink" : "muted"}>{value || placeholder}</Text>
      </Pressable>

      {Platform.OS === "android" && show ? (
        <DateTimePicker
          value={temp}
          mode="date"
          minimumDate={minimumDate}
          onChange={(e, d) => {
            setShow(false);
            if (e.type === "set" && d) onChange(fmt(d));
          }}
        />
      ) : null}

      {Platform.OS === "ios" ? (
        <Modal visible={show} transparent animationType="slide" onRequestClose={() => setShow(false)}>
          <Pressable onPress={() => setShow(false)} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}>
            <Pressable onPress={() => {}} style={{ backgroundColor: colors.paper, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 16 }}>
              <DateTimePicker value={temp} mode="date" display="spinner" minimumDate={minimumDate} onChange={(_, d) => { if (d) setTemp(d); }} />
              <Button title="Done" onPress={() => { onChange(fmt(temp)); setShow(false); }} />
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </View>
  );
}
