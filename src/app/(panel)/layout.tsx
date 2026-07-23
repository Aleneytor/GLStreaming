import { redirect } from "next/navigation";
import { obtenerUsuarioActual, esAdmin } from "@/lib/auth";
import { cerrarSesion } from "@/features/auth/actions";
import { NavPanel, type ItemNav } from "@/components/nav-panel";

export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const usuario = await obtenerUsuarioActual();

  // El middleware ya redirige sin sesión; esto cubre el caso de sesión válida
  // sin fila en `usuarios` (o desactivada).
  if (!usuario) redirect("/login");
  if (!usuario.activo) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6 text-center">
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Tu usuario está desactivado. Contacta al administrador.
        </p>
      </main>
    );
  }

  const items: ItemNav[] = esAdmin(usuario)
    ? [
        { href: "/dashboard", etiqueta: "Inicio", icono: "🏠" },
        { href: "/inventario", etiqueta: "Inventario", icono: "📦" },
      ]
    : [{ href: "/dashboard", etiqueta: "Mis ventas", icono: "🧾" }];

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-neutral-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/95">
        <div className="flex min-w-0 items-center gap-2">
          <span aria-hidden>📺</span>
          <span className="truncate font-semibold tracking-tight">GL Streaming</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm leading-tight">{usuario.nombre}</p>
            <p className="text-xs capitalize text-neutral-500 dark:text-neutral-400">
              {usuario.rol}
            </p>
          </div>
          <form action={cerrarSesion}>
            <button
              type="submit"
              className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm transition active:scale-[0.98] dark:border-neutral-700"
            >
              Salir
            </button>
          </form>
        </div>
      </header>

      <div className="flex flex-1">
        <NavPanel items={items} />
        {/* pb-20 deja aire para la barra inferior en móvil */}
        <main className="min-w-0 flex-1 px-4 pb-20 pt-5 md:pb-8">{children}</main>
      </div>
    </div>
  );
}
