"use client";

import { useActionState, useEffect, useState } from "react";
import { guardarCuentaInlineAction, type EstadoInline } from "./actions";
import type { BloqueCuenta } from "./tabla-inventario";
import { BotonEliminarCuenta } from "./boton-eliminar-cuenta";
import { CAMPO_ROTAR_CREDENCIALES } from "./contrato-formulario-cuenta";

const CAMPO =
  "w-full rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs text-neutral-900 shadow-sm transition focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:focus:border-neutral-400";

export function PanelEditarCuenta({
  cuenta,
  slug,
  onCerrar,
  onCorreoCambiar,
}: {
  cuenta: BloqueCuenta;
  slug: string;
  onCerrar: () => void;
  onCorreoCambiar?: (correo: string) => void;
}) {
  const [estado, action, pendiente] = useActionState<EstadoInline, FormData>(
    guardarCuentaInlineAction,
    null,
  );
  const [credsCambiadas, setCredsCambiadas] = useState(false);
  const [verClave, setVerClave] = useState(false);
  const [estadoCuenta, setEstadoCuenta] = useState(cuenta.cuentaEstado);
  const [correoCuenta, setCorreoCuenta] = useState(cuenta.correo);
  const [claveCuenta, setClaveCuenta] = useState(cuenta.contrasena);

  useEffect(() => {
    setEstadoCuenta(cuenta.cuentaEstado);
  }, [cuenta.cuentaEstado]);

  useEffect(() => {
    setCorreoCuenta(cuenta.correo);
    setClaveCuenta(cuenta.contrasena);
  }, [cuenta.cuentaId, cuenta.correo, cuenta.contrasena]);

  useEffect(() => {
    if (estado && "ok" in estado && estado.ok) {
      setCredsCambiadas(false);
    }
  }, [estado]);

  const editables = cuenta.filas.filter((f) => f.unidadId || f.clienteId);

  return (
    <form
      action={action}
      onReset={(evento) => evento.preventDefault()}
      className="space-y-6"
    >
      <input type="hidden" name="cuenta_id" value={cuenta.cuentaId} />
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="alias" value={cuenta.alias ?? ""} />
      <input type="hidden" name="notas" value={cuenta.notas ?? ""} />
      <input
        type="hidden"
        name={CAMPO_ROTAR_CREDENCIALES}
        value={credsCambiadas ? "on" : "off"}
      />

      {/* --- SECCIÓN 1: DATOS DE LA CUENTA MADRE --- */}
      <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/60">
        <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
          {cuenta.esSpotifyFamiliar
            ? "Cuenta administradora y configuración de la familia"
            : "Credenciales y Configuración de Cuenta"}
        </h4>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Correo */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              {cuenta.esSpotifyFamiliar ? "Correo administrador de la familia" : "Correo Electrónico"}
            </label>
            <input
              name="correo"
              value={correoCuenta}
              onChange={(evento) => {
                setCorreoCuenta(evento.target.value);
                onCorreoCambiar?.(evento.target.value);
                setCredsCambiadas(true);
              }}
              className={`${CAMPO} font-mono`}
            />
          </div>

          {/* Contraseña */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              {cuenta.esSpotifyFamiliar ? "Clave de la cuenta familiar" : "Contraseña"}
            </label>
            <div className="relative">
              <input
                type={verClave ? "text" : "password"}
                name="contrasena"
                value={claveCuenta}
                onChange={(evento) => {
                  setClaveCuenta(evento.target.value);
                  setCredsCambiadas(true);
                }}
                className={`${CAMPO} font-mono pr-8`}
              />
              <button
                type="button"
                onClick={() => setVerClave(!verClave)}
                className="absolute right-2 top-1/2 -tranneutral-y-1/2 text-xs text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
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
            <select
              name="estado"
              value={estadoCuenta}
              onChange={(evento) => setEstadoCuenta(evento.target.value)}
              className={CAMPO}
            >
              <option value="activa">🟢 Activa</option>
              <option value="mantenimiento">🟡 Mantenimiento</option>
              <option value="suspendida">🔴 Suspendida</option>
              <option value="archivada">📦 Archivada</option>
            </select>
          </div>

          {/* Proveedor, Costo y Fecha de Renovación */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
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
            <div>
              <label className="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Renovación Proveedor
              </label>
              <input
                type="date"
                name="renovar_proveedor"
                defaultValue={cuenta.renovarProveedor ?? ""}
                className={`${CAMPO} font-mono`}
              />
            </div>
          </div>
        </div>

        {cuenta.esSpotifyFamiliar && (
          <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950/25">
            <label className="mb-1 block text-xs font-semibold text-blue-950 dark:text-blue-100">
              Admisión de nuevos miembros
            </label>
            <select
              name="spotify_estado_admision"
              defaultValue={
                cuenta.admisionSpotifyBloqueada ? "bloqueada_por_spotify" : "abierta"
              }
              className={CAMPO}
            >
              <option value="abierta">Abierta · permite vender cupos libres</option>
              <option value="bloqueada_por_spotify">
                Bloqueada por Spotify · “No se puede”
              </option>
            </select>
            <label className="mb-1 mt-3 block text-[11px] font-medium text-blue-800 dark:text-blue-200">
              Motivo del bloqueo (opcional)
            </label>
            <input
              name="spotify_motivo_bloqueo"
              defaultValue={cuenta.motivoBloqueoSpotify ?? ""}
              placeholder="Ej. Spotify bloqueó temporalmente nuevas incorporaciones"
              className={CAMPO}
            />
            <p className="mt-2 text-[11px] leading-relaxed text-blue-800 dark:text-blue-200">
              Este estado pertenece a toda la familia, no a un Gmail específico. Puedes
              abrirla de nuevo cuando Spotify permita agregar miembros.
            </p>
          </div>
        )}
      </div>

      {/* --- SECCIÓN 2: PERFILES / CUPOS DE LA CUENTA --- */}
      {editables.length > 0 && (
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/60">
          <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            {cuenta.esSpotifyFamiliar ? "Miembros, accesos y clientes" : "Perfiles y Clientes Asignados"}
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

                <div className={`grid gap-3 ${cuenta.esSpotifyFamiliar ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
                  {cuenta.esSpotifyFamiliar && f.unidadId ? (
                    <>
                      <input
                        type="hidden"
                        name={`spotify_suscripcion_${f.unidadId}`}
                        value={f.suscripcionId ?? ""}
                      />
                      <input
                        type="hidden"
                        name={`spotify_original_login_${f.unidadId}`}
                        value={f.clienteLogin ?? ""}
                      />
                      <input
                        type="hidden"
                        name={`spotify_original_clave_${f.unidadId}`}
                        value={f.clienteClave ?? ""}
                      />
                      <input
                        type="hidden"
                        name={`spotify_original_tipo_${f.unidadId}`}
                        value={f.clienteTipoCorreo ?? ""}
                      />
                      <div>
                        <label className="mb-1 block text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                          Correo del miembro
                        </label>
                        <input
                          type="email"
                          name={`spotify_login_${f.unidadId}`}
                          defaultValue={f.clienteLogin ?? ""}
                          placeholder="Sin correo preparado"
                          className={`${CAMPO} font-mono`}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                          Clave del miembro
                        </label>
                        <input
                          name={`spotify_clave_${f.unidadId}`}
                          defaultValue={f.clienteClave ?? ""}
                          placeholder="Sin clave preparada"
                          className={`${CAMPO} font-mono`}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                          Titularidad del correo
                        </label>
                        <select
                          name={`spotify_tipo_${f.unidadId}`}
                          defaultValue={
                            f.clienteTipoCorreo === "dominio_gl" ||
                            f.clienteTipoCorreo === "gmail_propio" ||
                            f.clienteTipoCorreo === "correo_cliente"
                              ? f.clienteTipoCorreo
                              : /@(glstreaming\.org|glcuenta\.com)$/i.test(
                                    f.clienteLogin ?? "",
                                  )
                                ? "dominio_gl"
                                : "gmail_propio"
                          }
                          className={CAMPO}
                        >
                          <option value="dominio_gl">Dominio GL · correo mío</option>
                          <option value="gmail_propio">Gmail/otro correo mío</option>
                          {f.suscripcionId && (
                            <option value="correo_cliente">Correo del cliente</option>
                          )}
                        </select>
                      </div>
                    </>
                  ) : f.unidadId ? (
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
                  ) : null}

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
        <BotonEliminarCuenta
          cuentaId={cuenta.cuentaId}
          etiqueta={cuenta.correo}
          slug={slug}
          onEliminada={onCerrar}
        />

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
