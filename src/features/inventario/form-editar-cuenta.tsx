"use client";

import { useActionState } from "react";
import Link from "next/link";
import { actualizarCuentaAction, type EstadoAlta } from "./actions";
import type { ProveedorOpcion } from "./form-cuenta";

const claseCampo =
  "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-base outline-none transition focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-neutral-300";

export type CuentaEditable = {
  id: string;
  alias: string | null;
  notas: string | null;
  estado: string;
  proveedor: string | null;
  producto: string;
  plataforma: string;
  capacidad: number;
};

export function FormEditarCuenta({
  cuenta,
  proveedores,
}: {
  cuenta: CuentaEditable;
  proveedores: ProveedorOpcion[];
}) {
  const [estado, formAction, pendiente] = useActionState<EstadoAlta, FormData>(
    actualizarCuentaAction,
    null,
  );

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="cuenta_id" value={cuenta.id} />

      {/* Producto y capacidad no se editan: son identidad histórica. */}
      <div className="rounded-xl bg-neutral-100 p-4 text-sm dark:bg-neutral-900">
        <p className="font-medium">
          {cuenta.plataforma} · {cuenta.producto}
        </p>
        <p className="mt-1 text-neutral-500 dark:text-neutral-400">
          Capacidad {cuenta.capacidad}. El producto y la capacidad no se pueden
          cambiar: para eso se archiva esta cuenta y se crea otra.
        </p>
      </div>

      <div>
        <label htmlFor="alias" className="mb-1.5 block text-sm font-medium">
          Alias
        </label>
        <input
          id="alias"
          name="alias"
          type="text"
          defaultValue={cuenta.alias ?? ""}
          placeholder="ej. Netflix 1"
          className={claseCampo}
        />
      </div>

      <div>
        <label htmlFor="estado" className="mb-1.5 block text-sm font-medium">
          Estado
        </label>
        <select
          id="estado"
          name="estado"
          defaultValue={cuenta.estado}
          className={claseCampo}
        >
          <option value="activa">Activa</option>
          <option value="mantenimiento">En mantenimiento</option>
          <option value="suspendida">Suspendida</option>
          <option value="archivada">Archivada</option>
        </select>
      </div>

      <div>
        <label htmlFor="proveedor" className="mb-1.5 block text-sm font-medium">
          Proveedor
        </label>
        <input
          id="proveedor"
          name="proveedor"
          type="text"
          list="lista-proveedores"
          defaultValue={cuenta.proveedor ?? ""}
          placeholder="Yo, un nombre o un teléfono…"
          className={claseCampo}
        />
        <datalist id="lista-proveedores">
          {proveedores.map((p) => (
            <option key={p.id} value={p.etiqueta} />
          ))}
        </datalist>
        <p className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-400">
          Cambiarlo no reescribe ciclos ya registrados.
        </p>
      </div>

      <div>
        <label htmlFor="notas" className="mb-1.5 block text-sm font-medium">
          Notas
        </label>
        <textarea
          id="notas"
          name="notas"
          rows={3}
          defaultValue={cuenta.notas ?? ""}
          className={claseCampo}
        />
      </div>

      <fieldset className="space-y-4 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
        <legend className="px-1 text-sm font-medium">Cambiar credenciales</legend>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Déjalos <strong>vacíos</strong> si no quieres cambiarlos. Para ver los
          actuales usa <em>Ver credenciales</em> en el inventario.
        </p>

        <div>
          <label htmlFor="correo" className="mb-1.5 block text-sm font-medium">
            Nuevo correo
          </label>
          <input
            id="correo"
            name="correo"
            type="text"
            inputMode="email"
            autoComplete="off"
            placeholder="(sin cambios)"
            className={claseCampo}
          />
        </div>

        <div>
          <label htmlFor="contrasena" className="mb-1.5 block text-sm font-medium">
            Nueva contraseña
          </label>
          <input
            id="contrasena"
            name="contrasena"
            type="text"
            autoComplete="off"
            placeholder="(sin cambios)"
            className={claseCampo}
          />
        </div>
      </fieldset>

      {estado?.error && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
        >
          {estado.error}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pendiente}
          className="flex-1 rounded-lg bg-neutral-900 px-4 py-3 text-base font-medium text-white transition active:scale-[0.99] disabled:opacity-60 dark:bg-white dark:text-neutral-900"
        >
          {pendiente ? "Guardando…" : "Guardar cambios"}
        </button>
        <Link
          href="/inventario"
          className="rounded-lg border border-neutral-300 px-4 py-3 text-base transition active:scale-[0.99] dark:border-neutral-700"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
