import type { MetadataRoute } from "next";

/**
 * Manifest de la PWA (aplicación web instalable).
 *
 * Next.js sirve este archivo en /manifest.webmanifest y añade el <link> solo.
 * Con esto, más el service worker y los iconos (pendientes, ver
 * docs/01-alcance-y-reglas.md §9), el navegador permite "Instalar app":
 * icono en la pantalla de inicio y ventana propia sin barra del navegador.
 *
 * `display: "standalone"` = se ve como app, no como pestaña del navegador.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GL Streaming",
    short_name: "GL Streaming",
    description:
      "Inventario, ventas, renovaciones, finanzas y revendedores de servicios de streaming.",
    lang: "es",
    start_url: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    // TODO(PWA): añadir iconos 192x192 y 512x512 (y uno "maskable") en /public
    // para que aparezca el prompt de instalación en Android/Chrome.
    icons: [],
  };
}
