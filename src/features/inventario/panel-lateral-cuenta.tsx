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
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
      <div className="flex h-full w-full max-w-2xl flex-col border-l border-neutral-300 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-950">
        {/* Cabecera limpia y espaciosa */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4 dark:border-neutral-800">
          <div>
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">
              {cuenta.esSpotifyFamiliar
                ? "Gestionar Familia y Miembros de Spotify"
                : "Gestionar Cuenta y Perfiles"}
            </h3>
            <p className="font-mono text-xs text-neutral-500 dark:text-neutral-400">
              {cuenta.correo}
            </p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-lg p-2 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
          >
            ✕
          </button>
        </div>

        {/* Contenido scrolleable amplio */}
        <div className="flex-1 overflow-y-auto p-6">
          <PanelEditarCuenta cuenta={cuenta} slug={slug} onCerrar={onCerrar} />
        </div>
      </div>
    </div>
  );
}
