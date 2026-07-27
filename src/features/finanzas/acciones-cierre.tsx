"use client";

import { useActionState } from "react";
import {
  calcularCierreAction,
  cerrarMesAction,
  reabrirMesAction,
  type EstadoCierre,
} from "./cierre";

function Mensaje({ estado }: { estado: EstadoCierre }) {
  if (estado?.error) {
    return (
      <p role="alert" className="text-sm text-red-600 dark:text-red-400">
        {estado.error}
      </p>
    );
  }
  if (estado?.ok) {
    return <p className="text-sm text-emerald-600 dark:text-emerald-400">{estado.ok}</p>;
  }
  return null;
}

export function AccionesCierre({
  mes,
  estado,
}: {
  mes: string;
  /** Estado del cierre en la base: borrador | reabierto | cerrado | (ninguno) */
  estado: string | null;
}) {
  const [eCalc, calcular, calculando] = useActionState<EstadoCierre, FormData>(
    calcularCierreAction,
    null,
  );
  const [eCerrar, cerrar, cerrando] = useActionState<EstadoCierre, FormData>(
    cerrarMesAction,
    null,
  );
  const [eAbrir, reabrir, reabriendo] = useActionState<EstadoCierre, FormData>(
    reabrirMesAction,
    null,
  );

  if (estado === "cerrado") {
    return (
      <form action={reabrir} className="space-y-2">
        <input type="hidden" name="mes" value={mes} />
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Este mes ya fue confirmado. Si faltó registrar algo, crea una versión corregida; la anterior se conserva para auditoría.
        </p>
        <div className="flex flex-wrap gap-2">
          <input
            name="motivo"
            required
            placeholder="¿Qué dato necesitas corregir?"
            className="min-w-0 flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
          <button
            type="submit"
            disabled={reabriendo}
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium transition active:scale-[0.98] disabled:opacity-60 dark:border-neutral-700"
          >
            {reabriendo ? "Creando versión…" : "Crear versión corregida"}
          </button>
        </div>
        <Mensaje estado={eAbrir} />
      </form>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <form action={calcular}>
          <input type="hidden" name="mes" value={mes} />
          <button
            type="submit"
            disabled={calculando}
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium transition active:scale-[0.98] disabled:opacity-60 dark:border-neutral-700"
          >
            {calculando ? "Guardando…" : estado ? "Actualizar borrador" : "Guardar borrador actual"}
          </button>
        </form>
        {estado && (
          <form action={cerrar}>
            <input type="hidden" name="mes" value={mes} />
            <button
              type="submit"
              disabled={cerrando}
              className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition active:scale-[0.98] disabled:opacity-60 dark:bg-white dark:text-neutral-900"
            >
              {cerrando ? "Confirmando…" : "Confirmar mes como definitivo"}
            </button>
          </form>
        )}
      </div>
      <Mensaje estado={eCalc} />
      <Mensaje estado={eCerrar} />
    </div>
  );
}
