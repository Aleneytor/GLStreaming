"use client";

import { useActionState } from "react";
import { venderUnidadRapidaAction } from "./actions";

export function ModalVentaRapida({
  cuentaId,
  unidadId,
  nombrePerfil,
  slug,
  onCerrar,
}: {
  cuentaId: string;
  unidadId: string | null;
  nombrePerfil: string;
  slug: string;
  onCerrar: () => void;
}) {
  const [estado, action, pendiente] = useActionState(venderUnidadRapidaAction, null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-6 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
              ⚡ Registrar Venta Directa
            </h3>
            <p className="font-mono text-xs text-neutral-500 dark:text-neutral-400">
              {nombrePerfil}
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
          {unidadId && <input type="hidden" name="unidad_id" value={unidadId} />}
          <input type="hidden" name="slug" value={slug} />

          <div>
            <label className="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Nombre del Cliente *
            </label>
            <input
              name="cliente_nombre"
              required
              placeholder="Ej. Juan Pérez"
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs text-neutral-900 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              WhatsApp / Teléfono
            </label>
            <input
              name="cliente_whatsapp"
              placeholder="+584121234567"
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-mono text-neutral-900 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Precio Comercial ($ USD) *
            </label>
            <input
              name="precio_usd"
              required
              inputMode="decimal"
              placeholder="2.50"
              defaultValue="2.50"
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-mono text-neutral-900 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
            />
            <p className="mt-1 text-[10px] text-neutral-500 dark:text-neutral-400">
              El equivalente en Bs se calcula automáticamente a tasa BCV y se suma a la Caja.
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
              className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
            >
              {pendiente ? "Procesando..." : "Confirmar Venta"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
