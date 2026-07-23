"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const PESTANAS = [
  { href: "/caja", etiqueta: "Caja" },
  { href: "/cobros", etiqueta: "Por cobrar" },
  { href: "/egresos", etiqueta: "Egresos" },
  { href: "/cierre", etiqueta: "Cierre" },
  { href: "/tasas", etiqueta: "Tasas" },
];

export function SubNavFinanzas() {
  const pathname = usePathname();

  return (
    // Se desplaza en horizontal en pantallas estrechas en lugar de romper la
    // maquetación: la página nunca debe hacer scroll lateral completo.
    <nav aria-label="Finanzas" className="-mx-4 overflow-x-auto px-4">
      <ul className="flex w-max gap-1">
        {PESTANAS.map((p) => {
          const activo = pathname === p.href || pathname.startsWith(`${p.href}/`);
          return (
            <li key={p.href}>
              <Link
                href={p.href}
                aria-current={activo ? "page" : undefined}
                className={`block whitespace-nowrap rounded-lg px-3 py-1.5 text-sm transition ${
                  activo
                    ? "bg-neutral-900 font-medium text-white dark:bg-white dark:text-neutral-900"
                    : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-900"
                }`}
              >
                {p.etiqueta}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
