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
        },
        ink: "#0E2A20", // dark green-navy headings
        mist: "#F4F8F6", // app background
        line: "#E4ECE8", // hairline borders
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(14,42,32,0.05), 0 8px 24px -12px rgba(14,42,32,0.12)",
      },
    },
  },
  plugins: [],
};
