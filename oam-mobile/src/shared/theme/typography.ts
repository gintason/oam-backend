/**
 * Typography tokens.
 *   sans    -> Satoshi
 *   display -> Clash Display (headings)  [Bold + Medium available]
 *   mono    -> Geist Mono
 */
export const fonts = {
  regular: "Satoshi-Regular",
  medium: "Satoshi-Medium",
  bold: "Satoshi-Bold",
  display: "ClashDisplay-Bold",
  displayMedium: "ClashDisplay-Medium",
  mono: "GeistMono_400Regular",
} as const;

export const fontSize = {
  xs: 12,
  sm: 13,
  base: 15,
  md: 16,
  lg: 18,
  xl: 22,
  "2xl": 28,
  "3xl": 34,
} as const;

export type FontSizeToken = keyof typeof fontSize;
