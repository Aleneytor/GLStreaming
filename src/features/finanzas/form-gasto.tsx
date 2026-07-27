"use client";

import { useActionState } from "react";
import { registrarGastoAction, type EstadoEgreso } from "./egresos";

const CAMPO =
  "min-h-11 w-full rounded-xl border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:ring-emerald-950";

export function FormGasto({
  categorias,
  hoy,
  paralela,
}: {
  categorias: string[];
  hoy: string;
  /** Bs por USDT con los que se valorizará; solo informativo. */
  paralela: number | null;
}) {
  const [estado, action, pendiente] = useActionState<EstadoEgreso, FormData>(
    registrarGastoAction,
    null,
  );

  return (
    <form action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block text-neutral-600 dark:text-neutral-400">Categoría</span>
          <select name="categoria" required className={CAMPO} defaultValue="">
            <option value="" disabled>
              Elige…
            </option>
            {categorias.map((c) => (
              <option key={c} value={c}>
                {c.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-neutral-600 dark:text-neutral-400">Monto (USDT)</span>
          <input
            name="monto_usdt"
            inputMode="decimal"
            required
            placeholder="20"
            className={CAMPO}
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-neutral-600 dark:text-neutral-400">Fecha</span>
          <input type="date" name="fecha_gasto" defaultValue={hoy} required className={CAMPO} />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-neutral-600 dark:text-neutral-400">
            Contraparte (opcional)
          </span>
          <input name="contraparte" placeholder="Trader, página…" className={CAMPO} />
        </label>
      </div>

      <label className="block text-sm">
        <span className="mb-1 block text-neutral-600 dark:text-neutral-400">
          Descripción (opcional)
        </span>
        <input name="descripcion" className={CAMPO} />
      </label>

      <label className="block text-sm">
        <span className="mb-1 block text-neutral-600 dark:text-neutral-400">Nota (opcional)</span>
        <input name="nota" placeholder="Nairas recibidas, detalle…" className={CAMPO} />
      </label>

      {paralela && (
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Se valorizará a {paralela.toLocaleString("es-VE")} Bs/USDT (paralela vigente) y
          esa tasa quedará congelada en el gasto.
        </p>
      )}

      <button
        type="submit"
        disabled={pendiente}
        className="min-h-11 rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition active:scale-[0.98] disabled:opacity-60 dark:bg-white dark:text-neutral-900"
      >
        {pendiente ? "Registrando…" : "Registrar gasto"}
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
