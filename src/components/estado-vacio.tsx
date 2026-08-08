import type { ReactNode } from "react";
import { Icono, type NombreIcono } from "./iconos";

/**
 * Estado vacío unificado.
 *
 * Antes cada pantalla resolvía el «no hay nada» a su manera: Cobros con borde
 * esmeralda y un ✓, Inventario y Caja con borde punteado neutro y tamaños de
 * texto distintos. Este componente les da una sola forma.
 *
 * La variante importa porque un vacío no siempre significa lo mismo:
 *   - `neutro`  — no hay datos todavía, o el filtro no encontró nada.
 *   - `ok`      — el vacío es una BUENA noticia («no queda nada por cobrar»).
 * Se mantiene la regla de la paleta: el verde solo aparece cuando de verdad
 * significa «todo en orden», nunca como decoración.
 */
export function EstadoVacio({
  titulo,
  sugerencia,
  icono,
  variante = "neutro",
  children,
}: {
  titulo: string;
  /** Qué puede hacer el usuario a continuación. Opcional. */
  sugerencia?: ReactNode;
  icono?: NombreIcono;
  variante?: "neutro" | "ok";
  /** Acción opcional (por ejemplo, un enlace para crear el primer registro). */
  children?: ReactNode;
}) {
  const esOk = variante === "ok";

  return (
    <div
      className={`rounded-2xl border border-dashed p-8 text-center ${
        esOk
          ? "border-emerald-300 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20"
          : "border-neutral-300 dark:border-neutral-700"
      }`}
    >
      {(icono || esOk) && (
        <Icono
          nombre={icono ?? "check"}
          className={`mx-auto size-8 ${
            esOk
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-neutral-400 dark:text-neutral-600"
          }`}
        />
      )}
      <p
        className={`mt-3 font-medium ${
          esOk
            ? "text-emerald-800 dark:text-emerald-300"
            : "text-neutral-700 dark:text-neutral-200"
        }`}
      >
        {titulo}
      </p>
      {sugerencia && (
        <p className="mx-auto mt-1 max-w-md text-sm text-neutral-500 dark:text-neutral-400">
          {sugerencia}
        </p>
      )}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
