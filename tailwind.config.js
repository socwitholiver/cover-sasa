/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // CoverSasa palette — trustworthy emerald green (health + "cover"),
        // matching the Stitch "Instant SHA Benefits Navigator" design system.
        brand: {
          50: "#EAFBF2",
          100: "#CFF4DF",
          200: "#9FE8C0",
          300: "#63D69B",
          400: "#2FC17E",
          500: "#12A75F", // primary
          600: "#0C8E50", // hover / buttons
          700: "#0A7241",
          800: "#0A5A35",
          900: "#083f26",
        },
        // Hospital blue — informational elements, links, secondary indicators.
        info: {
          50: "#EFF6FF",
          100: "#DBEAFE",
          200: "#BFDBFE",
          500: "#0EA5E9",
          600: "#0284C7",
          700: "#0369A1",
        },
        ink: "#0D1C2E", // deep slate headings (from Clinical Precision)
        // Stitch lavender-tinted surfaces
        surface: "#f6f8ff",
        lav: "#eaf0ff",
        lav2: "#e6eeff",
        mist: "#f6f8ff", // app background (kept name for compatibility)
        line: "#E2E8F5", // hairline borders (soft lavender)
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(13,28,46,0.04), 0 10px 30px -14px rgba(13,28,46,0.14)",
        lift: "0 16px 40px -18px rgba(13,28,46,0.28)",
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.75rem",
      },
    },
  },
  plugins: [],
};
