/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"], // routes live in src/app, components in src
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        brand: { black: "#111111", red: "#E31012", green: "#0B7327" },
        paper: "#FFFFFF",
        mist: "#F8FAFC",
        hairline: "#E5E7EB",
        muted: "#6B7280",
        ink: "#111111",
        danger: "#9F1239",
        warn: "#B45309",
        night: "#0B1220",
      },
      fontFamily: {
        // These names must match the fonts we load in Step 3 (expo-font).
        sans: ["Satoshi", "system-ui"],
        display: ["ClashDisplay", "Satoshi", "system-ui"],
        mono: ["GeistMono", "monospace"],
      },
    },
  },
  plugins: [],
};