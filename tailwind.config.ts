import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx,mdx}"],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: { "2xl": "1440px" },
    },
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
      },
      colors: {
        // Brand palette derived from EIAAW logo (deep teal → cyan → mint)
        brand: {
          50: "#E6FBF8",
          100: "#C2F5EC",
          200: "#8FEBDD",
          300: "#5DDECA",
          400: "#2FCBB3",
          500: "#14B39B", // primary
          600: "#0E9082",
          700: "#0B6F67",
          800: "#0A5350",
          900: "#083C3C",
          950: "#04201F",
        },
        ink: {
          50: "#F6F8F9",
          100: "#E8ECEE",
          200: "#C9D2D6",
          300: "#9BA9AF",
          400: "#6B7B82",
          500: "#4A5A61",
          600: "#334148",
          700: "#222E34",
          800: "#151E22",
          900: "#0B1316",
          950: "#060B0D",
        },
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
        popover: { DEFAULT: "hsl(var(--popover))", foreground: "hsl(var(--popover-foreground))" },
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      backgroundImage: {
        "brand-gradient":
          "linear-gradient(135deg, #083C3C 0%, #0E9082 35%, #2FCBB3 70%, #8FEBDD 100%)",
        "brand-radial":
          "radial-gradient(ellipse at top, rgba(47,203,179,0.25), transparent 60%)",
        "grid-ink":
          "linear-gradient(to right, rgba(201,210,214,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(201,210,214,0.06) 1px, transparent 1px)",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(0.8)", opacity: "0.6" },
          "100%": { transform: "scale(2)", opacity: "0" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) both",
        shimmer: "shimmer 2.5s linear infinite",
        "pulse-ring": "pulse-ring 2s cubic-bezier(0.22, 1, 0.36, 1) infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
