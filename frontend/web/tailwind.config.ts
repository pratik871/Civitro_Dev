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
        saffron: {
          DEFAULT: "#FF6B35",
          50: "#FFF3EE",
          100: "#FFE4D6",
          200: "#FFC9AD",
          300: "#FFAE85",
          400: "#FF8C5C",
          500: "#FF6B35",
          600: "#E55A24",
          700: "#CC4A14",
          800: "#993A10",
          900: "#662A0D",
        },
        navy: {
          DEFAULT: "#0B1426",
          light: "#1A2D4A",
          50: "#E8ECF2",
          100: "#C5CEE0",
          200: "#8FA0C1",
          300: "#5A72A3",
          400: "#2E4570",
          500: "#1A2D4A",
          600: "#0B1426",
          700: "#080F1C",
          800: "#050A13",
          900: "#030609",
        },
        success: "#059669",
        error: "#DC2626",
        info: "#2563EB",
        warning: "#D97706",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      borderRadius: {
        card: "16px",
        btn: "12px",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-in-out",
        "slide-in": "slideIn 0.3s ease-out",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideIn: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
