"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { venderAction, type EstadoVenta } from "./actions";

const campo =
  "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-base outline-none transition focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-neutral-300";

export function FormVenta({
  cuentaId,
  unidadId,
  etiquetaRecurso,
  modalidades,
  clientes,
  volverA,
}: {
  cuentaId: string;
  unidadId: string | null;
  etiquetaRecurso: string;
  modalidades: { id: string; nombre: string }[];
  clientes: { id: string; nombre: string }[];
  volverA: string;
}) {
  const [estado, action, pendiente] = useActionState<EstadoVenta, FormData>(
    venderAction,
    null,
  );
  const hoy = new Date().toISOString().slice(0, 10);
  const [meses, setMeses] = useState(1);

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="cuenta_id" value={cuentaId} />
      {unidadId && <input type="hidden" name="unidad_id" value={unidadId} />}
      <input type="hidden" name="volver_a" value={volverA} />

      <div className="rounded-xl bg-neutral-100 p-4 text-sm dark:bg-neutral-900">
        Vendiendo: <strong>{etiquetaRecurso}</strong>
      </div>

      <div>
        <label htmlFor="cliente_id" className="mb-1.5 block text-sm font-medium">
          Cliente
        </label>
        <select id="cliente_id" name="cliente_id" required className={campo}>
          <option value="">Elige un cliente…</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
        {clientes.length === 0 && (
          <p className="mt-1.5 text-xs text-amber-700 dark:text-amber-400">
            No hay clientes todavía.{" "}
            <Link href="/clientes" className="underline">
              Crea uno primero
            </Link>
            .
          </p>
        )}
      </div>

      <div>
        <label htmlFor="modalidad_id" className="mb-1.5 block text-sm font-medium">
          Modalidad
        </label>
        <select id="modalidad_id" name="modalidad_id" required className={campo}>
          {modalidades.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nombre}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="precio_usd" className="mb-1.5 block text-sm font-medium">
            Precio (USD)
          </label>
          <input
            id="precio_usd"
            name="precio_usd"
            type="text"
            inputMode="decimal"
            placeholder="ej. 3.50"
            className={campo}
          />
        </div>
        <div>
          <label htmlFor="cantidad_periodos" className="mb-1.5 block text-sm font-medium">
            Meses
          </label>
          <select
            id="cantidad_periodos"
            name="cantidad_periodos"
            value={meses}
            onChange={(e) => setMeses(Number(e.target.value))}
            className={campo}
          >
            {[1, 3, 6, 12].map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="inicio" className="mb-1.5 block text-sm font-medium">
          Inicio del servicio
        </label>
        <input
          id="inicio"
          name="inicio"
          type="date"
          required
          defaultValue={hoy}
          className={campo}
        />
        <p className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-400">
          La fecha de renovación se calcula por mes calendario. Es una fecha de
          contacto flexible: llegado el día el cliente puede usar y pagar, y vencer
          no corta ni libera nada automáticamente.
        </p>
      </div>

      <p className="rounded-lg bg-neutral-100 px-3 py-2 text-xs text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400">
        El precio se congela en USD. El cobro en bolívares, con sus tasas BCV y
        paralela, se registrará cuando esté la integración de tasas.
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
          disabled={pendiente || clientes.length === 0}
          className="flex-1 rounded-lg bg-neutral-900 px-4 py-3 text-base font-medium text-white transition active:scale-[0.99] disabled:opacity-60 dark:bg-white dark:text-neutral-900"
        >
          {pendiente ? "Registrando…" : "Registrar venta"}
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
