import { View, Pressable } from "react-native";
import { Delete } from "lucide-react-native";
import { Text } from "@/shared/ui";
import { colors } from "@/shared/theme";

type Props = {
  value: string;
  onChange: (next: string) => void;
  length?: number;
  error?: boolean;
};

/** 4-digit style PIN entry: filled dots on top, a 1-9 / 0 / delete keypad below. */
export function PinPad({ value, onChange, length = 4, error = false }: Props) {
  const press = (d: string) => { if (value.length < length) onChange(value + d); };
  const back = () => onChange(value.slice(0, -1));

  return (
    <View>
      {/* dots */}
      <View style={{ flexDirection: "row", justifyContent: "center", gap: 20, marginBottom: 40 }}>
        {Array.from({ length }).map((_, i) => {
          const filled = i < value.length;
          const ring = error ? colors.danger : colors.brand.green;
          return (
            <View key={i} style={{ height: 18, width: 18, borderRadius: 9, borderWidth: 2, borderColor: ring, backgroundColor: filled ? ring : "transparent" }} />
          );
        })}
      </View>

      {/* keypad */}
      <View style={{ gap: 18 }}>
        {[["1", "2", "3"], ["4", "5", "6"], ["7", "8", "9"]].map((row) => (
          <View key={row[0]} style={{ flexDirection: "row", justifyContent: "center", gap: 22 }}>
            {row.map((d) => <Key key={d} label={d} onPress={() => press(d)} />)}
          </View>
        ))}
        <View style={{ flexDirection: "row", justifyContent: "center", gap: 22 }}>
          <View style={{ height: 74, width: 74 }} />
          <Key label="0" onPress={() => press("0")} />
          <Key onPress={back} icon />
        </View>
      </View>
    </View>
  );
}

function Key({ label, onPress, icon }: { label?: string; onPress: () => void; icon?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        height: 74, width: 74, borderRadius: 37, alignItems: "center", justifyContent: "center",
        backgroundColor: pressed ? colors.hairline : colors.mist,
      })}
    >
      {icon ? <Delete size={24} strokeWidth={1.75} color={colors.ink} /> : <Text style={{ fontSize: 26, color: colors.ink }}>{label}</Text>}
    </Pressable>
  );
}
