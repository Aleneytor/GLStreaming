"use client";

import { useActionState } from "react";
import { renovarProveedorAction, type EstadoEgreso } from "./egresos";

const CAMPO =
  "w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900";

/**
 * «Registrar renovación y pago»: el administrador edita UN solo importe de
 * negocio. Si es mayor que cero y marca «ya lo pagué», la base crea además el
 * pago con exactamente ese valor. Costo y pago quedan separados internamente
 * (uno se devenga, el otro afecta a Caja) pero aquí son un único número.
 */
export function FormRenovacionProveedor({
  cuentaId,
  costoSugerido,
  diaAncla,
  inicioSugerido,
}: {
  cuentaId: string;
  costoSugerido: number | null;
  diaAncla: number | null;
  inicioSugerido: string;
}) {
  const [estado, action, pendiente] = useActionState<EstadoEgreso, FormData>(
    renovarProveedorAction,
    null,
  );

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="cuenta_id" value={cuentaId} />
      {diaAncla != null && <input type="hidden" name="dia_ancla" value={diaAncla} />}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block text-neutral-600 dark:text-neutral-400">
            Costo del ciclo (USDT)
          </span>
          <input
            name="costo_usdt"
            inputMode="decimal"
            required
            defaultValue={costoSugerido ?? ""}
            className={CAMPO}
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-neutral-600 dark:text-neutral-400">
            Inicio del ciclo
          </span>
          <input
            type="date"
            name="inicio"
            defaultValue={inicioSugerido}
            required
            className={CAMPO}
          />
        </label>
      </div>

      <label className="block text-sm">
        <span className="mb-1 block text-neutral-600 dark:text-neutral-400">
          Referencia (opcional)
        </span>
        <input name="referencia" className={CAMPO} />
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="pagado" defaultChecked className="size-4" />
        Ya lo pagué (crea la salida de Caja)
      </label>

      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        El día de renovación pactado ({diaAncla ?? "el del inicio"}) no se mueve
        aunque pagues uno o dos días tarde: eso solo cambia la fecha en Caja.
      </p>

      <button
        type="submit"
        disabled={pendiente}
        className="rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition active:scale-[0.98] disabled:opacity-60 dark:bg-white dark:text-neutral-900"
      >
        {pendiente ? "Registrando…" : "Registrar renovación y pago"}
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
