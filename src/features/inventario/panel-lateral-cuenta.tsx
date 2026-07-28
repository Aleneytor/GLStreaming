"use client";

import { PanelEditarCuenta } from "./panel-editar-cuenta";
import type { BloqueCuenta } from "./tabla-inventario";
import { BotonLimpieza } from "@/features/ventas/boton-limpieza";

export function PanelLateralCuenta({
  cuenta,
  slug,
  retiroPendiente,
  onCerrar,
}: {
  cuenta: BloqueCuenta;
  slug: string;
  retiroPendiente?: { id: string; unidadNombre: string } | null;
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
          {retiroPendiente && (
            <div className="mb-5 rounded-xl border-2 border-amber-400 bg-amber-50 p-4 text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">
              <p className="text-sm font-bold">Retiro pendiente: {retiroPendiente.unidadNombre}</p>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs leading-relaxed">
                <li>Usa las credenciales de esta cuenta para entrar en la plataforma real.</li>
                <li>Retira el perfil, dispositivo o correo que pertenecía al cliente.</li>
                <li>Solo después pulsa <strong>Confirmar retiro</strong>.</li>
              </ol>
              <p className="mt-2 text-xs font-medium">
                GL no puede detectar automáticamente esa acción externa; tu confirmación libera el cupo.
              </p>
              <div className="mt-3">
                <BotonLimpieza operacionId={retiroPendiente.id} />
              </div>
            </div>
          )}
          <PanelEditarCuenta cuenta={cuenta} slug={slug} onCerrar={onCerrar} />
        </div>
      </div>
    </div>
  );
}
