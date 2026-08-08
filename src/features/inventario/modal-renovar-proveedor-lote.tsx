"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { registrarPagosProveedorLoteAction } from "./actions";
import { hoyCaracas } from "@/domain/fechas";

export type CuentaPagoProveedorLote = {
  cuentaId: string;
  correo: string;
  proveedor: string | null;
  costo: number | null;
  renovarProveedor: string;
};

function fechaVisible(fecha: string): string {
  const [anio, mes, dia] = fecha.split("-");
  return anio && mes && dia ? `${dia}/${mes}/${anio}` : fecha;
}

export function ModalRenovarProveedorLote({
  cuentas,
  slug,
  onCerrar,
}: {
  cuentas: CuentaPagoProveedorLote[];
  slug: string;
  onCerrar: () => void;
}) {
  const [estado, action, pendiente] = useActionState(registrarPagosProveedorLoteAction, null);
  const [costos, setCostos] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      cuentas.map((cuenta) => [
        cuenta.cuentaId,
        cuenta.costo == null ? "" : cuenta.costo.toFixed(2),
      ]),
    ),
  );

  const items = useMemo(
    () =>
      cuentas.map((cuenta) => ({
        cuenta_id: cuenta.cuentaId,
        costo_usdt: Number((costos[cuenta.cuentaId] ?? "").replace(",", ".")),
      })),
    [cuentas, costos],
  );
  const total = items.reduce(
    (suma, item) => suma + (Number.isFinite(item.costo_usdt) ? item.costo_usdt : 0),
    0,
  );

  useEffect(() => {
    if (!estado?.ok) return;
    const timer = setTimeout(onCerrar, 1800);
    return () => clearTimeout(timer);
  }, [estado, onCerrar]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-3 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-start justify-between border-b border-neutral-200 p-4 dark:border-neutral-800">
          <div>
            <h3 className="font-semibold">Renovar {cuentas.length} cuentas con el proveedor</h3>
            <p className="mt-1 text-xs text-neutral-500">
              Un solo pago; cada cuenta conserva su propia fecha de renovación.
            </p>
          </div>
          <button type="button" onClick={onCerrar} className="px-2 text-xl text-neutral-400">×</button>
        </div>

        <form
          action={action}
          onReset={(evento) => evento.preventDefault()}
          className="flex min-h-0 flex-1 flex-col"
        >
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="items" value={JSON.stringify(items)} />

          <div className="grid gap-3 border-b border-neutral-200 p-4 sm:grid-cols-2 dark:border-neutral-800">
            <label className="text-xs font-semibold">
              Fecha real del pago
              <input
                type="date"
                name="fecha_pago"
                required
                defaultValue={hoyCaracas()}
                className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 font-mono text-sm dark:border-neutral-700 dark:bg-neutral-800"
              />
            </label>
            <label className="text-xs font-semibold">
              Referencia (opcional)
              <input
                name="referencia"
                maxLength={120}
                className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
              />
            </label>
          </div>

          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
            {cuentas.map((cuenta) => (
              <div
                key={cuenta.cuentaId}
                className="grid gap-2 rounded-lg border border-neutral-200 p-3 sm:grid-cols-[1fr_auto_auto] sm:items-center dark:border-neutral-800"
              >
                <div className="min-w-0">
                  <p className="truncate font-mono text-xs font-semibold">{cuenta.correo}</p>
                  <p className="text-[11px] text-neutral-500">Inicia: {fechaVisible(cuenta.renovarProveedor)}</p>
                </div>
                <span className="text-xs text-neutral-500">{cuenta.proveedor}</span>
                <label className="flex items-center gap-2 text-xs">
                  <span>Costo $</span>
                  <input
                    value={costos[cuenta.cuentaId] ?? ""}
                    onChange={(event) =>
                      setCostos((actuales) => ({ ...actuales, [cuenta.cuentaId]: event.target.value }))
                    }
                    inputMode="decimal"
                    min="0"
                    step="any"
                    required
                    aria-label={`Costo de ${cuenta.correo}`}
                    className="w-24 rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-right font-mono dark:border-neutral-700 dark:bg-neutral-800"
                  />
                </label>
              </div>
            ))}
          </div>

          <div className="border-t border-neutral-200 p-4 dark:border-neutral-800">
            {estado?.error && (
              <p role="alert" className="mb-3 rounded-lg bg-red-50 p-2 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">{estado.error}</p>
            )}
            {estado?.ok && (
              <p className="mb-3 rounded-lg bg-emerald-50 p-2 text-xs text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">{estado.ok}</p>
            )}
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] text-neutral-500">Total del pago</p>
                <p className="font-mono text-lg font-bold">${total.toFixed(2)} USDT</p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={onCerrar} className="rounded-lg border px-3 py-2 text-sm">Cancelar</button>
                {!estado?.ok && (
                  <button
                    type="submit"
                    disabled={
                      pendiente ||
                      items.some((item) => !Number.isFinite(item.costo_usdt) || item.costo_usdt < 0) ||
                      total <= 0
                    }
                    className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {pendiente ? "Registrando…" : `Confirmar ${cuentas.length} renovaciones`}
                  </button>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
