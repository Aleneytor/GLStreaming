"use client";

import { useActionState, useState } from "react";
import { cobrarAction, type EstadoCobro } from "./cobros";
import { CampoMonto, type Moneda } from "./campo-monto";

/**
 * Registrar el cobro de un período que quedó pendiente.
 *
 * El monto lo escribe el usuario: en este negocio los bolívares recibidos
 * varían de un cliente a otro. Si el período traía un precio en USD, se ofrece
 * el equivalente como SUGERENCIA, nunca como importe obligatorio.
 */
export function BotonCobrar({
  periodoId,
  sugerencia,
  bcv,
  bloqueado,
  volverA = "/cobros",
}: {
  periodoId: string;
  sugerencia: number | null;
  bcv: number | null;
  bloqueado?: string | null;
  volverA?: string;
}) {
  const [estado, action, pendiente] = useActionState<EstadoCobro, FormData>(
    cobrarAction,
    null,
  );
  const [monto, setMonto] = useState(sugerencia ? sugerencia.toFixed(2) : "");
  const [moneda, setMoneda] = useState<Moneda>("ves");

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
      <div className="flex flex-wrap items-start gap-2">
        <CampoMonto
          monto={monto}
          setMonto={setMonto}
          moneda={moneda}
          setMoneda={setMoneda}
          bcv={bcv}
          required
          className="w-full sm:w-auto sm:min-w-[16rem]"
        />
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
          {pendiente ? "Registrando…" : "Registrar cobro"}
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
