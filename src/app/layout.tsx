import type { Metadata, Viewport } from "next";
import { RegistradorSW } from "@/components/registrador-sw";
import "./globals.css";

export const metadata: Metadata = {
  title: "GL Streaming",
  applicationName: "GL Streaming",
  description:
    "Gestión de inventario, ventas, renovaciones, finanzas y revendedores de servicios de streaming.",
  // La app muestra teléfonos/WhatsApp de clientes: iOS no debe convertirlos en
  // enlaces automáticos ni marcarlos como datos de contacto del sistema.
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
  // Comportamiento tipo app instalada en iOS al añadir a pantalla de inicio.
  appleWebApp: {
    capable: true,
    title: "GL Streaming",
    statusBarStyle: "black-translucent",
  },
};

// Mobile-first: viewport correcto en móvil + color de barra según tema.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#16191f" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // suppressHydrationWarning: las extensiones del navegador (asistentes, VPN,
  // gestores de contraseñas) suelen inyectar atributos en <html> antes de que
  // React hidrate; eso provoca un falso desajuste que no afecta a la app.
  //
  // Oscuro por defecto (decisión del usuario, 2026-07-28): se probó quitar el
  // className="dark" fijo para pasar a claro por defecto, pero el usuario
  // prefiere seguir en oscuro — lo que pedía era un oscuro MÁS CALMADO (menos
  // saturado, sin un color de fondo distinto por plataforma), no cambiar de
  // modo. Esa reducción de paleta ya vive en los componentes vía sus propias
  // clases `dark:`, así que se ve igual de bien aquí. No hay todavía un
  // selector de tema en la app; cuando lo haya, debe controlar esta clase en
  // vez de tenerla fija.
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <body className="min-h-screen bg-white text-neutral-900 antialiased dark:bg-neutral-950 dark:text-neutral-100">
        {children}
        <RegistradorSW />
      </body>
    </html>
  );
}
