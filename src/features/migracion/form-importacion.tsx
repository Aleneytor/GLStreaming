"use client";

import { useActionState, useMemo, useState } from "react";
import { analizarFilas } from "@/domain/importacion";
import { importarAction, type EstadoImportacion } from "./actions";

const CAMPO =
  "w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900";

export type OpcionProducto = {
  id: string;
  codigo: string;
  etiqueta: string;
  capacidad: number;
  modalidades: { id: string; nombre: string }[];
};

const EJEMPLO = [
  "netflix-uno@gmail.com\tClave123\tAna\t1234\tAna Pérez\t04141234567\t23/07/2026\t2.500,00",
  "netflix-uno@gmail.com\tClave123\tBeto\t5678\tBeto Gómez\t04249876543\t28/07/2026\t2.500,00",
  "netflix-uno@gmail.com\tClave123\tLibre\t\t\t\t\t",
].join("\n");

export function FormImportacion({
  productos,
  vendedores,
}: {
  productos: OpcionProducto[];
  vendedores: { id: string; nombre: string }[];
}) {
  const [productoId, setProductoId] = useState(productos[0]?.id ?? "");
  const [texto, setTexto] = useState("");
  const [estado, action, pendiente] = useActionState<EstadoImportacion, FormData>(
    importarAction,
    null,
  );

  const producto = productos.find((p) => p.id === productoId) ?? productos[0];
  const capacidad = producto?.capacidad ?? 1;

  // La vista previa usa el MISMO analizador que la importación real, así que lo
  // que se ve aquí es literalmente lo que se va a guardar.
  const analisis = useMemo(
    () => (texto.trim() ? analizarFilas(texto, capacidad) : null),
    [texto, capacidad],
  );

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="producto_id" value={productoId} />
      <input type="hidden" name="capacidad" value={capacidad} />

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block text-sm">
          <span className="mb-1 block text-neutral-600 dark:text-neutral-400">Producto</span>
          <select
            value={productoId}
            onChange={(e) => setProductoId(e.target.value)}
            className={CAMPO}
          >
            {productos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.etiqueta} ({p.capacidad} {p.capacidad === 1 ? "perfil" : "perfiles"})
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-neutral-600 dark:text-neutral-400">Modalidad</span>
          <select name="modalidad_id" className={CAMPO} defaultValue="">
            {(producto?.modalidades ?? []).map((m) => (
              <option key={m.id} value={m.id}>
                {m.nombre}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-neutral-600 dark:text-neutral-400">
            Vendedor (opcional)
          </span>
          <select name="vendedor_id" className={CAMPO} defaultValue="">
            <option value="">Yo (venta directa)</option>
            {vendedores.map((v) => (
              <option key={v.id} value={v.id}>
                {v.nombre}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div>
        <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
          <label htmlFor="filas" className="text-sm font-medium">
            Pega aquí las filas del Excel
          </label>
          <button
            type="button"
            onClick={() => setTexto(EJEMPLO)}
            className="text-xs text-neutral-500 underline underline-offset-2 dark:text-neutral-400"
          >
            Ver un ejemplo
          </button>
        </div>
        <textarea
          id="filas"
          name="filas"
          rows={10}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          spellCheck={false}
          placeholder={"correo\tcontraseña\tperfil\tpin\tcliente\twhatsapp\tvence\tbs"}
          className={`${CAMPO} font-mono text-xs`}
        />
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          Ocho columnas, en este orden:{" "}
          <strong>correo · contraseña · perfil · pin · cliente · whatsapp · vence · bs</strong>.
          Copia las celdas desde Excel y pégalas tal cual. Deja el{" "}
          <strong>cliente vacío</strong> si ese perfil está libre, y los{" "}
          <strong>bolívares vacíos</strong> si todavía no te pagó.
        </p>
      </div>

      {analisis && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-4 rounded-xl border border-neutral-200 p-3 text-sm dark:border-neutral-800">
            <span>
              <strong className="tabular-nums">{analisis.filas.length}</strong> filas
            </span>
            <span>
              <strong className="tabular-nums">{analisis.cuentas}</strong> cuentas
            </span>
            <span className="text-emerald-600 dark:text-emerald-400">
              <strong className="tabular-nums">{analisis.validas}</strong> listas
            </span>
            {analisis.conError > 0 && (
              <span className="text-red-600 dark:text-red-400">
                <strong className="tabular-nums">{analisis.conError}</strong> con error
              </span>
            )}
          </div>

          <div className="max-h-80 overflow-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-neutral-100 dark:bg-neutral-900">
                <tr>
                  {["#", "Cuenta", "Perfil", "Cliente", "Vence", "Bs", "Estado"].map((h) => (
                    <th key={h} className="whitespace-nowrap px-2 py-1.5 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {analisis.filas.map((f) => (
                  <tr
                    key={f.numero}
                    className={`border-t border-neutral-200 dark:border-neutral-800 ${
                      f.errores.length ? "bg-red-50 dark:bg-red-950/30" : ""
                    }`}
                  >
                    <td className="px-2 py-1.5 tabular-nums text-neutral-500">{f.numero}</td>
                    <td className="max-w-40 truncate px-2 py-1.5">{f.datos.correo}</td>
                    <td className="px-2 py-1.5">
                      {f.slot}
                      {f.datos.perfil ? ` · ${f.datos.perfil}` : ""}
                    </td>
                    <td className="px-2 py-1.5">
                      {f.datos.cliente ?? (
                        <span className="text-neutral-400">libre</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-2 py-1.5 tabular-nums">
                      {f.datos.vence ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-2 py-1.5 tabular-nums">
                      {f.datos.montoVes?.toLocaleString("es-VE") ?? "—"}
                    </td>
                    <td className="px-2 py-1.5">
                      {f.errores.length > 0 ? (
                        <span className="text-red-700 dark:text-red-400">
                          {f.errores.join(" ")}
                        </span>
                      ) : f.avisos.length > 0 ? (
                        <span className="text-amber-700 dark:text-amber-400">
                          {f.avisos.join(" ")}
                        </span>
                      ) : (
                        <span className="text-emerald-700 dark:text-emerald-400">Lista</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={pendiente || !analisis || analisis.validas === 0}
        className="rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition active:scale-[0.98] disabled:opacity-60 dark:bg-white dark:text-neutral-900"
      >
        {pendiente
          ? "Importando…"
          : analisis
            ? `Importar ${analisis.validas} filas`
            : "Importar"}
      </button>

      {estado?.error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {estado.error}
        </p>
      )}

      {estado?.resumen && (
        <div className="space-y-2">
          <p className="text-sm font-medium">{estado.resumen}</p>
          <div className="max-h-64 overflow-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
            <ul className="divide-y divide-neutral-200 text-xs dark:divide-neutral-800">
              {estado.filas?.map((r) => (
                <li key={r.numero} className="flex gap-2 px-2 py-1.5">
                  <span className="tabular-nums text-neutral-500">{r.numero}</span>
                  <span aria-hidden>{r.ok ? "✅" : "❌"}</span>
                  <span className={r.ok ? "" : "text-red-700 dark:text-red-400"}>
                    {r.mensaje}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </form>
  );
}
