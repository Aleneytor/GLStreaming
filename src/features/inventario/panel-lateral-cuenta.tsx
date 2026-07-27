"use client";

import { PanelEditarCuenta } from "./panel-editar-cuenta";
import type { BloqueCuenta } from "./tabla-inventario";

export function PanelLateralCuenta({
  cuenta,
  slug,
  onCerrar,
}: {
  cuenta: BloqueCuenta;
  slug: string;
  onCerrar: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm">
      <div className="flex h-full w-full max-w-lg flex-col border-l border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-900">
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-neutral-200 p-4 dark:border-neutral-800">
          <div>
            <h3 className="font-semibold text-neutral-900 dark:text-white">
              Detalles de la Cuenta
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {cuenta.correo}
            </p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
          >
            ✕
          </button>
        </div>

        {/* Contenido scrolleable */}
        <div className="flex-1 overflow-y-auto p-4">
          <PanelEditarCuenta cuenta={cuenta} slug={slug} onCerrar={onCerrar} />
        </div>
      </div>
    </div>
  );
}
