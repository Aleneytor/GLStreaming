"use client";

import { useActionState } from "react";
import Link from "next/link";
import { actualizarUnidadesAction, type EstadoAlta } from "./actions";

const claseCampo =
  "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-base outline-none transition focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-neutral-300";

export type PerfilEditable = {
  id: string;
  numero_slot: number;
  nombre_visible: string | null;
  tiene_pin: boolean;
};

export function FormPerfiles({
  cuentaId,
  perfiles,
  volverA,
}: {
  cuentaId: string;
  perfiles: PerfilEditable[];
  volverA: string;
}) {
  const [estado, formAction, pendiente] = useActionState<EstadoAlta, FormData>(
    actualizarUnidadesAction,
    null,
  );

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="cuenta_id" value={cuentaId} />

      <ul className="space-y-4">
        {perfiles.map((p) => (
          <li
            key={p.id}
            className="space-y-3 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800"
          >
            <p className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              Perfil {p.numero_slot}
            </p>

            <div>
              <label
                htmlFor={`nombre_${p.id}`}
                className="mb-1.5 block text-sm font-medium"
              >
                Nombre visible
              </label>
              <input
                id={`nombre_${p.id}`}
                name={`nombre_${p.id}`}
                type="text"
                defaultValue={p.nombre_visible ?? ""}
                placeholder={`Perfil ${p.numero_slot}`}
                className={claseCampo}
              />
            </div>

            <div>
              <label htmlFor={`pin_${p.id}`} className="mb-1.5 block text-sm font-medium">
                PIN{" "}
                <span className="text-neutral-400">
                  {p.tiene_pin ? "(guardado — escribe para cambiarlo)" : "(sin PIN)"}
                </span>
              </label>
              <input
                id={`pin_${p.id}`}
                name={`pin_${p.id}`}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder={p.tiene_pin ? "(sin cambios)" : "ej. 1234"}
                className={claseCampo}
              />
            </div>
          </li>
        ))}
      </ul>

      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        El PIN se guarda cifrado. Se conserva como texto para no perder ceros
        iniciales. Dejarlo vacío no lo cambia.
      </p>

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
          {pendiente ? "Guardando…" : "Guardar perfiles"}
        </button>
        <Link
          href={volverA}
          className="rounded-lg border border-neutral-300 px-4 py-3 text-base transition active:scale-[0.99] dark:border-neutral-700"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
