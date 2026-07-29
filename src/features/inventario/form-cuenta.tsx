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
  "w-full rounded-xl border border-neutral-200 bg-neutral-50/60 px-3.5 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 dark:border-neutral-800 dark:bg-neutral-950/60 dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus:border-blue-500 dark:focus:bg-neutral-950";

const claseEtiqueta =
  "mb-1.5 block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-300";

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
  const esSpotifyFamiliar = producto?.codigo === "spotify-familiar";

  return (
    <form action={formAction} className="space-y-6">
      {/* SECCIÓN 1: Selección de Producto y Configuración */}
      <section className="space-y-4 rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900/80">
        <div className="flex items-center gap-2 border-b border-neutral-100 pb-3 dark:border-neutral-800/80">
          <div className="rounded-lg bg-neutral-100 p-1.5 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-bold text-neutral-900 dark:text-white">Producto & Capacidad</h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Selecciona la plataforma y modalidad a registrar</p>
          </div>
        </div>

        <div>
          <label htmlFor="producto_id" className={claseEtiqueta}>
            Producto de la Plataforma
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
            <div className="mt-2.5 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {producto.tipo_inventario === "cuenta_con_unidades"
                  ? `${capacidadSugerida} slots de inventario`
                  : "Recurso indivisible"}
              </span>
              {capacidadFija && (
                <span className="inline-flex items-center rounded-md bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                  Capacidad fija
                </span>
              )}
            </div>
          )}
        </div>

        {esDeCliente && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/80 p-3.5 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200"
          >
            <svg className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>Este producto es propiedad del cliente. Se carga por el flujo de servicio existente, no por aquí.</span>
          </div>
        )}

        {esSpotifyFamiliar && (
          <div className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-950 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
            <span className="rounded-lg bg-emerald-500/20 px-2 py-1 font-bold text-emerald-700 dark:text-emerald-300">
              Spotify
            </span>
            <div>
              <strong className="font-semibold">Familia Spotify · 5 miembros</strong>
              <p className="mt-0.5 opacity-90">
                Se crea la cuenta administradora y cobertura. Los accesos de miembros se gestionan luego en &quot;Gestionar familia&quot;.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="capacidad" className={claseEtiqueta}>
              Capacidad (Slots)
            </label>
            <input
              id="capacidad"
              name="capacidad"
              type="number"
              inputMode="numeric"
              min={1}
              required
              key={`cap-${productoId}`}
              defaultValue={capacidadSugerida}
              readOnly={capacidadFija}
              disabled={!producto}
              className={claseCampo}
            />
          </div>

          <div>
            <label htmlFor="alias" className={claseEtiqueta}>
              Alias opcional
            </label>
            <input
              id="alias"
              name="alias"
              type="text"
              placeholder="ej. Netflix Principal #1"
              className={claseCampo}
            />
          </div>
        </div>
      </section>

      {/* SECCIÓN 2: Credenciales de la Cuenta */}
      <section className="space-y-4 rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900/80">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3 dark:border-neutral-800/80">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-blue-500/10 p-1.5 text-blue-600 dark:text-blue-400">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-bold text-neutral-900 dark:text-white">Credenciales de Acceso</h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Datos de inicio de sesión de la plataforma</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-0.5 text-[11px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
            <svg className="h-3 w-3 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            AES-256-GCM
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="correo" className={claseEtiqueta}>
              Correo de acceso
            </label>
            <input
              id="correo"
              name="correo"
              type="text"
              inputMode="email"
              autoComplete="off"
              required
              placeholder="cuenta@correo.com"
              className={claseCampo}
            />
          </div>

          <div>
            <label htmlFor="contrasena" className={claseEtiqueta}>
              Contraseña
            </label>
            <input
              id="contrasena"
              name="contrasena"
              type="text"
              autoComplete="off"
              required
              placeholder="••••••••"
              className={claseCampo}
            />
          </div>
        </div>
      </section>

      {/* SECCIÓN 3: Pago de Spotify (Condicional) */}
      {esSpotifyFamiliar && (
        <section className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900/80">
          <div className="flex items-center gap-2 border-b border-neutral-100 pb-3 dark:border-neutral-800/80">
            <div className="rounded-lg bg-neutral-100 p-1.5 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-bold text-neutral-900 dark:text-white">Control de pago Spotify</h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Gmail pagador asociado (sin contraseña)</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="gmail_pagador" className={claseEtiqueta}>
                Gmail Pagador
              </label>
              <input
                id="gmail_pagador"
                name="gmail_pagador"
                type="email"
                autoComplete="off"
                placeholder="pagador@gmail.com"
                className={claseCampo}
              />
            </div>

            <div>
              <label htmlFor="origen_gpay" className={claseEtiqueta}>
                Origen de Cuenta
              </label>
              <select id="origen_gpay" name="origen_gpay" className={claseCampo}>
                <option value="gpay_usa">GPay USA</option>
                <option value="gpay_nigeria">GPay Nigeria</option>
              </select>
            </div>
          </div>
        </section>
      )}

      {/* SECCIÓN 4: Proveedor y Costo (Opcional) */}
      <section className="space-y-4 rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900/80">
        <div className="flex items-center gap-2 border-b border-neutral-100 pb-3 dark:border-neutral-800/80">
          <div className="rounded-lg bg-amber-500/10 p-1.5 text-amber-600 dark:text-amber-400">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-bold text-neutral-900 dark:text-white">Proveedor & Costo Operativo</h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Datos opcionales para control financiero e inversión</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="proveedor" className={claseEtiqueta}>
              Proveedor
            </label>
            <input
              id="proveedor"
              name="proveedor"
              type="text"
              list="lista-proveedores"
              placeholder="Yo, proveedor o teléfono..."
              className={claseCampo}
            />
            <datalist id="lista-proveedores">
              {proveedores.map((p) => (
                <option key={p.id} value={p.etiqueta} />
              ))}
            </datalist>
          </div>

          <div>
            <label htmlFor="notas" className={claseEtiqueta}>
              Notas internas
            </label>
            <input
              id="notas"
              name="notas"
              type="text"
              placeholder="Recordatorios de compra, origen..."
              className={claseCampo}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="costo_usdt" className={claseEtiqueta}>
              Costo (USDT)
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-2.5 text-sm font-medium text-neutral-400 dark:text-neutral-500">$</span>
              <input
                id="costo_usdt"
                name="costo_usdt"
                type="text"
                inputMode="decimal"
                placeholder="8.50"
                className={`${claseCampo} pl-7`}
              />
            </div>
          </div>

          <div>
            <label htmlFor="ciclo_inicio" className={claseEtiqueta}>
              Inicio Ciclo
            </label>
            <input
              id="ciclo_inicio"
              name="ciclo_inicio"
              type="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
              className={claseCampo}
            />
          </div>
        </div>
      </section>

      {/* Alerta de Error */}
      {estado?.error && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
        >
          <svg className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{estado.error}</span>
        </div>
      )}

      {/* Botones de Acción */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={pendiente || !producto || esDeCliente}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-neutral-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-neutral-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          {pendiente ? (
            <>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Guardando cuenta…</span>
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Crear cuenta</span>
            </>
          )}
        </button>
        <Link
          href="/inventario"
          className="inline-flex items-center justify-center rounded-xl border border-neutral-200 bg-white px-5 py-3 text-sm font-semibold text-neutral-700 shadow-xs transition hover:bg-neutral-50 active:scale-[0.99] dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800/80"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
