import { View, Pressable, useWindowDimensions } from "react-native";
import { Delete } from "lucide-react-native";
import { Text } from "@/shared/ui";
import { colors, fonts } from "@/shared/theme";

type Props = {
  value: string;
  onChange: (next: string) => void;
  length?: number;
  error?: boolean;
};

/** 4-digit PIN entry: filled dots on top, a responsive 1-9 / 0 / delete keypad. */
export function PinPad({ value, onChange, length = 4, error = false }: Props) {
  const press = (d: string) => { if (value.length < length) onChange(value + d); };
  const back = () => onChange(value.slice(0, -1));

  // Size the keys to the screen so three columns always fit with even gaps.
  const { width } = useWindowDimensions();
  const boardW = Math.min(width - 56, 300);      // usable board width, capped
  const gap = 22;
  const key = Math.floor((boardW - gap * 2) / 3); // three keys + two gaps
  const keySize = Math.max(64, Math.min(key, 84));

  const Row = ({ children }: { children: React.ReactNode }) => (
    <View style={{ flexDirection: "row", justifyContent: "center", gap, marginBottom: gap }}>{children}</View>
  );

  return (
    <View style={{ width: boardW, alignSelf: "center" }}>
      {/* dots */}
      <View style={{ flexDirection: "row", justifyContent: "center", gap: 22, marginBottom: 44 }}>
        {Array.from({ length }).map((_, i) => {
          const filled = i < value.length;
          const ring = error ? colors.danger : colors.brand.green;
          return (
            <View key={i} style={{ height: 20, width: 20, borderRadius: 10, borderWidth: 2, borderColor: ring, backgroundColor: filled ? ring : "transparent" }} />
          );
        })}
      </View>

      {[["1", "2", "3"], ["4", "5", "6"], ["7", "8", "9"]].map((row) => (
        <Row key={row[0]}>
          {row.map((d) => <Key key={d} size={keySize} label={d} onPress={() => press(d)} />)}
        </Row>
      ))}
      <Row>
        <View style={{ height: keySize, width: keySize }} />
        <Key size={keySize} label="0" onPress={() => press("0")} />
        <Key size={keySize} onPress={back} icon />
      </Row>
    </View>
  );
}

function Key({ label, onPress, icon, size }: { label?: string; onPress: () => void; icon?: boolean; size: number }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        height: size, width: size, borderRadius: size / 2, alignItems: "center", justifyContent: "center",
        backgroundColor: pressed ? colors.hairline : colors.mist,
      })}
    >
      {icon
        ? <Delete size={26} strokeWidth={1.75} color={colors.ink} />
        : <Text style={{ fontFamily: fonts.bold, fontSize: 28, color: colors.ink }}>{label}</Text>}
    </Pressable>
  );
}
