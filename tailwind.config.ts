import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        space: {
          900: "#0a0a1a",
          800: "#111133",
          700: "#1a1a4d",
        },
        asteroid: {
          brown: "#8B6914",
          gray: "#6B6B6B",
          gold: "#FFD700",
        },
        hud: {
          green: "#00FF88",
          blue: "#00AAFF",
          red: "#FF4444",
          amber: "#FFAA00",
        },
      },
      fontFamily: {
        mono: ["var(--font-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
