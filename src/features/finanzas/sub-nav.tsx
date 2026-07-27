"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const PESTANAS = [
  { href: "/caja", etiqueta: "Resumen diario", corto: "Hoy", icono: "▣" },
  { href: "/cobros", etiqueta: "Pagos pendientes", corto: "Pendientes", icono: "↓" },
  { href: "/egresos", etiqueta: "Pagos y gastos", corto: "Salidas", icono: "↑" },
  { href: "/cierre", etiqueta: "Resumen mensual", corto: "Mes", icono: "◫" },
  { href: "/tasas", etiqueta: "Tasas de cambio", corto: "Tasas", icono: "⇄" },
];

export function SubNavFinanzas() {
  const pathname = usePathname();

  return (
    // Se desplaza en horizontal en pantallas estrechas en lugar de romper la
    // maquetación: la página nunca debe hacer scroll lateral completo.
    <nav aria-label="Finanzas" className="-mx-4 overflow-x-auto px-4 pb-1">
      <ul className="flex w-max gap-2">
        {PESTANAS.map((p) => {
          const activo = pathname === p.href || pathname.startsWith(`${p.href}/`);
          return (
            <li key={p.href}>
              <Link
                href={p.href}
                aria-current={activo ? "page" : undefined}
                className={`flex min-h-11 items-center gap-2 whitespace-nowrap rounded-xl border px-3 py-2 text-sm transition ${
                  activo
                    ? "border-neutral-900 bg-neutral-900 font-medium text-white shadow-sm dark:border-white dark:bg-white dark:text-neutral-900"
                    : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-400 dark:hover:bg-neutral-900"
                }`}
              >
                <span aria-hidden className="text-base">{p.icono}</span>
                <span className="sm:hidden">{p.corto}</span>
                <span className="hidden sm:inline">{p.etiqueta}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
