"use client";

import { useActionState, useState } from "react";
import {
  actualizarPlataformaAction,
  actualizarProductoAction,
  guardarProveedorAction,
  guardarVendedorAction,
  type EstadoCatalogo,
} from "./actions";

const campo =
  "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-base outline-none transition focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-neutral-300";
const boton =
  "rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition active:scale-[0.98] disabled:opacity-60 dark:bg-white dark:text-neutral-900";

function Mensaje({ estado }: { estado: EstadoCatalogo }) {
  if (!estado) return null;
  if (estado.error)
    return (
      <p role="alert" className="text-sm text-red-600 dark:text-red-400">
        {estado.error}
      </p>
    );
  return <p className="text-sm text-emerald-600 dark:text-emerald-400">{estado.ok}</p>;
}

export function EditorPlataforma({
  plataforma,
}: {
  plataforma: { id: string; nombre: string; activa: boolean };
}) {
  const [estado, action, pendiente] = useActionState<EstadoCatalogo, FormData>(
    actualizarPlataformaAction,
    null,
  );

  return (
    <form action={action} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="id" value={plataforma.id} />
      <input
        name="nombre"
        defaultValue={plataforma.nombre}
        aria-label="Nombre de la plataforma"
        className={`${campo} min-w-0 flex-1`}
      />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="activa" defaultChecked={plataforma.activa} />
        Activa
      </label>
      <button type="submit" disabled={pendiente} className={boton}>
        {pendiente ? "…" : "Guardar"}
      </button>
      <Mensaje estado={estado} />
    </form>
  );
}

export function EditorProducto({
  producto,
}: {
  producto: {
    id: string;
    nombre: string;
    codigo: string;
    estado_comercial: string;
    permite_renovaciones: boolean;
    activo: boolean;
    capacidad_fija: number | null;
    capacidad_vendible_predeterminada: number | null;
  };
}) {
  const [estado, action, pendiente] = useActionState<EstadoCatalogo, FormData>(
    actualizarProductoAction,
    null,
  );

  return (
    <form
      action={action}
      className="space-y-3 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800"
    >
      <input type="hidden" name="id" value={producto.id} />

      <div className="flex items-start justify-between gap-3">
        <input
          name="nombre"
          defaultValue={producto.nombre}
          aria-label="Nombre del producto"
          className={`${campo} min-w-0 flex-1`}
        />
        <span className="shrink-0 rounded-full bg-neutral-100 px-2.5 py-1 text-xs tabular-nums dark:bg-neutral-800">
          {producto.capacidad_vendible_predeterminada ?? producto.capacidad_fija ?? "—"}/
          {producto.capacidad_fija ?? "—"}
        </span>
      </div>

      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        Código <code>{producto.codigo}</code>. La capacidad no se edita aquí: es una
        regla de dominio y cambiarla desincronizaría las cuentas ya creadas.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm">
          Estado comercial
          <select
            name="estado_comercial"
            defaultValue={producto.estado_comercial}
            className={`${campo} mt-1`}
          >
            <option value="abierto">Abierto (admite ventas nuevas)</option>
            <option value="solo_cartera">Solo cartera (sin ventas nuevas)</option>
            <option value="cerrado">Cerrado</option>
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="permite_renovaciones"
            defaultChecked={producto.permite_renovaciones}
          />
          Permite renovaciones
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="activo" defaultChecked={producto.activo} />
          Activo
        </label>
        <button type="submit" disabled={pendiente} className={boton}>
          {pendiente ? "…" : "Guardar"}
        </button>
      </div>
      <Mensaje estado={estado} />
    </form>
  );
}

export type VendedorFila = {
  id: string;
  nombre: string;
  alias: string | null;
  usuario_id: string | null;
  activo: boolean;
};

