/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      screens: {
        xs: '400px',
      },
      colors: {
        // ---- OAM brand (from the logo) — these are the ONLY brand colours ----
        brand: {
          black: "#111111", // primary text, structure, eagle
          red: "#E31012",   // CTAs, brand accents — NEVER errors
          green: "#0B7327", // success, money-in, trust
        },
        // Neutrals — plain greys, no blue tint
        paper: "#FFFFFF",   // dominant surface (~75%)
        mist: "#F8FAFC",    // sub-panels, input fills
        hairline: "#E5E7EB",// 1px borders
        muted: "#6B7280",   // secondary text
        ink: "#111111",     // deepest text (same as brand black)
        // System states (deliberately NOT brand red)
        danger: "#9F1239",  // errors — dark crimson
        warn: "#B45309",    // warnings — amber
        // Hero backdrop
        night: "#0B1220",   // dimmed hero field
      },
      fontFamily: {
        sans: ["Satoshi", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        display: ["'Clash Display'", "Satoshi", "system-ui", "sans-serif"],
        mono: ["'Geist Mono'", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      keyframes: {
        drift: {
          from: { transform: "translate(0, 0)" },
          to: { transform: "translate(var(--drift-x), var(--drift-y))" },
        },
        riseIn: {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        drift: "drift var(--drift-dur, 28s) ease-in-out infinite alternate",
        riseIn: "riseIn 620ms cubic-bezier(.2,.7,.2,1) forwards",
      },
    },
  },
  plugins: [],
};
