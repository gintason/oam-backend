import { Text as RNText, type TextProps as RNTextProps } from "react-native";
import { colors } from "@/shared/theme/colors";
import { fonts, fontSize } from "@/shared/theme/typography";

type Variant = "display" | "heading" | "title" | "body" | "label" | "caption" | "mono";
type ColorKey = "ink" | "muted" | "green" | "red" | "danger" | "warn" | "paper";

const VARIANT: Record<Variant, { family: string; size: number }> = {
  display: { family: fonts.display, size: fontSize.display },
  heading: { family: fonts.display, size: fontSize.heading },
  title:   { family: fonts.bold,    size: fontSize.title },
  body:    { family: fonts.regular, size: fontSize.body },
  label:   { family: fonts.medium,  size: fontSize.label },
  caption: { family: fonts.regular, size: fontSize.caption },
  mono:    { family: fonts.mono,    size: fontSize.label },
};

const COLOR: Record<ColorKey, string> = {
  ink: colors.ink,
  muted: colors.muted,
  green: colors.brand.green,
  red: colors.brand.red,
  danger: colors.danger,
  warn: colors.warn,
  paper: colors.paper,
};

export type AppTextProps = RNTextProps & {
  variant?: Variant;
  color?: ColorKey;
};

/**
 * Brand-aware Text. Use `variant` + `color` for type/colour; use `className`
 * only for layout (margins, alignment) to avoid colour/font conflicts.
 *   <Text variant="heading">Wallet</Text>
 *   <Text variant="body" color="muted">Available balance</Text>
 */
export function Text({ variant = "body", color = "ink", style, ...rest }: AppTextProps) {
  const v = VARIANT[variant];
  return (
    <RNText
      style={[{ fontFamily: v.family, fontSize: v.size, color: COLOR[color] }, style]}
      {...rest}
    />
  );
}
