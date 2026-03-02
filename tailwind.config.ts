import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Inter", "system-ui", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        rarity: {
          common: "hsl(var(--common))",
          uncommon: "hsl(var(--uncommon))",
          rare: "hsl(var(--rare))",
          epic: "hsl(var(--epic))",
          legendary: "hsl(var(--legendary))",
        },
        xp: {
          bar: "hsl(var(--xp-bar))",
          bg: "hsl(var(--xp-bar-bg))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        soft: "0 8px 30px rgba(15, 23, 42, 0.10)",
      },
      animation: {
        "slide-in": "slideIn 0.3s ease-out",
        "level-up": "levelUp 0.8s ease-out",
        achievement: "achievement 0.5s ease-out",
        "coin-collect": "coinCollect 0.6s ease-out",
        "xp-gain": "xpGain 0.4s ease-out",
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
        shimmer: "shimmer 2s linear infinite",
        float: "float 3s ease-in-out infinite",
      },
      keyframes: {
        slideIn: {
          "0%": { transform: "translateX(400px)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        levelUp: {
          "0%": { transform: "scale(0) rotate(-180deg)", opacity: "0" },
          "50%": { transform: "scale(1.2) rotate(10deg)" },
          "100%": { transform: "scale(1) rotate(0deg)", opacity: "1" },
        },
        achievement: {
          "0%": { transform: "translateY(-100px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        coinCollect: {
          "0%": { transform: "translateY(0) scale(1)", opacity: "1" },
          "50%": { transform: "translateY(-20px) scale(1.5)" },
          "100%": { transform: "translateY(-100px) scale(0)", opacity: "0" },
        },
        xpGain: {
          "0%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.05)" },
          "100%": { transform: "scale(1)" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 24px rgba(245, 158, 11, 0.50)" },
          "50%": { boxShadow: "0 0 34px rgba(245, 158, 11, 0.80)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
