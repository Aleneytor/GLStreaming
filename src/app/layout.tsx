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
  return (
    <html lang="es" className="dark">
      <body className="min-h-screen bg-white text-neutral-900 antialiased dark:bg-neutral-950 dark:text-neutral-100">
        {children}
      </body>
    </html>
  );
}
