"use client";

import { useActionState, useEffect, useState } from "react";
import {
  deshacerUltimaRenovacionAction,
  type EstadoAccion,
} from "./acciones-suscripcion";

export function BotonDeshacerRenovacion({
  suscripcionId,
  onHecho,
}: {
  suscripcionId: string;
  onHecho?: () => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [estado, action, pendiente] = useActionState<EstadoAccion, FormData>(
    deshacerUltimaRenovacionAction,
    null,
  );

  useEffect(() => {
    if (!estado?.ok) return;
    onHecho?.();
  }, [estado, onHecho]);

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="text-xs text-amber-700 underline underline-offset-2 transition hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-100"
      >
        Deshacer última renovación
      </button>
    );
  }

  return (
    <form
      action={action}
      onReset={(evento) => evento.preventDefault()}
      className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30"
    >
      <input type="hidden" name="suscripcion_id" value={suscripcionId} />
      <p className="text-xs font-semibold text-amber-900 dark:text-amber-100">
        Deshacerá solo la última renovación vigente y sus cobros asociados.
      </p>
      <input
        name="motivo"
        placeholder="Motivo (opcional)"
        className="w-full rounded-lg border border-amber-300 bg-white px-2.5 py-1.5 text-xs text-neutral-900 dark:border-amber-800 dark:bg-neutral-900 dark:text-white"
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
          className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
        >
          {pendiente ? "Deshaciendo..." : "Confirmar"}
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
