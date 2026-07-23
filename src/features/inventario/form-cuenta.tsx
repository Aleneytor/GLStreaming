"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { crearCuentaAction, type EstadoAlta } from "./actions";

export type ProductoOpcion = {
  id: string;
  nombre: string;
  codigo: string;
  plataforma: string;
  regla_capacidad: string;
  capacidad_fija: number | null;
  capacidad_min: number | null;
  capacidad_max: number | null;
  tipo_inventario: string;
  titularidad_predeterminada: string;
};

export type ProveedorOpcion = { id: string; etiqueta: string };

const claseCampo =
  "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-base outline-none transition focus:border-neutral-900 disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-neutral-300";

export function FormCuenta({
  productos,
  proveedores,
}: {
  productos: ProductoOpcion[];
  proveedores: ProveedorOpcion[];
}) {
  const [estado, formAction, pendiente] = useActionState<EstadoAlta, FormData>(
    crearCuentaAction,
    null,
  );
  const [productoId, setProductoId] = useState("");

  const producto = useMemo(
    () => productos.find((p) => p.id === productoId),
    [productos, productoId],
  );

  // La capacidad viene del producto; solo es editable si el producto lo permite.
  const capacidadFija = producto?.regla_capacidad === "fija";
  const capacidadSugerida =
    producto?.capacidad_fija ?? producto?.capacidad_min ?? 1;

  const esDeCliente = producto?.titularidad_predeterminada === "cliente";

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label htmlFor="producto_id" className="mb-1.5 block text-sm font-medium">
          Producto
        </label>
        <select
          id="producto_id"
          name="producto_id"
          required
          value={productoId}
          onChange={(e) => setProductoId(e.target.value)}
          className={claseCampo}
        >
          <option value="">Elige un producto…</option>
          {productos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.plataforma} — {p.nombre}
            </option>
          ))}
        </select>
        {producto && (
          <p className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-400">
            {producto.tipo_inventario === "cuenta_con_unidades"
              ? `Se crearán ${capacidadSugerida} unidades automáticamente.`
              : "Recurso indivisible: no se crean unidades hijas."}
          </p>
        )}
      </div>

      {esDeCliente && (
        <p
          role="alert"
          className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300"
        >
          Este producto es propiedad del cliente. Se carga por el flujo de servicio
          existente, no por aquí.
        </p>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="capacidad" className="mb-1.5 block text-sm font-medium">
            Capacidad
          </label>
          <input
            id="capacidad"
            name="capacidad"
            type="number"
            inputMode="numeric"
            min={1}
            required
            // `key` fuerza a re-montar el input al cambiar de producto para que
            // tome el nuevo valor sugerido.
            key={`cap-${productoId}`}
            defaultValue={capacidadSugerida}
            readOnly={capacidadFija}
            disabled={!producto}
            className={claseCampo}
          />
          {capacidadFija && (
            <p className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-400">
              Fijada por el producto.
            </p>
          )}
        </div>

        <div>
          <label htmlFor="alias" className="mb-1.5 block text-sm font-medium">
            Alias <span className="text-neutral-400">(opcional)</span>
          </label>
          <input
            id="alias"
            name="alias"
            type="text"
            placeholder="ej. Netflix 1"
            className={claseCampo}
          />
        </div>
      </div>

      <div>
        <label htmlFor="proveedor" className="mb-1.5 block text-sm font-medium">
          Proveedor <span className="text-neutral-400">(opcional)</span>
        </label>
        {/* Texto libre: se reutiliza si el nombre ya existe, si no se crea. */}
        <input
          id="proveedor"
          name="proveedor"
          type="text"
          list="lista-proveedores"
          placeholder="Yo, un nombre o un teléfono…"
          className={claseCampo}
        />
        <datalist id="lista-proveedores">
          {proveedores.map((p) => (
            <option key={p.id} value={p.etiqueta} />
          ))}
        </datalist>
        <p className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-400">
          Escribe el que quieras: si no existe, se crea. Indicarlo no crea costo ni
          pago; eso se registra aparte.
        </p>
      </div>

      <div>
        <label htmlFor="notas" className="mb-1.5 block text-sm font-medium">
          Notas <span className="text-neutral-400">(opcional)</span>
        </label>
        <textarea
          id="notas"
          name="notas"
          rows={3}
          placeholder="ej. cómo pagaste esta cuenta, dónde la compraste…"
          className={claseCampo}
        />
        <p className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-400">
          Para tus recordatorios. No anotes aquí números completos de tarjeta ni
          códigos de seguridad.
        </p>
      </div>

      <fieldset className="space-y-4 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
        <legend className="px-1 text-sm font-medium">Credenciales de la cuenta</legend>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Se guardan cifradas. Ni siquiera aparecen en la base de datos en texto legible.
        </p>

        <div>
          <label htmlFor="correo" className="mb-1.5 block text-sm font-medium">
            Correo de acceso
          </label>
          <input
            id="correo"
            name="correo"
            type="text"
            inputMode="email"
            autoComplete="off"
            required
            className={claseCampo}
          />
        </div>

        <div>
          <label htmlFor="contrasena" className="mb-1.5 block text-sm font-medium">
            Contraseña de la cuenta
          </label>
          <input
            id="contrasena"
            name="contrasena"
            type="text"
            autoComplete="off"
            required
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
          disabled={pendiente || !producto || esDeCliente}
          className="flex-1 rounded-lg bg-neutral-900 px-4 py-3 text-base font-medium text-white transition active:scale-[0.99] disabled:opacity-60 dark:bg-white dark:text-neutral-900"
        >
          {pendiente ? "Guardando…" : "Crear cuenta"}
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
