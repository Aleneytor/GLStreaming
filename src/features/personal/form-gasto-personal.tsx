"use client";

import { useActionState } from "react";
import { registrarGastoPersonalAction, type EstadoPersonal } from "./actions";

const CAMPO =
  "min-h-11 w-full rounded-xl border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-blue-500";

export function FormGastoPersonal({
  hoy,
  bcv,
  paralela,
}: {
  hoy: string;
  bcv: number | null;
  paralela: number | null;
}) {
  const [estado, action, pendiente] = useActionState<EstadoPersonal, FormData>(
    registrarGastoPersonalAction,
    null,
  );

  return (
    <form action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm sm:col-span-2">
          <span className="mb-1 block text-neutral-600 dark:text-neutral-400">Concepto</span>
          <input
            name="concepto"
            required
            placeholder="Ej. Hamburguesa, gasolina, farmacia"
            className={CAMPO}
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-neutral-600 dark:text-neutral-400">Fecha</span>
          <input type="date" name="fecha_gasto" defaultValue={hoy} required className={CAMPO} />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-neutral-600 dark:text-neutral-400">Monto original</span>
          <input
            name="monto_original"
            inputMode="decimal"
            required
            placeholder="5"
            className={CAMPO}
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-neutral-600 dark:text-neutral-400">Moneda</span>
          <select name="moneda_original" required defaultValue="usd" className={CAMPO}>
            <option value="usd">$ USD</option>
            <option value="ves">Bs</option>
          </select>
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-neutral-600 dark:text-neutral-400">Convertir con</span>
          <select name="tasa_tipo" required defaultValue="bcv" className={CAMPO}>
            <option value="bcv">BCV</option>
            <option value="paralela">Paralela</option>
          </select>
        </label>

        <label className="block text-sm sm:col-span-2">
          <span className="mb-1 block text-neutral-600 dark:text-neutral-400">
            Descripción (opcional)
          </span>
          <input name="descripcion" placeholder="Combo grande, salida con amigos..." className={CAMPO} />
        </label>

        <label className="block text-sm sm:col-span-2">
          <span className="mb-1 block text-neutral-600 dark:text-neutral-400">Nota (opcional)</span>
          <input name="nota" placeholder="Solo referencia personal" className={CAMPO} />
        </label>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900/60 dark:text-neutral-300">
        <p>
          Este apartado es <strong>privado</strong> y no afecta caja, egresos, cierres ni
          métricas del negocio.
        </p>
        <p className="mt-1 text-neutral-500 dark:text-neutral-400">
          Tasas vigentes: BCV {bcv ? bcv.toLocaleString("es-VE") : "—"} Bs/$ · Paralela{" "}
          {paralela ? paralela.toLocaleString("es-VE") : "—"} Bs/$
        </p>
      </div>

      <button
        type="submit"
        disabled={pendiente}
        className="min-h-11 rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 active:scale-[0.98] disabled:opacity-60 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
      >
        {pendiente ? "Guardando..." : "Guardar gasto personal"}
      </button>

      {estado?.error && <p className="text-sm text-red-600 dark:text-red-400">{estado.error}</p>}
      {estado?.ok && <p className="text-sm text-emerald-600 dark:text-emerald-400">{estado.ok}</p>}
    </form>
  );
}
