import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#080810",
        parchment: "#F2ECD8",
        dixit: {
          purple: "#2D2B45",
          gold: "#C9A84C",
          rose: "#7A2C44",
        },
        table: {
          felt: "#0E0D1A",
          border: "#2A2540",
          glow: "#C9A84C",
        },
      },
      fontFamily: {
        display: ["var(--font-cinzel)", "serif"],
        serif: ["var(--font-lora)", "Georgia", "serif"],
        label: ["var(--font-josefin)", "sans-serif"],
      },
      animation: {
        "fade-in": "fadeIn 0.9s ease both",
        "fade-up": "fadeUp 0.7s ease both",
        "fade-up-d1": "fadeUp 0.7s 0.1s ease both",
        "fade-up-d2": "fadeUp 0.7s 0.2s ease both",
        "fade-up-d3": "fadeUp 0.7s 0.35s ease both",
        "fade-up-d4": "fadeUp 0.7s 0.5s ease both",
        "float": "float 7s ease-in-out infinite",
        "pulse-glow": "pulseGlow 3s ease-in-out infinite",
        "shimmer": "shimmer 2.5s linear infinite",
        "bar-grow": "barGrow 1s ease both",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        fadeUp: {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-5px)" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(201, 168, 76, 0.15)" },
          "50%": { boxShadow: "0 0 40px rgba(201, 168, 76, 0.35)" },
        },
        shimmer: {
          from: { backgroundPosition: "-200% center" },
          to: { backgroundPosition: "200% center" },
        },
        barGrow: {
          from: { width: "0%" },
          to: { width: "var(--bar-width)" },
        },
      },
      backgroundImage: {
        "gold-shimmer":
          "linear-gradient(90deg, #C9A84C 0%, #F0D080 40%, #C9A84C 60%, #A07830 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
