"use client";

import { useActionState, useState } from "react";
import { cambiarPasswordAction, type EstadoUsuario } from "./actions";

const campo =
  "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-neutral-700 dark:bg-neutral-900";
const boton =
  "rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-50 active:scale-[0.98] dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800";

export function BotonCambiarPassword({
  userId,
  nombre,
}: {
  userId: string;
  nombre: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [estado, action, pendiente] = useActionState<
    EstadoUsuario,
    FormData
  >(cambiarPasswordAction, null);

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className={boton}
      >
        Cambiar contraseña
      </button>
    );
  }

  return (
    <form
      action={action}
      onReset={() => setAbierto(false)}
      className="flex shrink-0 items-center gap-2"
    >
      <input type="hidden" name="user_id" value={userId} />
      <label className="sr-only" htmlFor={`pw-${userId}`}>
        Nueva contraseña para {nombre}
      </label>
      <input
        id={`pw-${userId}`}
        name="password"
        type="password"
        required
        minLength={8}
        placeholder="Nueva contraseña…"
        className={`${campo} w-40`}
      />
      <button
        type="submit"
        disabled={pendiente}
        className="rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white transition active:scale-[0.98] disabled:opacity-60 dark:bg-white dark:text-neutral-900"
      >
        {pendiente ? "…" : "Guardar"}
      </button>
      <button type="reset" className={boton}>
        Cancelar
      </button>
      {estado?.error && (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">
          {estado.error}
        </p>
      )}
      {estado?.ok && (
        <p className="text-xs text-emerald-600 dark:text-emerald-400">
          {estado.ok}
        </p>
      )}
    </form>
  );
}
