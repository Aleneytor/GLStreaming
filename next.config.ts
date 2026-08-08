import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Existe otro package-lock.json en el perfil del usuario y Next infería ese
  // directorio como raíz del proyecto. Se fija explícitamente.
  outputFileTracingRoot: process.cwd(),
  // Permite abrir el servidor de desarrollo desde otros dispositivos de la red
  // local (probar en el teléfono). Solo aplica a `next dev`. Se incluye la
  // subred con comodín para no reeditar esto cada vez que el router reasigne IP.
  // `*.trycloudflare.com` habilita los túneles temporales de Cloudflare para
  // enseñarle el panel a alguien fuera de la red local (ver runbook del túnel).
  allowedDevOrigins: ["192.168.0.*", "192.168.0.105", "192.168.0.106", "*.trycloudflare.com"],
  // El acceso a datos vive en el servidor (Server Actions / route handlers);
  // el navegador nunca recibe la service_role de Supabase.
  experimental: {
    // Server Actions habilitadas por defecto en Next 15; se deja el bloque
    // como punto de configuración explícito para límites de body, etc.
  },
  // Cabeceras de seguridad en producción (y desarrollo). Se omite a propósito
  // un Content-Security-Policy fijo: la app habla con Supabase (dominio por
  // entorno), Kuanto y la fuente BCV externa, así que una CSP hardcodeada
  // rompería producción. Ver docs/12-checklist-despliegue.md.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-DNS-Prefetch-Control", value: "off" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), usb=(), payment=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
