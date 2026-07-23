import type { Config } from "tailwindcss";

// Requisito no funcional del proyecto: dark mode + interfaz responsive.
// darkMode: "class" permite alternar tema desde la app sin depender solo del SO.
const config: Config = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/features/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
