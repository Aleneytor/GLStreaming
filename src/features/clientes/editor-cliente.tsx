"use client";

import { useActionState, useState } from "react";
import {
  eliminarClienteAction,
  guardarClienteAction,
  type EstadoCliente,
} from "./actions";

const campo =
  "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-base outline-none transition focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-neutral-300";

export type ClienteFila = {
  id: string;
  nombre: string;
  whatsapp_original: string | null;
  notas: string | null;
  suscripciones_activas?: number;
};

export function EditorCliente({ cliente }: { cliente?: ClienteFila }) {
  const [estado, action, pendiente] = useActionState<EstadoCliente, FormData>(
    guardarClienteAction,
    null,
  );
  const [borrado, accionBorrar, borrando] = useActionState<EstadoCliente, FormData>(
    eliminarClienteAction,
    null,
  );
  const [abierto, setAbierto] = useState(!cliente);
  const [confirmar, setConfirmar] = useState(false);

  if (cliente && !abierto) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
        <div className="min-w-0">
          <p className="truncate font-medium">{cliente.nombre}</p>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {cliente.whatsapp_original ?? "sin WhatsApp"}
            {typeof cliente.suscripciones_activas === "number" &&
              ` · ${cliente.suscripciones_activas} ${
                cliente.suscripciones_activas === 1 ? "servicio" : "servicios"
              }`}
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
      {cliente && <input type="hidden" name="id" value={cliente.id} />}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          Nombre
          <input
            name="nombre"
            required
            defaultValue={cliente?.nombre ?? ""}
            className={`${campo} mt-1`}
          />
        </label>
        <label className="text-sm">
          WhatsApp
          <input
            name="whatsapp"
            inputMode="tel"
            placeholder="+58…"
            defaultValue={cliente?.whatsapp_original ?? ""}
            className={`${campo} mt-1`}
          />
        </label>
      </div>

      <label className="block text-sm">
        Notas
        <textarea
          name="notas"
          rows={2}
          defaultValue={cliente?.notas ?? ""}
          className={`${campo} mt-1`}
        />
      </label>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pendiente}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition active:scale-[0.98] disabled:opacity-60 dark:bg-white dark:text-neutral-900"
        >
          {pendiente ? "…" : cliente ? "Guardar" : "Crear cliente"}
        </button>
        {cliente && (
          <button
            type="button"
            onClick={() => setAbierto(false)}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700"
          >
            Cerrar
          </button>
        )}
        {estado?.error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {estado.error}
          </p>
        )}
        {estado?.ok && (
          <p className="text-sm text-emerald-600 dark:text-emerald-400">{estado.ok}</p>
        )}
      </div>

      {/* Borrar: solo para clientes ya existentes, con confirmación. */}
      {cliente && (
        <div className="border-t border-neutral-200 pt-3 dark:border-neutral-800">
          {!confirmar ? (
            <button
              type="button"
              onClick={() => setConfirmar(true)}
              className="text-xs text-red-600 underline underline-offset-2 dark:text-red-400"
            >
              Borrar cliente
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-neutral-600 dark:text-neutral-400">
                Se borra solo si no tiene servicios. Si los tiene, borra primero esas
                cuentas.
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmar(false)}
                  className="text-xs text-neutral-500 dark:text-neutral-400"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  formAction={accionBorrar}
                  disabled={borrando}
                  className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition active:scale-[0.98] disabled:opacity-60"
                >
                  {borrando ? "Borrando…" : "Sí, borrar"}
                </button>
                {borrado?.error && (
                  <p role="alert" className="text-xs text-red-600 dark:text-red-400">
                    {borrado.error}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </form>
  );
}
