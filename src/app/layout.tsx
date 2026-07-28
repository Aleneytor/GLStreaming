import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GL Streaming",
  description:
    "Gestión de inventario, ventas, renovaciones, finanzas y revendedores de servicios de streaming.",
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
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
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
  // Claro por defecto: el negocio decidió alejarse del fondo oscuro fijo (era
  // un className="dark" a la fuerza en el <html>, sin relación con el SO del
  // usuario ni con ningún selector — por eso ninguna paleta clara se veía
  // nunca). No hay todavía un selector de tema en la app; cuando lo haya, debe
  // controlar esta clase en vez de tenerla fija.
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="min-h-screen bg-white text-neutral-900 antialiased dark:bg-neutral-950 dark:text-neutral-100">
        {children}
      </body>
    </html>
  );
}
