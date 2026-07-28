"use client";

import { useActionState, useEffect } from "react";
import { registrarPagoProveedorRapidoAction } from "./actions";

function hoyCaracas(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Caracas",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function ModalRenovarProveedorRapido({
  cuentaId,
  correoCuenta,
  costoActual,
  renovarProveedor,
  slug,
  onCerrar,
}: {
  cuentaId: string;
  correoCuenta: string;
  costoActual: number | null;
  renovarProveedor: string | null;
  slug: string;
  onCerrar: () => void;
}) {
  const [estado, action, pendiente] = useActionState(registrarPagoProveedorRapidoAction, null);

  useEffect(() => {
    if (!estado?.ok) return;
    const timer = setTimeout(onCerrar, 1500);
    return () => clearTimeout(timer);
  }, [estado, onCerrar]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-6 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
              Renovar cuenta con proveedor
            </h3>
            <p className="break-all font-mono text-xs text-neutral-500 dark:text-neutral-400">
              {correoCuenta}
            </p>
          </div>
          <button type="button" onClick={onCerrar} className="px-2 text-xl text-neutral-400">
            ×
          </button>
        </div>

        <form
          action={action}
          onReset={(evento) => evento.preventDefault()}
          className="space-y-4"
        >
          <input type="hidden" name="cuenta_id" value={cuentaId} />
          <input type="hidden" name="slug" value={slug} />

          <div>
            <label className="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Inicio del nuevo ciclo *
            </label>
            <input
              type="date"
              name="inicio_ciclo"
              required
              defaultValue={renovarProveedor ?? ""}
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-mono dark:border-neutral-700 dark:bg-neutral-800"
            />
            <p className="mt-1 text-[10px] text-neutral-500">
              Usa la renovación guardada y conserva el calendario de esta cuenta.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Fecha real del pago *
            </label>
            <input
              type="date"
              name="fecha_pago"
              required
              defaultValue={hoyCaracas()}
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-mono dark:border-neutral-700 dark:bg-neutral-800"
            />
            <p className="mt-1 text-[10px] text-neutral-500">
              Afecta a Caja, pero no sustituye la fecha de renovación.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Costo del ciclo ($ USDT) *
            </label>
            <input
              name="costo_usdt"
              required
              inputMode="decimal"
              min="0"
              step="any"
              defaultValue={costoActual != null ? costoActual.toFixed(2) : ""}
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-mono dark:border-neutral-700 dark:bg-neutral-800"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Referencia (opcional)
            </label>
            <input
              name="referencia"
              maxLength={120}
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs dark:border-neutral-700 dark:bg-neutral-800"
            />
          </div>

          {estado?.error && (
            <p role="alert" className="rounded-md bg-red-50 p-2 text-xs font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300">
              {estado.error}
            </p>
          )}
          {estado?.ok && (
            <p className="rounded-md bg-emerald-50 p-2 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              {estado.ok}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" onClick={onCerrar} className="rounded-lg border px-3 py-2 text-xs">
              Cancelar
            </button>
            {!estado?.ok && (
              <button
                type="submit"
                disabled={pendiente}
                className="rounded-lg bg-purple-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                {pendiente ? "Registrando…" : "Renovar y registrar pago"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
