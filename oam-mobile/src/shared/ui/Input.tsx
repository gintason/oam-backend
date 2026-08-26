/** Labeled text field with focus ring, error state, and an optional password toggle. */
import { useState } from "react";
import { View, TextInput, Pressable, type TextInputProps } from "react-native";
import { Eye, EyeOff } from "lucide-react-native";
import { Text } from "./Text";
import { colors } from "../theme/colors";
import { fonts, fontSize } from "../theme/typography";

export type InputProps = TextInputProps & {
  label?: string;
  error?: string;
  /** Password field: renders a show/hide toggle. */
  secure?: boolean;
};

export function Input({ label, error, secure, style, onFocus, onBlur, ...rest }: InputProps) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);

  const borderColor = error ? colors.danger : focused ? colors.brand.green : colors.hairline;

  return (
    <View style={{ marginBottom: 16 }}>
      {label ? (
        <Text variant="label" color="ink" style={{ marginBottom: 6 }}>
          {label}
        </Text>
      ) : null}

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          borderWidth: 1,
          borderColor,
          borderRadius: 12,
          backgroundColor: colors.mist,
        }}
      >
        <TextInput
          {...rest}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          secureTextEntry={secure ? hidden : rest.secureTextEntry}
          placeholderTextColor={colors.muted}
          style={[
            {
              flex: 1,
              height: 48, // >= 44pt touch target
              paddingHorizontal: 14,
              fontFamily: fonts.regular,
              fontSize: fontSize.base,
              color: colors.ink,
            },
            style,
          ]}
        />

        {secure ? (
          <Pressable onPress={() => setHidden((h) => !h)} hitSlop={10} style={{ paddingHorizontal: 12 }}>
            {hidden ? <EyeOff size={18} color={colors.muted} /> : <Eye size={18} color={colors.muted} />}
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <Text variant="caption" color="danger" style={{ marginTop: 4 }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
