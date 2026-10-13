import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

// "Guild Ledger" mapping — see qa-b2c/design-tokens.md §3. Colours are RGB channels in
// globals.css so opacity modifiers work (bg-primary/10).
const c = (name: string) => `rgb(var(--color-${name}) / <alpha-value>)`;

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        canvas: c("canvas"),
        surface: c("surface"),
        sunken: c("sunken"),
        line: { DEFAULT: c("line"), strong: c("line-strong") },
        ink: { DEFAULT: c("ink"), muted: c("ink-muted"), subtle: c("ink-subtle") },
        "on-fill": c("on-fill"),
        primary: { DEFAULT: c("primary"), strong: c("primary-strong"), soft: c("primary-soft"), foreground: c("on-fill") },
        ember: { DEFAULT: c("ember"), text: c("ember-text"), soft: c("ember-soft") },
        money: { DEFAULT: c("money"), soft: c("money-soft") },
        success: { DEFAULT: c("success"), soft: c("success-soft") },
        warning: { DEFAULT: c("warning"), soft: c("warning-soft") },
        danger: { DEFAULT: c("danger"), soft: c("danger-soft") },
        info: { DEFAULT: c("info"), soft: c("info-soft") },

        // B2B ops console (b2b/ux-direction.md section 2.2). Okabe-Ito families: signal / ink / tint.
        ops: {
          chrome: "#1B1F24",
          "chrome-muted": "#AEB6C1",
          canvas: "#F4F5F7",
          surface: "#FFFFFF",
          ink: "#16191D",
          "ink-muted": "#4A5361",
          "ink-subtle": "#5F6874",
          border: "#D5D9DF",
          "border-strong": "#737C88",
          accent: "#005A8C",
        },
        sig: {
          slate: { DEFAULT: "#6B7685", ink: "#424B57", tint: "#ECEEF1" },
          orange: { DEFAULT: "#E69F00", ink: "#7A5200", tint: "#FCEFD2" },
          blue: { DEFAULT: "#0072B2", ink: "#005A8C", tint: "#E1EEF7" },
          sky: { DEFAULT: "#56B4E9", ink: "#1A6690", tint: "#E3F2FB" },
          green: { DEFAULT: "#009E73", ink: "#006B4F", tint: "#DDF2EA" },
          vermilion: { DEFAULT: "#D55E00", ink: "#A33F00", tint: "#FBE5D6" },
          purple: { DEFAULT: "#CC79A7", ink: "#8A3D66", tint: "#F6E6EF" },
        },
      },
      borderColor: { DEFAULT: c("line") },
      fontFamily: {
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      fontSize: {
        display: ["var(--text-display)", { lineHeight: "1.05", letterSpacing: "-0.02em", fontWeight: "700" }],
        h1: ["var(--text-h1)", { lineHeight: "1.1", letterSpacing: "-0.015em", fontWeight: "700" }],
        h2: ["var(--text-h2)", { lineHeight: "1.2", letterSpacing: "-0.01em", fontWeight: "650" }],
        h3: ["var(--text-h3)", { lineHeight: "1.3", fontWeight: "600" }],
        "body-lg": ["var(--text-body-lg)", { lineHeight: "1.55" }],
        body: ["var(--text-body)", { lineHeight: "1.5" }],
        label: ["var(--text-label)", { lineHeight: "1.43", fontWeight: "700" }],
        caption: ["var(--text-caption)", { lineHeight: "1.38" }],
        micro: ["var(--text-micro)", { lineHeight: "1.33", letterSpacing: "0.06em", fontWeight: "700" }],
      },
      borderRadius: {
        control: "var(--radius-control)",
        card: "var(--radius-card)",
        sheet: "var(--radius-sheet)",
      },
      boxShadow: {
        stamp: "var(--shadow-stamp)",
        raised: "var(--shadow-raised)",
        focus: "var(--shadow-focus)",
      },
      transitionDuration: { fast: "150ms", normal: "240ms", slow: "400ms" },
      transitionTimingFunction: { out: "var(--ease-out)", "out-expo": "var(--ease-out-expo)" },
      maxWidth: { content: "var(--content-max)" },
      spacing: { header: "var(--header-h)", tabbar: "var(--tabbar-h)" },
      keyframes: {
        "sheet-up": { from: { transform: "translateY(100%)" }, to: { transform: "translateY(0)" } },
        "toast-in": { from: { transform: "translateY(8px)", opacity: "0" }, to: { transform: "none", opacity: "1" } },
        skeleton: { "0%,100%": { opacity: "1" }, "50%": { opacity: ".55" } },
      },
      animation: {
        "sheet-up": "sheet-up 240ms var(--ease-out-expo)",
        "toast-in": "toast-in 240ms var(--ease-out-expo)",
        skeleton: "skeleton 1.4s ease-in-out infinite",
      },
    },
  },
  plugins: [typography],
};

export default config;
