"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Cinco vistas del mismo hecho: el día, lo pendiente, lo que sale, el mes y la
// tasa. Menú tipo "segmented control" neutro; el activo usa el único acento
// (azul), sin un color por pantalla. Etiqueta corta en móvil, larga en desktop.
const PESTANAS = [
  { href: "/caja", etiqueta: "Resumen diario", corto: "Diario" },
  { href: "/cobros", etiqueta: "Por cobrar", corto: "Cobrar" },
  { href: "/egresos", etiqueta: "Pagos y gastos", corto: "Salidas" },
  { href: "/cierre", etiqueta: "Resumen mensual", corto: "Mensual" },
  { href: "/tasas", etiqueta: "Tasas", corto: "Tasas" },
];

export function SubNavFinanzas() {
  const pathname = usePathname();

  return (
    <nav aria-label="Finanzas" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex w-max gap-1 rounded-2xl border border-neutral-200 bg-neutral-100 p-1 dark:border-neutral-800 dark:bg-neutral-900 sm:w-full">
        {PESTANAS.map((p) => {
          const activo = pathname === p.href || pathname.startsWith(`${p.href}/`);
          return (
            <li key={p.href} className="sm:flex-1">
              <Link
                href={p.href}
                aria-current={activo ? "page" : undefined}
                className={`block whitespace-nowrap rounded-xl px-4 py-2 text-center text-xs font-semibold transition sm:text-sm ${
                  activo
                    ? "bg-white text-blue-700 shadow-xs dark:bg-neutral-800 dark:text-blue-400"
                    : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-100"
                }`}
              >
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
