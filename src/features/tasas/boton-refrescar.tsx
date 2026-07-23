"use client";

import { useActionState } from "react";
import { refrescarTasasAction, type EstadoRefresco } from "./actions";

export function BotonRefrescarTasas() {
  const [estado, action, pendiente] = useActionState<EstadoRefresco, FormData>(
    refrescarTasasAction,
    null,
  );

  return (
    <form action={action} className="space-y-2">
      <button
        type="submit"
        disabled={pendiente}
        className="rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition active:scale-[0.98] disabled:opacity-60 dark:bg-white dark:text-neutral-900"
      >
        {pendiente ? "Consultando…" : "Actualizar tasas"}
      </button>
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
