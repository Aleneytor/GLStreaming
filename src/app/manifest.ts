import type { MetadataRoute } from "next";

/**
 * Manifest de la PWA (aplicación web instalable).
 *
 * Next.js sirve este archivo en /manifest.webmanifest y añade el <link> solo.
 * Los iconos se generan desde el logo del negocio (`assets_gl_streaming/Logo.jpg`)
 * y ya están en `/public`; falta solo el service worker para que el navegador
 * ofrezca "Instalar app" (ver docs/01-alcance-y-reglas.md §9).
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
    background_color: "#16191f",
    theme_color: "#16191f",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // "maskable": Android recorta el icono a su forma (círculo, squircle…).
      // Este lleva el glifo más pequeño para que nunca se corte.
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
