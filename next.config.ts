import type { NextConfig } from "next";

/**
 * Content-Security-Policy configurable por entorno.
 *
 * La app habla con Supabase (dominio por entorno), Kuanto y la fuente BCV
 * externa, así que una CSP hardcodeada rompería producción. Si la variable
 * `CSP_DIRECTIVES` está definida, se usa tal cual (el operador la configura con
 * los dominios correctos de su entorno). Si no está definida, no se emite CSP
 * —se mantiene el comportamiento anterior para no romper el desarrollo local.
 *
 * Ejemplo para producción (en .env.local o el entorno de deploy):
 *   CSP_DIRECTIVES="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://supabase.co https://bcvscrapper.vercel.app; font-src 'self' data:; frame-ancestors 'none';"
 *
 * Notas:
 * - `'unsafe-inline'` en script-src/style-src es necesario porque Next.js
 *   inyecta estilos y scripts inline en desarrollo. En producción con
 *   `next start`, los scripts van en archivos externos, pero los estilos
 *   inline siguen presentes (Tailwind + Next).
 * - `frame-ancestors 'none'` refuerza el X-Frame-Options: DENY ya existente.
 */
const cspDirectives = process.env.CSP_DIRECTIVES;

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
  // Cabeceras de seguridad en producción (y desarrollo).
  async headers() {
    const headers = [
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-DNS-Prefetch-Control", value: "off" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(), usb=(), payment=()",
      },
    ];

    // Solo se añade CSP si la variable de entorno está definida.
    if (cspDirectives) {
      headers.push({ key: "Content-Security-Policy", value: cspDirectives });
    }

    return [
      {
        source: "/(.*)",
        headers,
      },
    ];
  },
};

export default nextConfig;
