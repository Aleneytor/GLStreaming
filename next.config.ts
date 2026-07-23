import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Permite abrir el servidor de desarrollo desde otros dispositivos de la red
  // local (probar en el teléfono). Solo aplica a `next dev`.
  allowedDevOrigins: ["192.168.0.105"],
  // El acceso a datos vive en el servidor (Server Actions / route handlers);
  // el navegador nunca recibe la service_role de Supabase.
  experimental: {
    // Server Actions habilitadas por defecto en Next 15; se deja el bloque
    // como punto de configuración explícito para límites de body, etc.
  },
};

export default nextConfig;
