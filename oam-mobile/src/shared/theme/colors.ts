export const colors = {
  brand: { black: "#111111", red: "#E31012", green: "#0B7327" },
  paper: "#FFFFFF",
  mist: "#F8FAFC",
  hairline: "#E5E7EB",
  muted: "#6B7280",
  ink: "#111111",
  danger: "#9F1239",
  warn: "#B45309",
  night: "#0B1220",
} as const;

export type ColorToken = typeof colors;
