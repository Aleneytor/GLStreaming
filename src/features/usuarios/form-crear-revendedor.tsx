"use client";

import { useActionState, useState } from "react";
import { crearUsuarioRevendedorAction, type EstadoUsuario } from "./actions";

type Vendedor = { id: string; nombre: string; usuario_id: string | null };

const campo =
  "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-base outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-neutral-700 dark:bg-neutral-900";
const botonPrimario =
  "inline-flex items-center gap-1.5 rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white transition active:scale-[0.98] disabled:opacity-60 dark:bg-white dark:text-neutral-900 min-h-11";

export function FormCrearRevendedor({
  vendedores,
}: {
  vendedores: Vendedor[];
}) {
  const [estado, action, pendiente] = useActionState<
    EstadoUsuario,
    FormData
  >(crearUsuarioRevendedorAction, null);

  const [mostrar, setMostrar] = useState(false);

  // Solo vendedores sin usuario vinculado + que sean revendedor
  const disponibles = vendedores.filter((v) => !v.usuario_id);

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
      <button
        type="button"
        onClick={() => setMostrar(!mostrar)}
        className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 transition hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
      >
        <svg
          className={`size-4 transition-transform ${mostrar ? "rotate-45" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4.5v15m7.5-7.5h-15"
          />
        </svg>
        {mostrar ? "Cancelar" : "Crear nuevo revendedor"}
      </button>

      {mostrar && (
        <form
          action={action}
          onReset={() => setMostrar(false)}
          className="mt-4 space-y-4"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Nombre
              </span>
              <input
                name="nombre"
                required
                placeholder="Gabriel Nadales"
                className={campo}
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Correo electrónico
              </span>
              <input
                name="email"
                type="email"
                required
                placeholder="gabriel@glcuenta.com"
                className={campo}
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Contraseña
              </span>
              <input
                name="password"
                type="password"
                required
                minLength={8}
                placeholder="Mínimo 8 caracteres"
                className={campo}
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Vincular a vendedor
              </span>
              <select name="vendedor_id" className={campo}>
                <option value="">Sin vincular (solo acceso a la app)</option>
                {disponibles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.nombre}
                  </option>
                ))}
              </select>
              {disponibles.length === 0 && (
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Todos los revendedores ya están vinculados. Puedes crear uno
                  nuevo desde Catálogo.
                </p>
              )}
            </label>
          </div>

          {estado?.error && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {estado.error}
            </p>
          )}
          {estado?.ok && (
            <p className="text-sm text-emerald-600 dark:text-emerald-400">
              {estado.ok}
            </p>
          )}

          <div className="flex gap-3">
            <button type="submit" disabled={pendiente} className={botonPrimario}>
              {pendiente ? "Creando…" : "Crear revendedor"}
            </button>
            <button
              type="reset"
              className="inline-flex items-center rounded-xl border border-neutral-300 px-4 py-2.5 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50 active:scale-[0.98] dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800 min-h-11"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
