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
    extend: {
      // Oscuro "dim", no negro (decisión del usuario, 2026-07-29): el oscuro
      // por defecto usaba el `neutral` de Tailwind, cuyo extremo (950 = #0a0a0a)
      // es casi negro y se sentía demasiado oscuro. Aquí SOLO se re-mapean los
      // tres tonos más oscuros a un charcoal suave con un leve sesgo frío
      // (coherente con el acento azul). Como `extend.colors.neutral` se fusiona
      // con la escala por defecto, los tonos 50–700 quedan intactos: no cambia
      // el modo claro salvo el texto casi-negro, imperceptiblemente. Todo
      // componente que use `dark:bg-neutral-950/900/800` se aclara a la vez.
      // Para calibrar el nivel de oscuridad, ajustar SOLO estos tres valores.
      colors: {
        neutral: {
          800: "#2b313c", // bordes / hover / tiles (el más claro de los tres)
          900: "#1e222b", // superficies: tarjetas, cabeceras, barra de navegación
          950: "#16191f", // fondo de página (el más oscuro, ya no negro puro)
        },
      },
    },
  },
  plugins: [],
};

export default config;
