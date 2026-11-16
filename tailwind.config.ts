import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  // Dark mode is scoped to the public website only (elements inside .site-root),
  // so the admin panel is never affected by the visitor's theme choice.
  darkMode: ["variant", 'html[data-site-theme="dark"] .site-root &'],
  theme: {
    extend: {
      colors: {
        // Public-site theme tokens (CSS variables defined under .site-root in globals.css)
        s: {
          bg: "rgb(var(--s-bg) / <alpha-value>)",
          soft: "rgb(var(--s-soft) / <alpha-value>)",
          surface: "rgb(var(--s-surface) / <alpha-value>)",
          raised: "rgb(var(--s-raised) / <alpha-value>)",
          fg: "rgb(var(--s-fg) / <alpha-value>)",
          muted: "rgb(var(--s-muted) / <alpha-value>)",
          line: "rgb(var(--s-line) / <alpha-value>)",
          primary: "rgb(var(--s-primary) / <alpha-value>)",
          cyan: "rgb(var(--s-cyan) / <alpha-value>)",
          violet: "rgb(var(--s-violet) / <alpha-value>)",
          amber: "rgb(var(--s-amber) / <alpha-value>)",
          green: "rgb(var(--s-green) / <alpha-value>)",
        },
        navy: { 950: "#040815", 900: "#070d22", 850: "#0a1230", 800: "#0e1a40", 700: "#162657" },
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
      boxShadow: {
        card: "0 1px 2px rgba(16,24,40,.06), 0 8px 24px -12px rgba(16,24,40,.18)",
        glow: "0 0 0 1px rgba(77,124,255,.25), 0 12px 40px -12px rgba(37,99,235,.55)",
        soft: "0 1px 2px rgba(15,23,42,.04), 0 12px 32px -16px rgba(15,23,42,.18)",
      },
      keyframes: {
        "s-float": { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-10px)" } },
        "s-spin": { to: { transform: "rotate(360deg)" } },
        "s-spin-rev": { to: { transform: "rotate(-360deg)" } },
        "s-pulse": { "0%,100%": { opacity: "0.55", transform: "scale(1)" }, "50%": { opacity: "1", transform: "scale(1.06)" } },
        "s-dash": { to: { strokeDashoffset: "-200" } },
        "s-marquee": { to: { transform: "translateX(-50%)" } },
        "s-shimmer": { "0%": { backgroundPosition: "0% 50%" }, "100%": { backgroundPosition: "200% 50%" } },
        "s-pop": { "0%": { opacity: "0", transform: "translateY(10px) scale(.96)" }, "100%": { opacity: "1", transform: "none" } },
        "s-grow": { from: { transform: "scaleY(0)" }, to: { transform: "scaleY(1)" } },
        "s-blink": { "0%,100%": { opacity: ".2" }, "50%": { opacity: "1" } },
      },
      animation: {
        "s-float": "s-float 6s ease-in-out infinite",
        "s-float-slow": "s-float 9s ease-in-out infinite",
        "s-spin": "s-spin 40s linear infinite",
        "s-spin-rev": "s-spin-rev 60s linear infinite",
        "s-pulse": "s-pulse 3.2s ease-in-out infinite",
        "s-dash": "s-dash 6s linear infinite",
        "s-marquee": "s-marquee 38s linear infinite",
        "s-shimmer": "s-shimmer 6s linear infinite",
        "s-pop": "s-pop .5s cubic-bezier(.2,.7,.2,1) both",
        "s-blink": "s-blink 1.2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
