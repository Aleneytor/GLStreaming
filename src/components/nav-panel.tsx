"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type ItemNav = {
  href: string;
  etiqueta: string;
  icono: string;
  /** Otras rutas que también deben marcar este elemento como activo. */
  incluye?: string[];
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
          {items.map((item) => (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={esActivo(item) ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 px-2 py-2.5 text-xs transition ${
                  esActivo(item)
                    ? "text-neutral-900 dark:text-white"
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
        className="hidden w-52 shrink-0 border-r border-neutral-200 p-3 md:block dark:border-neutral-800"
      >
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={esActivo(item) ? "page" : undefined}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${
                  esActivo(item)
                    ? "bg-neutral-100 font-medium text-neutral-900 dark:bg-neutral-800 dark:text-white"
                    : "text-neutral-600 hover:bg-neutral-50 dark:text-neutral-400 dark:hover:bg-neutral-900"
                }`}
              >
                <span aria-hidden>{item.icono}</span>
                {item.etiqueta}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
