"use client";

import { useActionState, useState } from "react";
import {
  cambiarEstadoAction,
  cancelarAction,
  recordatorioAction,
  renovarAction,
  type EstadoAccion,
} from "./acciones-suscripcion";

const campo =
  "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-base outline-none transition focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-neutral-300";
const btnPrimario =
  "rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition active:scale-[0.98] disabled:opacity-60 dark:bg-white dark:text-neutral-900";
const btnSecundario =
  "rounded-lg border border-neutral-300 px-3 py-2 text-sm transition active:scale-[0.98] dark:border-neutral-700";

function Aviso({ estado }: { estado: EstadoAccion }) {
  if (!estado) return null;
  return estado.error ? (
    <p role="alert" className="text-sm text-red-600 dark:text-red-400">
      {estado.error}
    </p>
  ) : (
    <p className="text-sm text-emerald-600 dark:text-emerald-400">{estado.ok}</p>
  );
}

export function PanelSuscripcion({
  suscripcionId,
  estado,
  proximaRenovacion,
  recontactarEl,
  nota,
  bcv,
}: {
  suscripcionId: string;
  estado: string;
  proximaRenovacion: string | null;
  recontactarEl: string | null;
  nota: string | null;
  /** BCV vigente, solo para mostrar el equivalente en USD mientras escribes. */
  bcv?: number | null;
}) {
  const [renov, accionRenovar, renovando] = useActionState<EstadoAccion, FormData>(
    renovarAction,
    null,
  );
  const [cambio, accionCambiar, cambiando] = useActionState<EstadoAccion, FormData>(
    cambiarEstadoAction,
    null,
  );
  const [canc, accionCancelar, cancelando] = useActionState<EstadoAccion, FormData>(
    cancelarAction,
    null,
  );
  const [rec, accionRecordar, recordando] = useActionState<EstadoAccion, FormData>(
    recordatorioAction,
    null,
  );

  const [confirmarCancelar, setConfirmarCancelar] = useState(false);
  const [montoVes, setMontoVes] = useState("");
  const cerrada = estado === "cancelada" || estado === "finalizada";
  const hoy = new Date().toISOString().slice(0, 10);

  // Equivalente en USD del monto que se está escribiendo. Es solo una ayuda
  // visual: el valor que se congela lo calcula la base con su propia tasa.
  const montoNumero = Number(montoVes.replace(/\./g, "").replace(",", "."));
  const usdAprox =
    bcv && bcv > 0 && Number.isFinite(montoNumero) && montoNumero > 0
      ? montoNumero / bcv
      : null;

  if (cerrada) {
    return (
      <p className="rounded-lg bg-neutral-100 px-3 py-2 text-sm text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
        Suscripción {estado}.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {/* Renovar */}
      <form action={accionRenovar} className="space-y-2">
        <input type="hidden" name="suscripcion_id" value={suscripcionId} />
        <p className="text-sm font-medium">Renovar y cobrar</p>
        <div className="grid grid-cols-3 gap-2">
          <input
            name="inicio"
            type="date"
            required
            defaultValue={proximaRenovacion ?? hoy}
            aria-label="Inicio del nuevo período"
            className={campo}
          />
          <select name="meses" defaultValue={1} aria-label="Meses" className={campo}>
            {[1, 3, 6, 12].map((m) => (
              <option key={m} value={m}>
                {m} {m === 1 ? "mes" : "meses"}
              </option>
            ))}
          </select>
          <input
            name="monto_ves"
            inputMode="decimal"
            placeholder="Bs recibidos"
            aria-label="Bolívares recibidos"
            value={montoVes}
            onChange={(e) => setMontoVes(e.target.value)}
            className={campo}
          />
        </div>
        {usdAprox !== null && (
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            ≈ {usdAprox.toFixed(2)} USD a {bcv?.toLocaleString("es-VE")} Bs/USD
          </p>
        )}
        <label className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
          <input type="checkbox" name="tardia" />
          Pagó tarde: empezar en la fecha real del pago
        </label>
        <button type="submit" disabled={renovando} className={btnPrimario}>
          {renovando ? "…" : montoVes ? "Renovar y cobrar" : "Renovar sin cobro"}
        </button>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Si dejas los bolívares en blanco, la renovación queda registrada y el
          cobro pendiente en «Por cobrar».
        </p>
        <Aviso estado={renov} />
      </form>

      {/* Pausar / reactivar */}
      <form action={accionCambiar} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="suscripcion_id" value={suscripcionId} />
        <input
          type="hidden"
          name="estado"
          value={estado === "pausada" ? "activa" : "pausada"}
        />
        <button type="submit" disabled={cambiando} className={btnSecundario}>
          {estado === "pausada" ? "Reactivar" : "Pausar"}
        </button>
        <span className="text-xs text-neutral-500 dark:text-neutral-400">
          Pausar conserva el perfil apartado para este cliente.
        </span>
        <Aviso estado={cambio} />
      </form>

      {/* Recordatorio */}
      <form action={accionRecordar} className="space-y-2">
        <input type="hidden" name="suscripcion_id" value={suscripcionId} />
        <p className="text-sm font-medium">Recontactar</p>
        <div className="grid grid-cols-2 gap-2">
          <input
            name="recontactar_el"
            type="date"
            defaultValue={recontactarEl ?? ""}
            aria-label="Fecha para recontactar"
            className={campo}
          />
          <input
            name="nota"
            defaultValue={nota ?? ""}
            placeholder="ej. prometió pagar el 24"
            aria-label="Nota"
            className={campo}
          />
        </div>
        <button type="submit" disabled={recordando} className={btnSecundario}>
          {recordando ? "…" : "Guardar recordatorio"}
        </button>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Es solo un recordatorio comercial: no crea período ni ingreso.
        </p>
        <Aviso estado={rec} />
      </form>

      {/* Cancelar */}
      <form action={accionCancelar} className="space-y-2 border-t border-neutral-200 pt-4 dark:border-neutral-800">
        <input type="hidden" name="suscripcion_id" value={suscripcionId} />
        {!confirmarCancelar ? (
          <button
            type="button"
            onClick={() => setConfirmarCancelar(true)}
            className="text-sm text-red-600 underline dark:text-red-400"
          >
            Cancelar y liberar el perfil
          </button>
        ) : (
          <div className="space-y-2 rounded-lg bg-red-50 p-3 dark:bg-red-950/40">
            <p className="text-sm text-red-800 dark:text-red-300">
              El perfil quedará <strong>pendiente de limpieza</strong>: no vuelve al
              stock hasta que confirmes que lo borraste en la plataforma.
            </p>
            <select name="motivo" defaultValue="no_renovacion" className={campo}>
              <option value="no_renovacion">No renovó</option>
              <option value="cancelacion">Cancelación</option>
              <option value="otro">Otro</option>
            </select>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={cancelando}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {cancelando ? "…" : "Confirmar cancelación"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmarCancelar(false)}
                className={btnSecundario}
              >
                Volver
              </button>
            </div>
          </div>
        )}
        <Aviso estado={canc} />
      </form>
    </div>
  );
}
