/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["selector", '[data-theme="dark"]'],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--color-bg)",
        surface: "var(--color-surface)",
        surface2: "var(--color-surface2)",
        copper: "var(--color-copper)",
        teal: "var(--color-teal)",
        amber: "var(--color-amber)",
        danger: "var(--color-danger)",
        muted: "var(--color-muted)",
        ink: "var(--color-ink)",
      },
    },
  },
  plugins: [],
};
