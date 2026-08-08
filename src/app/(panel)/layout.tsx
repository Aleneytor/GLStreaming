import Image from "next/image";
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
        { href: "/dashboard", etiqueta: "Operaciones", icono: "rayo" },
        { href: "/inventario", etiqueta: "Inventario", icono: "caja" },
        { href: "/clientes", etiqueta: "Clientes", icono: "personas" },
        {
          href: "/caja",
          etiqueta: "Finanzas",
          icono: "dinero",
          incluye: ["/cobros", "/egresos", "/cierre", "/tasas"],
        },
        { href: "/red", etiqueta: "Red comercial", icono: "personas" },
        { href: "/migracion", etiqueta: "Importar", icono: "descarga", soloEscritorio: true },
        { href: "/catalogo", etiqueta: "Catálogo", icono: "engranaje" },
        {
          href: "/personal",
          etiqueta: "Personal",
          icono: "recibo",
          separador: true,
          seccion: "Personal",
          soloEscritorio: true,
        },
      ]
    : [{ href: "/dashboard", etiqueta: "Mis ventas", icono: "recibo" }];

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50 dark:bg-neutral-950">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-neutral-200 bg-white/95 px-5 py-3 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/95">
        <div className="flex items-center gap-3">
          {/* Monograma de la marca. Monocromo: blanco en oscuro, invertido a
              negro en claro (uso estándar de una marca de un solo color). */}
          <Image
            src="/logo-gl.png"
            alt=""
            width={512}
            height={512}
            priority
            className="h-9 w-9 shrink-0 invert dark:invert-0"
          />
          <div>
            <span className="text-sm font-bold tracking-tight text-neutral-900 dark:text-white sm:text-base">
              GL Streaming
            </span>
            <span className="hidden text-xs text-neutral-500 dark:text-neutral-400 sm:ml-2 sm:inline-block">
              · Panel de administración
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-1.5 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-xs font-bold text-white">
              {usuario.nombre.slice(0, 2).toUpperCase()}
            </div>
            <div className="hidden text-left sm:block">
              <p className="text-xs font-bold leading-tight text-neutral-900 dark:text-white">
                {usuario.nombre}
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                {usuario.rol}
              </p>
            </div>
          </div>

          <form action={cerrarSesion}>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-100 hover:text-neutral-900 active:scale-[0.98] dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              <span>Salir</span>
            </button>
          </form>
        </div>
      </header>

      <div className="flex flex-1">
        <NavPanel items={items} />
        <main className="min-w-0 flex-1 px-4 pb-20 pt-6 sm:px-6 md:pb-10 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
