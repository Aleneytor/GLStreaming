"use client";

import { useActionState, useState } from "react";
import { guardarCuentaInlineAction, type EstadoInline } from "./actions";
import type { BloqueCuenta } from "./tabla-inventario";

const CAMPO =
  "w-full rounded-lg border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900";

/**
 * Panel de edición que se despliega dentro de la fila de una cuenta. Reúne en
 * un solo sitio lo que antes eran varias pantallas: correo/contraseña/estado/
 * proveedor/costo de la cuenta madre y, por cada perfil, su nombre, PIN y el
 * nombre del cliente. Guarda todo de una vez y se queda en la misma página.
 */
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
  // Solo se rotan las credenciales si el usuario las tocó (evita marcarlas
  // como "cambiadas" sin querer, que dispararía avisos de reenvío).
  const [credsCambiadas, setCredsCambiadas] = useState(false);

  const editables = cuenta.filas.filter((f) => f.unidadId || f.clienteId);

  return (
    <form
      action={action}
      className="space-y-4 rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/50"
    >
      <input type="hidden" name="cuenta_id" value={cuenta.cuentaId} />
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="alias" value={cuenta.alias ?? ""} />
      <input type="hidden" name="notas" value={cuenta.notas ?? ""} />
      <input type="hidden" name="creds_cambiadas" value={credsCambiadas ? "1" : "0"} />

      {/* --- Cuenta madre --- */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block text-xs">
          <span className="mb-1 block text-neutral-500 dark:text-neutral-400">Correo cuenta</span>
          <input
            name="correo"
            defaultValue={cuenta.correo}
            onChange={() => setCredsCambiadas(true)}
            className={`${CAMPO} font-mono`}
          />
        </label>
        <label className="block text-xs">
          <span className="mb-1 block text-neutral-500 dark:text-neutral-400">Contraseña</span>
          <input
            name="contrasena"
            defaultValue={cuenta.contrasena}
            onChange={() => setCredsCambiadas(true)}
            className={`${CAMPO} font-mono`}
          />
        </label>
        <label className="block text-xs">
          <span className="mb-1 block text-neutral-500 dark:text-neutral-400">Estado</span>
          <select name="estado" defaultValue={cuenta.cuentaEstado} className={CAMPO}>
            <option value="activa">activa</option>
            <option value="mantenimiento">mantenimiento</option>
            <option value="suspendida">suspendida</option>
            <option value="archivada">archivada</option>
          </select>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-xs">
            <span className="mb-1 block text-neutral-500 dark:text-neutral-400">Proveedor</span>
            <input name="proveedor" defaultValue={cuenta.proveedor ?? ""} className={CAMPO} />
          </label>
          <label className="block text-xs">
            <span className="mb-1 block text-neutral-500 dark:text-neutral-400">Costo $</span>
            <input
              name="costo"
              inputMode="decimal"
              defaultValue={cuenta.costo != null ? cuenta.costo.toFixed(2) : ""}
              placeholder="—"
              className={`${CAMPO} tabular-nums`}
            />
          </label>
        </div>
      </div>

      {/* --- Perfiles / cupos --- */}
      {editables.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Perfiles
          </p>
          <div className="space-y-2">
            {editables.map((f) => (
              <div
                key={f.clave}
                className="grid items-end gap-2 sm:grid-cols-[auto_1fr_auto_1fr]"
              >
                <span className="text-xs text-neutral-400">{f.cupo}</span>
                {f.unidadId ? (
                  <>
                    <label className="block text-xs">
                      <span className="mb-0.5 block text-neutral-500 dark:text-neutral-400">
                        Nombre del perfil
                      </span>
                      <input
                        name={`nombre_${f.unidadId}`}
                        defaultValue={f.nombreUnidad ?? ""}
                        className={CAMPO}
                      />
                    </label>
                    <label className="block text-xs">
                      <span className="mb-0.5 block text-neutral-500 dark:text-neutral-400">
                        PIN
                      </span>
                      <input
                        name={`pin_${f.unidadId}`}
                        placeholder="sin cambiar"
                        className={`${CAMPO} w-24 font-mono`}
                      />
                    </label>
                  </>
                ) : (
                  <span className="sm:col-span-2" />
                )}
                {f.clienteId ? (
                  <label className="block text-xs">
                    <span className="mb-0.5 block text-neutral-500 dark:text-neutral-400">
                      Cliente
                    </span>
                    <input
                      name={`cliente_${f.clienteId}`}
                      defaultValue={f.cliente ?? ""}
                      className={CAMPO}
                    />
                  </label>
                ) : (
                  <span className="text-xs text-emerald-600 dark:text-emerald-400">libre</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pendiente}
          className="rounded-lg bg-neutral-900 px-4 py-1.5 text-sm font-medium text-white transition active:scale-[0.98] disabled:opacity-60 dark:bg-white dark:text-neutral-900"
        >
          {pendiente ? "Guardando…" : "Guardar"}
        </button>
        <button
          type="button"
          onClick={onCerrar}
          className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700"
        >
          Cerrar
        </button>
        {estado?.error && (
          <span role="alert" className="text-sm text-red-600 dark:text-red-400">
            {estado.error}
          </span>
        )}
        {estado?.ok && (
          <span className="text-sm text-emerald-600 dark:text-emerald-400">{estado.ok}</span>
        )}
      </div>
    </form>
  );
}
