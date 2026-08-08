"use client";

import { useActionState, useState } from "react";
import {
  archivarGastoPersonalAction,
  editarGastoPersonalAction,
  eliminarGastoPersonalAction,
  type EstadoPersonal,
} from "./actions";

const CAMPO =
  "min-h-10 w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-blue-500";

const bs = (n: number) =>
  n.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type Gasto = {
  id: string;
  fecha_gasto: string;
  concepto: string;
  descripcion: string | null;
  nota: string | null;
  moneda_original: string;
  monto_original: number;
  monto_usd: number;
  monto_ves: number;
  tasa_tipo: string;
  tasa_bs_por_usd_snapshot: number;
};

export function ItemGastoPersonal({ gasto }: { gasto: Gasto }) {
  const [modoEdicion, setModoEdicion] = useState(false);
  const [estadoEditar, actionEditar, pendienteEditar] = useActionState<EstadoPersonal, FormData>(
    editarGastoPersonalAction,
    null,
  );
  const [estadoEliminar, actionEliminar, pendienteEliminar] = useActionState<EstadoPersonal, FormData>(
    eliminarGastoPersonalAction,
    null,
  );
  const [estadoArchivar, actionArchivar, pendienteArchivar] = useActionState<EstadoPersonal, FormData>(
    archivarGastoPersonalAction,
    null,
  );

  return (
    <li className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-neutral-900 dark:text-white">{gasto.concepto}</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {gasto.fecha_gasto} · {gasto.moneda_original === "usd" ? "$" : "Bs"}{" "}
            {Number(gasto.monto_original).toFixed(2)} · {String(gasto.tasa_tipo).toUpperCase()}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => setModoEdicion((v) => !v)}
            className="rounded-lg border border-neutral-300 px-2.5 py-1.5 text-xs font-medium text-neutral-600 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            {modoEdicion ? "Cerrar" : "Editar"}
          </button>
          <form action={actionArchivar}>
            <input type="hidden" name="gasto_id" value={gasto.id} />
            <button
              type="submit"
              disabled={pendienteArchivar}
              className="rounded-lg border border-neutral-300 px-2.5 py-1.5 text-xs font-medium text-neutral-600 transition hover:bg-neutral-100 disabled:opacity-60 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              {pendienteArchivar ? "Archivando..." : "Archivar"}
            </button>
          </form>
        </div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-neutral-50 px-3 py-2 text-sm dark:bg-neutral-800/60">
          <p className="text-[11px] uppercase tracking-wide text-neutral-500">USD</p>
          <p className="mt-1 font-semibold tabular-nums">${Number(gasto.monto_usd).toFixed(2)}</p>
        </div>
        <div className="rounded-xl bg-neutral-50 px-3 py-2 text-sm dark:bg-neutral-800/60">
          <p className="text-[11px] uppercase tracking-wide text-neutral-500">Bs</p>
          <p className="mt-1 font-semibold tabular-nums">{bs(Number(gasto.monto_ves))}</p>
        </div>
        <div className="rounded-xl bg-neutral-50 px-3 py-2 text-sm dark:bg-neutral-800/60">
          <p className="text-[11px] uppercase tracking-wide text-neutral-500">Tasa usada</p>
          <p className="mt-1 font-semibold tabular-nums">
            {Number(gasto.tasa_bs_por_usd_snapshot).toLocaleString("es-VE")} Bs/$
          </p>
        </div>
      </div>

      {(gasto.descripcion || gasto.nota) && (
        <div className="mt-3 space-y-1 text-sm text-neutral-600 dark:text-neutral-300">
          {gasto.descripcion && <p>{gasto.descripcion}</p>}
          {gasto.nota && <p className="text-xs text-neutral-500 dark:text-neutral-400">{gasto.nota}</p>}
        </div>
      )}

      {estadoArchivar?.error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{estadoArchivar.error}</p>}
      {estadoArchivar?.ok && <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-400">{estadoArchivar.ok}</p>}

      {modoEdicion && (
        <div className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900/60">
          <form action={actionEditar} className="space-y-3">
            <input type="hidden" name="gasto_id" value={gasto.id} />

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm sm:col-span-2">
                <span className="mb-1 block text-neutral-600 dark:text-neutral-400">Concepto</span>
                <input name="concepto" defaultValue={gasto.concepto} required className={CAMPO} />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block text-neutral-600 dark:text-neutral-400">Fecha</span>
                <input type="date" name="fecha_gasto" defaultValue={gasto.fecha_gasto} required className={CAMPO} />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block text-neutral-600 dark:text-neutral-400">Monto original</span>
                <input
                  name="monto_original"
                  inputMode="decimal"
                  defaultValue={Number(gasto.monto_original).toFixed(2)}
                  required
                  className={CAMPO}
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block text-neutral-600 dark:text-neutral-400">Moneda</span>
                <select name="moneda_original" defaultValue={gasto.moneda_original} className={CAMPO}>
                  <option value="usd">$ USD</option>
                  <option value="ves">Bs</option>
                </select>
              </label>

              <label className="block text-sm">
                <span className="mb-1 block text-neutral-600 dark:text-neutral-400">Convertir con</span>
                <select name="tasa_tipo" defaultValue={gasto.tasa_tipo} className={CAMPO}>
                  <option value="bcv">BCV</option>
                  <option value="paralela">Paralela</option>
                </select>
              </label>

              <label className="block text-sm sm:col-span-2">
                <span className="mb-1 block text-neutral-600 dark:text-neutral-400">Descripción</span>
                <input name="descripcion" defaultValue={gasto.descripcion ?? ""} className={CAMPO} />
              </label>

              <label className="block text-sm sm:col-span-2">
                <span className="mb-1 block text-neutral-600 dark:text-neutral-400">Nota</span>
                <input name="nota" defaultValue={gasto.nota ?? ""} className={CAMPO} />
              </label>
            </div>

            <button
              type="submit"
              disabled={pendienteEditar}
              className="rounded-lg bg-neutral-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-60 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              {pendienteEditar ? "Guardando..." : "Guardar cambios"}
            </button>

            {estadoEditar?.error && <p className="text-sm text-red-600 dark:text-red-400">{estadoEditar.error}</p>}
            {estadoEditar?.ok && <p className="text-sm text-emerald-600 dark:text-emerald-400">{estadoEditar.ok}</p>}
          </form>

          <div className="mt-4 border-t border-red-200 pt-3 dark:border-red-900/40">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-red-600 dark:text-red-400">
              Zona destructiva
            </p>
            <form
              action={actionEliminar}
              onSubmit={(event) => {
                if (!window.confirm("¿Eliminar este gasto personal definitivamente?")) {
                  event.preventDefault();
                }
              }}
              className="space-y-2"
            >
              <input type="hidden" name="gasto_id" value={gasto.id} />
              <button
                type="submit"
                disabled={pendienteEliminar}
                className="rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/30"
              >
                {pendienteEliminar ? "Eliminando..." : "Eliminar definitivamente"}
              </button>
              {estadoEliminar?.error && <p className="text-sm text-red-600 dark:text-red-400">{estadoEliminar.error}</p>}
              {estadoEliminar?.ok && <p className="text-sm text-emerald-600 dark:text-emerald-400">{estadoEliminar.ok}</p>}
            </form>
          </div>
        </div>
      )}
    </li>
  );
}
