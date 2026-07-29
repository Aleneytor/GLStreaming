"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type ItemNav = {
  href: string;
  etiqueta: string;
  icono: string;
  /** Otras rutas que también deben marcar este elemento como activo. */
  incluye?: string[];
  /** No se muestra en la barra inferior del móvil (tarea de escritorio). */
  soloEscritorio?: boolean;
};

/**
 * Navegación del panel, mobile-first:
 *   - móvil: barra inferior fija (alcance del pulgar).
 *   - escritorio (md+): columna lateral.
 */
export function NavPanel({ items }: { items: ItemNav[] }) {
  const pathname = usePathname();

  const coincide = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  const esActivo = (item: ItemNav) =>
    coincide(item.href) || (item.incluye ?? []).some(coincide);

  return (
    <>
      {/* Móvil: barra inferior */}
      <nav
        aria-label="Navegación principal"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-neutral-200 bg-white/95 backdrop-blur md:hidden dark:border-neutral-800 dark:bg-neutral-950/95"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="flex">
          {items
            .filter((item) => !item.soloEscritorio)
            .map((item) => (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={esActivo(item) ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 px-2 py-2.5 text-xs transition ${
                  esActivo(item)
                    ? "text-blue-700 dark:text-blue-400"
                    : "text-neutral-500 dark:text-neutral-400"
                }`}
              >
                <span aria-hidden className="text-lg leading-none">
                  {item.icono}
                </span>
                {item.etiqueta}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Escritorio: columna lateral */}
      <nav
        aria-label="Navegación principal"
        className="hidden w-64 shrink-0 border-r border-neutral-200 bg-neutral-50 p-4 md:block lg:w-72 dark:border-neutral-800 dark:bg-neutral-950/40"
      >
        <div className="mb-2 px-2.5 text-[11px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
          Gestión operativa
        </div>
        <ul className="space-y-1.5">
          {items.map((item) => {
            const activo = esActivo(item);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={activo ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all ${
                    activo
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-neutral-600 hover:bg-neutral-200/60 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800/60 dark:hover:text-neutral-100"
                  }`}
                >
                  <span className={`text-base ${activo ? "scale-110" : "opacity-80"}`}>
                    {item.icono}
                  </span>
                  <span>{item.etiqueta}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
