"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";

/**
 * Filtros de la grilla de inventario.
 *
 * El estado vive en la URL (no en memoria del componente): así un filtro se
 * puede compartir, marcar como favorito y sobrevive a recargar la página.
 * Es la regla de estado de UI del proyecto: "URL primero".
 */
export function FiltrosInventario({
  estados,
}: {
  estados: { valor: string; etiqueta: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pendiente, iniciar] = useTransition();

  const q = params.get("q") ?? "";
  const estado = params.get("estado") ?? "";

  function actualizar(clave: string, valor: string) {
    const nuevos = new URLSearchParams(params.toString());
    if (valor) nuevos.set(clave, valor);
    else nuevos.delete(clave);
    iniciar(() => router.replace(`${pathname}?${nuevos.toString()}`));
  }

  const hayFiltros = Boolean(q || estado);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="search"
        inputMode="search"
        placeholder="Buscar por cliente o correo…"
        defaultValue={q}
        onChange={(e) => actualizar("q", e.target.value)}
        aria-label="Buscar cuentas"
        className="min-w-0 flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-base outline-none transition focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-neutral-300"
      />

      <select
        value={estado}
        onChange={(e) => actualizar("estado", e.target.value)}
        aria-label="Filtrar por estado"
        className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-base outline-none transition focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-neutral-300"
      >
        <option value="">Todos los estados</option>
        {estados.map((e) => (
          <option key={e.valor} value={e.valor}>
            {e.etiqueta}
          </option>
        ))}
      </select>

      {hayFiltros && (
        <button
          type="button"
          onClick={() => iniciar(() => router.replace(pathname))}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm transition active:scale-[0.98] dark:border-neutral-700"
        >
          Limpiar
        </button>
      )}

      {pendiente && (
        <span className="text-xs text-neutral-500 dark:text-neutral-400">Filtrando…</span>
      )}
    </div>
  );
}
