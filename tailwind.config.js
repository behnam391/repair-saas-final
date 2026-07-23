/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["selector", '[data-theme="dark"]'],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // bg/surface/border keep their alpha baked into the CSS variable
        // (translucent glass), so no <alpha-value> support on purpose.
        bg: "var(--color-bg)",
        surface: "var(--color-surface)",
        surface2: "var(--color-surface2)",
        border: "var(--color-border)",
        // Accent colors are RGB triples so Tailwind opacity modifiers
        // (bg-copper/15, border-teal/40, ...) actually work.
        copper: "rgb(var(--rgb-copper) / <alpha-value>)",
        copperDeep: "rgb(var(--rgb-copper-deep) / <alpha-value>)",
        teal: "rgb(var(--rgb-teal) / <alpha-value>)",
        amber: "rgb(var(--rgb-amber) / <alpha-value>)",
        danger: "rgb(var(--rgb-danger) / <alpha-value>)",
        muted: "rgb(var(--rgb-muted) / <alpha-value>)",
        ink: "rgb(var(--rgb-ink) / <alpha-value>)",
      },
    },
  },
  plugins: [],
};
