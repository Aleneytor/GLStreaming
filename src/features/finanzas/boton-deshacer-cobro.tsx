"use client";

import { useActionState, useState } from "react";
import { revertirCobroAction, type EstadoCobro } from "./cobros";

/**
 * Deshacer un cobro mal registrado.
 *
 * No borra nada: crea la contrapartida con las MISMAS tasas congeladas del
 * cobro original (historial inmutable). El período vuelve a «Por cobrar».
 */
export function BotonDeshacerCobro({
  pagoId,
  volverA = "/caja",
}: {
  pagoId: string;
  volverA?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [estado, action, pendiente] = useActionState<EstadoCobro, FormData>(
    revertirCobroAction,
    null,
  );

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="text-xs text-neutral-500 underline underline-offset-2 transition hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
      >
        Deshacer
      </button>
    );
  }

  return (
    <form action={action} className="space-y-1.5">
      <input type="hidden" name="pago_id" value={pagoId} />
      <input type="hidden" name="volver_a" value={volverA} />
      <input
        name="motivo"
        placeholder="Motivo (opcional)"
        className="w-full rounded-lg border border-neutral-300 px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-900"
      />
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setAbierto(false)}
          className="text-xs text-neutral-500 dark:text-neutral-400"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={pendiente}
          className="rounded-lg bg-red-600 px-2.5 py-1 text-xs font-medium text-white transition active:scale-[0.98] disabled:opacity-60"
        >
          {pendiente ? "Deshaciendo…" : "Confirmar"}
        </button>
      </div>
      {estado?.error && (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">
          {estado.error}
        </p>
      )}
      {estado?.ok && (
        <p className="text-xs text-emerald-600 dark:text-emerald-400">{estado.ok}</p>
      )}
    </form>
  );
}
