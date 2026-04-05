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
        beige: {
          50: "#faf8f5",
          100: "#f5f0e8",
          200: "#ede3d0",
          300: "#e0d0b3",
          400: "#cdb896",
          500: "#b89f78",
          600: "#9e835c",
          700: "#7d6547",
          800: "#5e4c36",
          900: "#3d3124",
        },
        accent: {
          50: "#f0f9f4",
          100: "#dcf0e6",
          200: "#bbe0ce",
          300: "#8ec9ad",
          400: "#5dab87",
          500: "#3a8f69",
          600: "#2c7154",
        },
      },
      fontFamily: {
        sans: ["Hiragino Kaku Gothic ProN", "Hiragino Sans", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
