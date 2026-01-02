// Tailwind CSS v4 - configuração migrada para src/styles/globals.css usando @theme
// Este arquivo é mantido apenas para compatibilidade com plugins que ainda precisam dele

import { heroui } from "@heroui/react";

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
        colors: {
          background: "#09090b",
          foreground: "#fafafa",
          primary: {
            50: "#faf5ff",
            100: "#f3e8ff",
            200: "#e9d5ff",
            300: "#d8b4fe",
            400: "#c084fc",
            500: "#a855f7",
            600: "#9333ea",
            700: "#7c3aed",
            800: "#6b21a8",
            900: "#581c87",
            DEFAULT: "#9333ea",
            foreground: "#ffffff",
          },
          secondary: {
            400: "#22d3ee",
            500: "#06b6d4",
            600: "#0891b2",
            DEFAULT: "#06b6d4",
          },
          success: "#22c55e",
          warning: "#eab308",
          danger: "#ef4444",
        },
      },
    },
  })],
}
