import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./index.html"
  ],
  theme: {
    extend: {
      fontSize: {
        'xs-2x': ['1rem', { lineHeight: '1.5rem' }],      // 16px (蜈・px)
        'sm-2x': ['1.25rem', { lineHeight: '1.75rem' }],  // 20px (蜈・0px)
        'base-2x': ['1.5rem', { lineHeight: '2rem' }],    // 24px (蜈・2px)
        'lg-2x': ['1.75rem', { lineHeight: '2.25rem' }],  // 28px (蜈・4px)
        'xl-2x': ['2rem', { lineHeight: '2.5rem' }],      // 32px (蜈・6px)
        '2xl-2x': ['2.5rem', { lineHeight: '3rem' }],     // 40px (蜈・0px)
        '3xl-2x': ['3rem', { lineHeight: '3.5rem' }],     // 48px (蜈・4px)
        '4xl-2x': ['3.5rem', { lineHeight: '4rem' }],     // 56px (蜈・8px)
        '5xl-2x': ['4rem', { lineHeight: '4.5rem' }],     // 64px (蜈・2px)
        '6xl-2x': ['5rem', { lineHeight: '5.5rem' }],     // 80px (蜈・0px)
      },
      spacing: {
        '0.5-2x': '0.5rem',   // 8px (蜈・px)
        '1-2x': '1rem',       // 16px (蜈・px)
        '1.5-2x': '1.5rem',   // 24px (蜈・2px)
        '2-2x': '2rem',       // 32px (蜈・6px)
        '2.5-2x': '2.5rem',   // 40px (蜈・0px)
        '3-2x': '3rem',       // 48px (蜈・4px)
        '3.5-2x': '3.5rem',   // 56px (蜈・8px)
        '4-2x': '4rem',       // 64px (蜈・2px)
        '5-2x': '5rem',       // 80px (蜈・0px)
        '6-2x': '6rem',       // 96px (蜈・8px)
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
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [
    require("@tailwindcss/typography"),
    // require("@tailwindcss/line-clamp")
  ],
}

export default config


