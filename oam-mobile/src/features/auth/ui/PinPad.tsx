import { View, Pressable } from "react-native";
import { Delete } from "lucide-react-native";
import { Text } from "@/shared/ui";
import { colors, fonts } from "@/shared/theme";

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
      <View style={{ flexDirection: "row", justifyContent: "center", gap: 24, marginBottom: 48 }}>
        {Array.from({ length }).map((_, i) => {
          const filled = i < value.length;
          const ring = error ? colors.danger : colors.brand.green;
          return (
            <View key={i} style={{ height: 22, width: 22, borderRadius: 11, borderWidth: 2, borderColor: ring, backgroundColor: filled ? ring : "transparent" }} />
          );
        })}
      </View>

      {/* keypad — even 28pt gaps both ways so the grid reads as a grid */}
      <View style={{ gap: 28, alignItems: "center" }}>
        {[["1", "2", "3"], ["4", "5", "6"], ["7", "8", "9"]].map((row) => (
          <View key={row[0]} style={{ flexDirection: "row", gap: 28 }}>
            {row.map((d) => <Key key={d} label={d} onPress={() => press(d)} />)}
          </View>
        ))}
        <View style={{ flexDirection: "row", gap: 28 }}>
          {/* invisible spacer keeps "0" centred under the "8" column */}
          <View style={{ height: 88, width: 88 }} />
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
        height: 88, width: 88, borderRadius: 44, alignItems: "center", justifyContent: "center",
        backgroundColor: pressed ? colors.hairline : colors.mist,
      })}
    >
      {icon
        ? <Delete size={28} strokeWidth={1.75} color={colors.ink} />
        : <Text style={{ fontFamily: fonts.bold, fontSize: 30, color: colors.ink }}>{label}</Text>}
    </Pressable>
  );
}