"use client";

import { useActionState } from "react";
import { confirmarLimpiezaAction, type EstadoAccion } from "./acciones-suscripcion";

export function BotonLimpieza({ operacionId }: { operacionId: string }) {
  const [estado, action, pendiente] = useActionState<EstadoAccion, FormData>(
    confirmarLimpiezaAction,
    null,
  );

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="operacion_id" value={operacionId} />
      <input
        name="evidencia"
        placeholder="Nota opcional"
        aria-label="Nota opcional sin datos sensibles"
        className="min-w-0 flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm outline-none dark:border-neutral-700 dark:bg-neutral-900"
      />
      <button
        type="submit"
        disabled={pendiente}
        className="shrink-0 rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60 dark:bg-white dark:text-neutral-900"
      >
        {pendiente ? "…" : "Confirmar retiro"}
      </button>
      {estado?.error && (
        <p role="alert" className="w-full text-sm text-red-600 dark:text-red-400">
          {estado.error}
        </p>
      )}
    </form>
  );
}
