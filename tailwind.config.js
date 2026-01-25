// Tailwind CSS v4 - configuração migrada para src/styles/globals.css usando @theme
// Este arquivo é mantido para plugins que necessitam dele, como o HeroUI

import { heroui } from "@heroui/react";

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  plugins: [heroui({
    themes: {
      dark: {
        extend: "dark", // Inherit default dark theme
        colors: {
          background: "#0F0F23", // Cyberpunk Deep Navy
          foreground: "#E2E8F0", // Slate Text
          
          primary: {
            50: "#F5F3FF",
            100: "#EDE9FE",
            200: "#DDD6FE",
            300: "#C4B5FD",
            400: "#A78BFA",
            500: "#8B5CF6",
            600: "#7C3AED", // Main Brand Color
            700: "#6D28D9",
            800: "#5B21B6",
            900: "#4C1D95",
            DEFAULT: "#7C3AED",
            foreground: "#FFFFFF",
          },
          secondary: {
            50: "#F0F9FF",
            100: "#E0F2FE",
            200: "#BAE6FD",
            300: "#7DD3FC",
            400: "#38BDF8",
            500: "#A78BFA", // Neon Lavender as Secondary/Accent
            600: "#0284C7",
            700: "#0369A1",
            800: "#075985",
            900: "#0C4A6E",
            DEFAULT: "#A78BFA",
            foreground: "#0F0F23",
          },
          success: "#22c55e",
          warning: "#eab308",
          danger: "#F43F5E", // Rose/Red for Danger/CTA
          
          focus: "#7C3AED", // Focus ring color
        },
        layout: {
          radius: {
            small: "4px",
            medium: "8px",
            large: "12px",
          },
          borderWidth: {
            small: "1px",
            medium: "2px",
            large: "3px",
          },
        },
      },
    },
  })],
}
