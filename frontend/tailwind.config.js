/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: { sans: ["Inter", "system-ui", "Segoe UI", "sans-serif"], mono: ['"JetBrains Mono"', "ui-monospace", "Consolas", "monospace"] },
      colors: {
        ink: "#05070a", card: "#0c1118", tile: "#070a0f", line: "#1a2331", mute: "#8b97a8", paper: "#f3f6fa",
        mint: "#34d399", teal: "#0d9488", emerald: "#059669", lime: "#86d62b", amber: "#f5b23d", flare: "#fb923c", rose: "#f43f5e", sky: "#38bdf8", violet: "#a78bfa",
      },
      boxShadow: { glow: "0 0 24px rgba(52,211,153,.35)", card: "0 18px 50px rgba(0,0,0,.45)" },
    },
  },
  plugins: [],
};
