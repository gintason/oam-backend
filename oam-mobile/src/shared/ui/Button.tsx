/** Primary/secondary/ghost button with a loading state. 52pt tall, full width. */
import { Pressable, ActivityIndicator, type PressableProps, type ViewStyle } from "react-native";
import { Text, type TextColor } from "./Text";
import { colors } from "../theme/colors";

export type ButtonVariant = "primary" | "secondary" | "ghost";

export type ButtonProps = Omit<PressableProps, "children" | "style"> & {
  title: string;
  loading?: boolean;
  variant?: ButtonVariant;
  style?: ViewStyle;
};

export function Button({
  title,
  loading,
  disabled,
  variant = "primary",
  style,
  ...rest
}: ButtonProps) {
  const isDisabled = Boolean(disabled) || Boolean(loading);

  const bg =
    variant === "primary" ? colors.brand.red : variant === "secondary" ? colors.mist : "transparent";
  const fg: TextColor = variant === "primary" ? "paper" : variant === "ghost" ? "green" : "ink";

  return (
    <Pressable
      {...rest}
      disabled={isDisabled}
      android_ripple={{ color: "rgba(0,0,0,0.08)" }}
      style={[
        {
          width: "100%",
          height: 52,
          borderRadius: 12,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: bg,
          borderWidth: variant === "secondary" ? 1 : 0,
          borderColor: colors.hairline,
          opacity: isDisabled ? 0.55 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" ? "#FFFFFF" : colors.brand.green} />
      ) : (
        <Text variant="label" color={fg}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}
