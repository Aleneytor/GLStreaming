"use client";

import { useActionState } from "react";
import { registrarPagoProveedorRapidoAction } from "./actions";

export function ModalRenovarProveedorRapido({
  cuentaId,
  correoCuenta,
  costoActual,
  slug,
  onCerrar,
}: {
  cuentaId: string;
  correoCuenta: string;
  costoActual: number | null;
  slug: string;
  onCerrar: () => void;
}) {
  const [estado, action, pendiente] = useActionState(registrarPagoProveedorRapidoAction, null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-6 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
              🔄 Renovar Cuenta con Proveedor
            </h3>
            <p className="font-mono text-xs text-neutral-500 dark:text-neutral-400">
              {correoCuenta}
            </p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
          >
            ✕
          </button>
        </div>

        <form action={action} className="space-y-4">
          <input type="hidden" name="cuenta_id" value={cuentaId} />
          <input type="hidden" name="slug" value={slug} />

          <div>
            <label className="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Monto Pagado al Proveedor ($ USDT) *
            </label>
            <input
              name="costo_usdt"
              required
              inputMode="decimal"
              placeholder="3.50"
              defaultValue={costoActual != null ? costoActual.toFixed(2) : "3.50"}
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-mono text-neutral-900 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
            />
            <p className="mt-1 text-[10px] text-neutral-500 dark:text-neutral-400">
              Al confirmar, se extienden 30 días la vigencia de la cuenta con el proveedor y se registra el egreso en Finanzas.
            </p>
          </div>

          {estado?.error && (
            <p className="rounded-md bg-red-50 p-2 text-xs font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300">
              ⚠️ {estado.error}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onCerrar}
              className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 dark:border-neutral-700 dark:text-neutral-300"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pendiente}
              className="rounded-lg bg-purple-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-purple-700 disabled:opacity-50"
            >
              {pendiente ? "Registrando..." : "Extender 30 Días"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
