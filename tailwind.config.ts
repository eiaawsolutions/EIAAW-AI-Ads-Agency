import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx,mdx}"],
  theme: {
    container: {
      center: true,
      padding: { DEFAULT: "1.5rem", lg: "2rem" },
      screens: { "2xl": "1200px" },
    },
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      colors: {
        brand: {
          50: "#E6FBF8",
          100: "#B8F5ED",
          200: "#7FEAD8",
          300: "#4EDDC4",
          400: "#2FD4B5",
          500: "#22D3BF",
          600: "#14A393",
          700: "#0E7D72",
          800: "#0B5C55",
          900: "#083C3C",
          950: "#04201F",
        },
        coral: {
          400: "#FF9F8F",
          500: "#FF7E6B",
          600: "#E85A48",
        },
        amber: {
          400: "#FFC57A",
          500: "#FFB547",
          600: "#D68B1F",
        },
        lime: {
          400: "#C0F7BB",
          500: "#A7F3A0",
          600: "#6FD96A",
        },
        platform: {
          meta: "hsl(var(--platform-meta))",
          google: "hsl(var(--platform-google))",
          tiktok: "hsl(var(--platform-tiktok))",
          linkedin: "hsl(var(--platform-linkedin))",
          microsoft: "hsl(var(--platform-microsoft))",
          youtube: "hsl(var(--platform-youtube))",
          apple: "hsl(var(--platform-apple))",
        },
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        surface: {
          1: "hsl(var(--surface-1))",
          2: "hsl(var(--surface-2))",
        },
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
        popover: { DEFAULT: "hsl(var(--popover))", foreground: "hsl(var(--popover-foreground))" },
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        border: "hsl(var(--border))",
        "border-strong": "hsl(var(--border-strong))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem", letterSpacing: "0.08em" }],
        xs: ["0.75rem", { lineHeight: "1rem" }],
        sm: ["0.8125rem", { lineHeight: "1.25rem" }],
        base: ["0.9375rem", { lineHeight: "1.5rem" }],
        lg: ["1rem", { lineHeight: "1.5rem" }],
        xl: ["1.125rem", { lineHeight: "1.75rem" }],
        "2xl": ["1.375rem", { lineHeight: "1.75rem", letterSpacing: "-0.02em" }],
        "3xl": ["1.75rem", { lineHeight: "2rem", letterSpacing: "-0.025em" }],
        "4xl": ["2.25rem", { lineHeight: "2.5rem", letterSpacing: "-0.03em" }],
        "5xl": ["3rem", { lineHeight: "1.05", letterSpacing: "-0.035em" }],
        "6xl": ["3.75rem", { lineHeight: "1.02", letterSpacing: "-0.04em" }],
        "7xl": ["4.5rem", { lineHeight: "1", letterSpacing: "-0.045em" }],
      },
      spacing: {
        section: "6rem",
        "section-lg": "10rem",
      },
      transitionTimingFunction: {
        out: "cubic-bezier(0.16, 1, 0.3, 1)",
        smooth: "cubic-bezier(0.4, 0, 0.2, 1)",
      },
      transitionDuration: {
        "150": "150ms",
        "250": "250ms",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
