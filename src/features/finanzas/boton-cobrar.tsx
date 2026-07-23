"use client";

import { useActionState } from "react";
import { cobrarAction, type EstadoCobro } from "./cobros";

export function BotonCobrar({
  periodoId,
  montoVes,
  bloqueado,
  volverA = "/cobros",
}: {
  periodoId: string;
  /** Bs que se van a cobrar, ya calculados con la BCV vigente. */
  montoVes: number | null;
  /** Motivo por el que no se puede cobrar todavía (precio o tasa ausente). */
  bloqueado?: string | null;
  volverA?: string;
}) {
  const [estado, action, pendiente] = useActionState<EstadoCobro, FormData>(
    cobrarAction,
    null,
  );

  if (bloqueado) {
    return (
      <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
        {bloqueado}
      </p>
    );
  }

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="periodo_id" value={periodoId} />
      <input type="hidden" name="volver_a" value={volverA} />
      <div className="flex flex-wrap items-center gap-2">
        <input
          name="referencia"
          placeholder="Referencia (opcional)"
          className="min-w-0 flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
        <button
          type="submit"
          disabled={pendiente}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition active:scale-[0.98] disabled:opacity-60"
        >
          {pendiente
            ? "Registrando…"
            : `Cobrar ${montoVes?.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs`}
        </button>
      </div>
      {estado?.error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {estado.error}
        </p>
      )}
      {estado?.ok && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">{estado.ok}</p>
      )}
    </form>
  );
}
