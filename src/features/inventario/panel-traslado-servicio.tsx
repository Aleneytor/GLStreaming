"use client";

import { useActionState, useEffect, useState } from "react";
import {
  obtenerDestinosTrasladoAction,
  trasladarServicioPorFallaAction,
  type DestinoTraslado,
} from "./acciones-traslado";

export function PanelTrasladoServicio({
  suscripcionId,
  clienteNombre,
  slug,
  onVolver,
  onTerminado,
  onSeleccionarEnInventario,
}: {
  suscripcionId: string;
  clienteNombre: string;
  slug: string;
  onVolver: () => void;
  onTerminado: () => void;
  onSeleccionarEnInventario?: (destinos: DestinoTraslado[]) => void;
}) {
  const [destinos, setDestinos] = useState<DestinoTraslado[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [seleccion, setSeleccion] = useState("");
  const [estado, action, pendiente] = useActionState(trasladarServicioPorFallaAction, null);

  useEffect(() => {
    let activo = true;
    obtenerDestinosTrasladoAction(suscripcionId).then((resultado) => {
      if (!activo) return;
      if (resultado.ok) {
        setDestinos(resultado.destinos);
        setSeleccion(resultado.destinos[0] ? "0" : "");
      } else {
        setErrorCarga(resultado.error);
      }
      setCargando(false);
    });
    return () => { activo = false; };
  }, [suscripcionId]);

  const destino = seleccion === "" ? null : destinos[Number(seleccion)] ?? null;

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="suscripcion_id" value={suscripcionId} />
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="cuenta_destino_id" value={destino?.cuentaId ?? ""} />
      <input type="hidden" name="unidad_destino_id" value={destino?.unidadId ?? ""} />

      <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
        <strong>Mover el servicio de {clienteNombre}</strong>
        <p className="mt-1 leading-relaxed opacity-85">
          Conserva cliente, precio, vendedor, cobros y fecha de renovación. La cuenta actual
          quedará en mantenimiento y el servicio usará las credenciales del destino.
        </p>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
          Cuenta o cupo de reemplazo
        </label>
        {cargando ? (
          <div className="rounded-lg border border-neutral-200 p-3 text-xs text-neutral-500 dark:border-neutral-700">
            Buscando destinos compatibles…
          </div>
        ) : errorCarga ? (
          <p className="rounded-lg bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {errorCarga}
          </p>
        ) : destinos.length === 0 ? (
          <p className="rounded-lg bg-neutral-100 p-3 text-xs text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
            No hay otra cuenta compatible con cupos preparados y libres. Añade o libera una
            cuenta de la misma modalidad antes de mover este servicio.
          </p>
        ) : (
          <div className="space-y-2">
            {onSeleccionarEnInventario && (
              <button
                type="button"
                onClick={() => onSeleccionarEnInventario(destinos)}
                className="w-full rounded-lg bg-amber-600 px-3 py-2.5 text-xs font-bold text-white transition hover:bg-amber-700"
              >
                Ver inventario y tocar un cupo vacío
              </button>
            )}
            <details className="rounded-lg border border-neutral-200 p-2 dark:border-neutral-700">
              <summary className="cursor-pointer text-xs font-semibold text-neutral-600 dark:text-neutral-300">
                O elegir desde la lista
              </summary>
              <select
                value={seleccion}
                onChange={(evento) => setSeleccion(evento.target.value)}
                className="mt-2 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
              >
                {destinos.map((item, indice) => (
                  <option key={`${item.cuentaId}:${item.unidadId ?? "cuenta"}`} value={indice}>
                    {item.etiqueta}
                  </option>
                ))}
              </select>
            </details>
          </div>
        )}
      </div>

      {estado?.error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-xs font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {estado.error}
        </p>
      )}
      {estado?.ok && (
        <div role="status" className="rounded-lg border border-emerald-400 bg-emerald-50 p-3 text-xs text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
          <strong>Traslado completado</strong>
          <p className="mt-1">{estado.ok}</p>
        </div>
      )}

      <div className="flex items-center justify-end gap-2 border-t border-neutral-200 pt-3 dark:border-neutral-800">
        <button
          type="button"
          onClick={estado?.ok ? onTerminado : onVolver}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-xs font-medium text-neutral-700 dark:border-neutral-700 dark:text-neutral-300"
        >
          {estado?.ok ? "Listo" : "Volver"}
        </button>
        {!estado?.ok && (
          <button
            type="submit"
            disabled={!destino || pendiente || cargando}
            className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {pendiente ? "Moviendo…" : "Confirmar traslado"}
          </button>
        )}
      </div>
    </form>
  );
}
