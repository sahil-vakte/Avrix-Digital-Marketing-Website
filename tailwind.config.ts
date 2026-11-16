import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef4ff",
          100: "#dbe7ff",
          200: "#bcd2ff",
          300: "#8eb3ff",
          400: "#5a89fb",
          500: "#3563f2",
          600: "#2347d6",
          700: "#1e39ad",
          800: "#1e3488",
          900: "#1d2f6b",
          950: "#121c40",
        },
        accent: { 400: "#ffb547", 500: "#ff9f1c", 600: "#e5860a" },
        ink: { 900: "#0b1220", 700: "#2b3445", 500: "#5b6475", 300: "#a3abba" },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
      },
      boxShadow: { card: "0 1px 2px rgba(16,24,40,.06), 0 8px 24px -12px rgba(16,24,40,.18)" },
    },
  },
  plugins: [],
} satisfies Config;
