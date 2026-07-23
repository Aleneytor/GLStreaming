import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GL Streaming",
  description:
    "Gestión de inventario, ventas, renovaciones, finanzas y revendedores de servicios de streaming.",
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
