"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { eliminarCuentaAction } from "./actions";

/**
 * Borrar una cuenta es destructivo (se lleva su historial), así que va detrás
 * de una confirmación con el nombre a la vista.
 */
export function BotonEliminarCuenta({
  cuentaId,
  etiqueta,
  slug = "",
  onEliminada,
}: {
  cuentaId: string;
  etiqueta: string;
  slug?: string;
  onEliminada?: () => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, startTransition] = useTransition();
  const router = useRouter();

  function confirmarBorrado() {
    setError(null);
    startTransition(async () => {
      const datos = new FormData();
      datos.set("cuenta_id", cuentaId);
      datos.set("slug", slug);
      const resultado = await eliminarCuentaAction(null, datos);
      if (resultado?.error) {
        setError(resultado.error);
        return;
      }
      onEliminada?.();
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl border border-red-200 p-4 dark:border-red-950">
      <p className="text-sm font-medium text-red-700 dark:text-red-400">Zona peligrosa</p>
      <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
        Borrar la cuenta elimina también sus perfiles, credenciales, ventas, cobros y
        ciclos de proveedor. No se puede deshacer.
      </p>

      {!abierto ? (
        <button
          type="button"
          onClick={() => setAbierto(true)}
          className="mt-3 rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 transition active:scale-[0.98] dark:border-red-900 dark:text-red-400"
        >
          Eliminar cuenta
        </button>
      ) : (
        <div className="mt-3 space-y-2">
          <p className="text-sm">
            ¿Seguro que quieres borrar <strong>{etiqueta}</strong> y todo su historial?
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setAbierto(false)}
              className="rounded-lg border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-700"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={confirmarBorrado}
              disabled={pendiente}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition active:scale-[0.98] disabled:opacity-60"
            >
              {pendiente ? "Borrando…" : "Sí, borrar todo"}
            </button>
          </div>
          {error && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
