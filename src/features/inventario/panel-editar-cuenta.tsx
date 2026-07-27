"use client";

import { useActionState, useState } from "react";
import { guardarCuentaInlineAction, type EstadoInline } from "./actions";
import type { BloqueCuenta } from "./tabla-inventario";
import { BotonEliminarCuenta } from "./boton-eliminar-cuenta";

const CAMPO =
  "w-full rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs text-neutral-900 shadow-sm transition focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:focus:border-neutral-400";

export function PanelEditarCuenta({
  cuenta,
  slug,
  onCerrar,
}: {
  cuenta: BloqueCuenta;
  slug: string;
  onCerrar: () => void;
}) {
  const [estado, action, pendiente] = useActionState<EstadoInline, FormData>(
    guardarCuentaInlineAction,
    null,
  );
  const [credsCambiadas, setCredsCambiadas] = useState(false);
  const [verClave, setVerClave] = useState(false);

  const editables = cuenta.filas.filter((f) => f.unidadId || f.clienteId);

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="cuenta_id" value={cuenta.cuentaId} />
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="alias" value={cuenta.alias ?? ""} />
      <input type="hidden" name="notas" value={cuenta.notas ?? ""} />
      <input type="hidden" name="creds_cambiadas" value={credsCambiadas ? "1" : "0"} />

      {/* --- SECCIÓN 1: DATOS DE LA CUENTA MADRE --- */}
      <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/60">
        <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
          Credenciales y Configuración de Cuenta
        </h4>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Correo */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Correo Electrónico
            </label>
            <input
              name="correo"
              defaultValue={cuenta.correo}
              onChange={() => setCredsCambiadas(true)}
              className={`${CAMPO} font-mono`}
            />
          </div>

          {/* Contraseña */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Contraseña
            </label>
            <div className="relative">
              <input
                type={verClave ? "text" : "password"}
                name="contrasena"
                defaultValue={cuenta.contrasena}
                onChange={() => setCredsCambiadas(true)}
                className={`${CAMPO} font-mono pr-8`}
              />
              <button
                type="button"
                onClick={() => setVerClave(!verClave)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
              >
                {verClave ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          {/* Estado de Cuenta */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Estado de la Cuenta
            </label>
            <select name="estado" defaultValue={cuenta.cuentaEstado} className={CAMPO}>
              <option value="activa">🟢 Activa</option>
              <option value="mantenimiento">🟡 Mantenimiento</option>
              <option value="suspendida">🔴 Suspendida</option>
              <option value="archivada">📦 Archivada</option>
            </select>
          </div>

          {/* Proveedor y Costo */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Proveedor
              </label>
              <input name="proveedor" defaultValue={cuenta.proveedor ?? ""} className={CAMPO} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Costo ($ USDT)
              </label>
              <input
                name="costo"
                inputMode="decimal"
                defaultValue={cuenta.costo != null ? cuenta.costo.toFixed(2) : ""}
                placeholder="0.00"
                className={`${CAMPO} font-mono tabular-nums`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* --- SECCIÓN 2: PERFILES / CUPOS DE LA CUENTA --- */}
      {editables.length > 0 && (
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/60">
          <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            Perfiles y Clientes Asignados
          </h4>

          <div className="space-y-3">
            {editables.map((f) => (
              <div
                key={f.clave}
                className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900/90"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-neutral-800 dark:text-neutral-200">
                    {f.cupo}
                  </span>
                  {f.cliente ? (
                    <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                      Asignado: {f.cliente}
                    </span>
                  ) : (
                    <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                      Libre (Vacío)
                    </span>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  {f.unidadId && (
                    <>
                      <div>
                        <label className="mb-1 block text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                          Nombre del Perfil
                        </label>
                        <input
                          name={`nombre_${f.unidadId}`}
                          defaultValue={f.nombreUnidad ?? ""}
                          className={CAMPO}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                          PIN (4 dígitos)
                        </label>
                        <input
                          name={`pin_${f.unidadId}`}
                          placeholder="sin cambiar"
                          className={`${CAMPO} font-mono`}
                        />
                      </div>
                    </>
                  )}

                  {f.clienteId ? (
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                        Nombre Cliente
                      </label>
                      <input
                        name={`cliente_${f.clienteId}`}
                        defaultValue={f.cliente ?? ""}
                        className={CAMPO}
                      />
                    </div>
                  ) : (
                    <div className="flex items-end">
                      <span className="text-xs text-neutral-400 italic">Sin cliente asignado</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- ERRORES / ÉXITO --- */}
      {estado && "error" in estado && estado.error && (
        <p className="rounded-lg bg-red-50 p-3 text-xs font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300">
          ⚠️ {estado.error}
        </p>
      )}
      {estado && "ok" in estado && estado.ok && (
        <p className="rounded-lg bg-emerald-50 p-3 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
          ✅ {estado.ok}
        </p>
      )}

      {/* --- BOTONES DE ACCIÓN --- */}
      <div className="flex items-center justify-between border-t border-neutral-200 pt-4 dark:border-neutral-800">
        <BotonEliminarCuenta cuentaId={cuenta.cuentaId} etiqueta="Eliminar Cuenta" />

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-lg border border-neutral-300 px-4 py-2 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={pendiente}
            className="rounded-lg bg-neutral-900 px-5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-neutral-800 active:scale-[0.98] disabled:opacity-50 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
          >
            {pendiente ? "Guardando..." : "Guardar Cambios"}
          </button>
        </div>
      </div>
    </form>
  );
}