/** Un vendedor puede existir sin login; vincularlo le permite ver sus ventas. */
export function EditorVendedor({
  vendedor,
  usuarios,
}: {
  vendedor?: VendedorFila;
  usuarios: { id: string; nombre: string; rol: string }[];
}) {
  const [estado, action, pendiente] = useActionState<EstadoCatalogo, FormData>(
    guardarVendedorAction,
    null,
  );
  const [abierto, setAbierto] = useState(!vendedor);

  if (vendedor && !abierto) {
    const vinculado = usuarios.find((u) => u.id === vendedor.usuario_id);
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
        <div className="min-w-0">
          <p className="truncate font-medium">
            {vendedor.nombre}
            {!vendedor.activo && (
              <span className="ml-2 rounded-full bg-neutral-200 px-2 py-0.5 text-xs dark:bg-neutral-700">
                inactivo
              </span>
            )}
          </p>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {vinculado ? `Entra como ${vinculado.nombre}` : "Sin acceso a la app"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAbierto(true)}
          className="shrink-0 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700"
        >
          Editar
        </button>
      </div>
    );
  }

  return (
    <form
      action={action}
      className="space-y-3 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800"
    >
      {vendedor && <input type="hidden" name="id" value={vendedor.id} />}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          Nombre
          <input
            name="nombre"
            required
            defaultValue={vendedor?.nombre ?? ""}
            className={`${campo} mt-1`}
          />
        </label>
        <label className="text-sm">
          Alias
          <input
            name="alias"
            defaultValue={vendedor?.alias ?? ""}
            className={`${campo} mt-1`}
          />
        </label>
      </div>

      <label className="block text-sm">
        Usuario de la app <span className="text-neutral-400">(opcional)</span>
        <select
          name="usuario_id"
          defaultValue={vendedor?.usuario_id ?? ""}
          className={`${campo} mt-1`}
        >
          <option value="">Sin acceso a la app</option>
          {usuarios.map((u) => (
            <option key={u.id} value={u.id}>
              {u.nombre} ({u.rol})
            </option>
          ))}
        </select>
        <span className="mt-1 block text-xs text-neutral-500 dark:text-neutral-400">
          Vincularlo es lo que le permite entrar y ver <strong>sus</strong> ventas.
          Puedes registrar ventas suyas aunque todavía no tenga acceso.
        </span>
      </label>

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="activo" defaultChecked={vendedor?.activo ?? true} />
          Activo
        </label>
        <button type="submit" disabled={pendiente} className={boton}>
          {pendiente ? "…" : vendedor ? "Guardar" : "Crear vendedor"}
        </button>
        {vendedor && (
          <button
            type="button"
            onClick={() => setAbierto(false)}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700"
          >
            Cerrar
          </button>
        )}
      </div>
      <Mensaje estado={estado} />
    </form>
  );
}

export type ProveedorFila = {
  id: string;
  tipo: string;
  nombre_o_alias: string | null;
  telefono_original: string | null;
  notas: string | null;
  activo: boolean;
};

export function EditorProveedor({ proveedor }: { proveedor?: ProveedorFila }) {
  const [estado, action, pendiente] = useActionState<EstadoCatalogo, FormData>(
    guardarProveedorAction,
    null,
  );
  const [abierto, setAbierto] = useState(!proveedor);

  if (proveedor && !abierto) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
        <div className="min-w-0">
          <p className="truncate font-medium">
            {proveedor.nombre_o_alias ?? proveedor.telefono_original ?? "(sin nombre)"}
            {!proveedor.activo && (
              <span className="ml-2 rounded-full bg-neutral-200 px-2 py-0.5 text-xs dark:bg-neutral-700">
                inactivo
              </span>
            )}
          </p>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {proveedor.tipo === "propio" ? "Propio" : "Externo"}
            {proveedor.telefono_original ? ` · ${proveedor.telefono_original}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAbierto(true)}
          className="shrink-0 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700"
        >
          Editar
        </button>
      </div>
    );
  }

  return (
    <form
      action={action}
      className="space-y-3 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800"
    >
      {proveedor && <input type="hidden" name="id" value={proveedor.id} />}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          Nombre o alias
          <input
            name="nombre_o_alias"
            defaultValue={proveedor?.nombre_o_alias ?? ""}
            className={`${campo} mt-1`}
          />
        </label>
        <label className="text-sm">
          Teléfono
          <input
            name="telefono_original"
            inputMode="tel"
            placeholder="+58…"
            defaultValue={proveedor?.telefono_original ?? ""}
            className={`${campo} mt-1`}
          />
        </label>
      </div>

      <label className="block text-sm">
        Tipo
        <select
          name="tipo"
          defaultValue={proveedor?.tipo ?? "tercero"}
          className={`${campo} mt-1`}
        >
          <option value="propio">Propio (yo)</option>
          <option value="tercero">Externo</option>
        </select>
      </label>

      <label className="block text-sm">
        Notas
        <textarea
          name="notas"
          rows={2}
          defaultValue={proveedor?.notas ?? ""}
          className={`${campo} mt-1`}
        />
      </label>

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="activo" defaultChecked={proveedor?.activo ?? true} />
          Activo
        </label>
        <button type="submit" disabled={pendiente} className={boton}>
          {pendiente ? "…" : proveedor ? "Guardar" : "Crear proveedor"}
        </button>
        {proveedor && (
          <button
            type="button"
            onClick={() => setAbierto(false)}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700"
          >
            Cerrar
          </button>
        )}
      </div>
      <Mensaje estado={estado} />
    </form>
  );
}
