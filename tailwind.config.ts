import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: [
          "var(--font-mono)",
          "ui-monospace",
          "SFMono-Regular",
          "monospace",
        ],
      },
      colors: {
        // Deep navy — primary action / brand ink.
        ink: {
          50: "#f4f7fa",
          100: "#e6ecf3",
          200: "#c8d5e4",
          300: "#9db1c9",
          400: "#6c87a9",
          500: "#4d6a8e",
          600: "#3c5475",
          700: "#314460",
          800: "#283851",
          900: "#1b2638",
          950: "#0f1623",
        },
        // Sage — secondary accent, drafting feel.
        sage: {
          50: "#f3f7f4",
          100: "#e2ece5",
          200: "#c5d8cb",
          300: "#9cbaa6",
          400: "#73997f",
          500: "#577e64",
          600: "#43644f",
          700: "#365142",
          800: "#2d4137",
          900: "#26352e",
        },
        // Warm paper tones — canvas / surface backgrounds.
        paper: {
          50: "#fbfaf6",
          100: "#f6f3ea",
          200: "#ece6d4",
          300: "#dcd1b3",
          400: "#c4b487",
          500: "#a8985f",
          600: "#8a7d4d",
          700: "#6e6240",
          800: "#544a31",
          900: "#3a3322",
        },
        // Konva canvas tokens (kept for component refs).
        canvas: {
          bg: "#faf8f1",
          grid: "#e8e1cd",
          gridStrong: "#d6cdb3",
          wall: "#1b2638",
          room: "#fffdf7",
        },
      },
      boxShadow: {
        soft: "0 1px 2px 0 rgb(15 22 35 / 0.04), 0 1px 3px 0 rgb(15 22 35 / 0.06)",
        card: "0 1px 2px 0 rgb(15 22 35 / 0.04), 0 4px 12px -2px rgb(15 22 35 / 0.08)",
        pop: "0 10px 24px -8px rgb(15 22 35 / 0.18), 0 4px 8px -2px rgb(15 22 35 / 0.08)",
        ring: "0 0 0 1px rgb(15 22 35 / 0.06)",
      },
      borderRadius: {
        DEFAULT: "0.5rem",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.97)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "fade-in": "fade-in 180ms ease-out",
        "scale-in": "scale-in 160ms ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
