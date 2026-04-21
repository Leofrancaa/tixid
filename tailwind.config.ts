import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0b0b12",
        parchment: "#f6f1e5",
        dixit: {
          purple: "#3d2b6e",
          gold: "#d4a84b",
          rose: "#c8536d",
        },
      },
      fontFamily: {
        serif: ["Georgia", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;
