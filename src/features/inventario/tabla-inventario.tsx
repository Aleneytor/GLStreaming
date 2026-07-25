"use client";

import { useState } from "react";
import type { BadgeVencimiento } from "@/domain/fechas";
import { PanelEditarCuenta } from "./panel-editar-cuenta";

/**
 * Tabla densa del inventario (solo admin), pensada para ver MUCHOS clientes de
 * un vistazo, como la hoja de cálculo del negocio.
 *
 * Se agrupa por CUENTA: el correo y la contraseña de la cuenta madre van una
 * sola vez (celdas fusionadas, como en el Excel), y sus cupos —perfiles o
 * miembros de familia— van debajo. Una línea más gruesa separa cada bloque.
 *
 * «Editar» despliega un panel en la misma fila para cambiar todo (cuenta y
 * perfiles) sin cambiar de página. Las credenciales llegan YA descifradas desde
 * el servidor; el revendedor nunca llega aquí.
 */

export type CupoFila = {
  clave: string;
  cupo: string;
  unidadId: string | null;
  nombreUnidad: string | null;
  clienteId: string | null;
  cliente: string | null;
  clienteLogin: string | null;
  clienteClave: string | null;
  pin: string | null;
  ingreso: number | null;
  vence: string | null;
  badge: BadgeVencimiento | null;
  suscEstado: string | null;
};

export type BloqueCuenta = {
  cuentaId: string;
  correo: string;
  contrasena: string;
  alias: string | null;
  notas: string | null;
  cuentaEstado: string;
  proveedor: string | null;
  costo: number | null;
  filas: CupoFila[];
};

const COLUMNAS = 8;

function Copiable({ texto }: { texto: string | null }) {
  if (!texto) return <span className="text-neutral-300 dark:text-neutral-700">—</span>;
  return (
    <span className="font-mono text-xs text-neutral-700 dark:text-neutral-300" title={texto}>
      {texto}
    </span>
  );
}

export function TablaInventario({ cuentas, slug }: { cuentas: BloqueCuenta[]; slug: string }) {
  const [editando, setEditando] = useState<string | null>(null);

  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="bg-neutral-100 text-xs uppercase tracking-wide text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400">
          <tr>
            <th className="px-3 py-2 font-medium">Correo cuenta</th>
            <th className="px-3 py-2 font-medium">Contraseña</th>
            <th className="px-3 py-2 font-medium">Cupo</th>
            <th className="px-3 py-2 font-medium">Cliente</th>
            <th className="px-3 py-2 font-medium">Acceso del cliente</th>
            <th className="px-3 py-2 text-right font-medium">Ingreso</th>
            <th className="px-3 py-2 font-medium">Vence</th>
            <th className="px-3 py-2 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {cuentas.map((cta) => (
            <ContinuoCuenta
              key={cta.cuentaId}
              cta={cta}
              slug={slug}
              abierto={editando === cta.cuentaId}
              onEditar={() => setEditando(editando === cta.cuentaId ? null : cta.cuentaId)}
              onCerrar={() => setEditando(null)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Las filas de UNA cuenta (con creds fusionadas) y, si toca, su panel. */
function ContinuoCuenta({
  cta,
  slug,
  abierto,
  onEditar,
  onCerrar,
}: {
  cta: BloqueCuenta;
  slug: string;
  abierto: boolean;
  onEditar: () => void;
  onCerrar: () => void;
}) {
  return (
    <>
      {cta.filas.map((f, i) => (
        <tr
          key={f.clave}
          className={`hover:bg-neutral-50 dark:hover:bg-neutral-900/50 ${
            i === 0
              ? "border-t-2 border-neutral-300 dark:border-neutral-700"
              : "border-t border-neutral-100 dark:border-neutral-900"
          }`}
        >
          {i === 0 && (
            <>
              <td
                rowSpan={cta.filas.length}
                className="border-r border-neutral-200 bg-neutral-50/50 px-3 py-1.5 align-top dark:border-neutral-800 dark:bg-neutral-900/40"
              >
                <Copiable texto={cta.correo} />
                {cta.cuentaEstado !== "activa" && (
                  <span className="ml-1 rounded bg-amber-100 px-1 text-[10px] capitalize text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                    {cta.cuentaEstado}
                  </span>
                )}
                <span className="mt-0.5 block text-[10px] text-neutral-400">
                  {cta.proveedor ?? "sin proveedor"}
                  {cta.costo != null && ` · costo $${cta.costo.toFixed(2)}`}
                </span>
              </td>
              <td
                rowSpan={cta.filas.length}
                className="border-r border-neutral-200 bg-neutral-50/50 px-3 py-1.5 align-top dark:border-neutral-800 dark:bg-neutral-900/40"
              >
                <Copiable texto={cta.contrasena} />
              </td>
            </>
          )}

          <td className="whitespace-nowrap px-3 py-1.5 text-xs text-neutral-500 dark:text-neutral-400">
            {f.cupo}
          </td>
          <td className="px-3 py-1.5">
            {f.cliente ? (
              <span className="font-medium">{f.cliente}</span>
            ) : (
              <span className="text-emerald-600 dark:text-emerald-400">libre</span>
            )}
            {f.suscEstado && f.suscEstado !== "activa" && (
              <span className="ml-1 text-xs capitalize text-neutral-400">{f.suscEstado}</span>
            )}
          </td>
          <td className="px-3 py-1.5">
            {f.clienteLogin ? (
              <span className="block leading-tight">
                <Copiable texto={f.clienteLogin} />
                <br />
                <Copiable texto={f.clienteClave} />
              </span>
            ) : f.pin ? (
              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                PIN <Copiable texto={f.pin} />
              </span>
            ) : (
              <span className="text-neutral-300 dark:text-neutral-700">—</span>
            )}
          </td>
          <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums">
            {f.ingreso != null ? (
              `$${f.ingreso.toFixed(2)}`
            ) : (
              <span className="text-neutral-300 dark:text-neutral-700">—</span>
            )}
          </td>
          <td className="whitespace-nowrap px-3 py-1.5">
            {f.vence ? (
              <span className="flex items-center gap-1.5">
                <span className="tabular-nums text-xs text-neutral-500 dark:text-neutral-400">
                  {f.vence}
                </span>
                {f.badge && (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                      f.badge.color === "rojo"
                        ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                        : f.badge.color === "amarillo"
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                          : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                    }`}
                  >
                    {f.badge.etiqueta}
                  </span>
                )}
              </span>
            ) : (
              <span className="text-neutral-300 dark:text-neutral-700">—</span>
            )}
          </td>
          {i === 0 ? (
            <td rowSpan={cta.filas.length} className="whitespace-nowrap px-3 py-1.5 align-top text-right">
              <button
                type="button"
                onClick={onEditar}
                className="text-xs text-neutral-500 underline underline-offset-2 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
              >
                {abierto ? "Cerrar" : "Editar"}
              </button>
            </td>
          ) : null}
        </tr>
      ))}

      {abierto && (
        <tr>
          <td colSpan={COLUMNAS} className="p-3">
            <PanelEditarCuenta cuenta={cta} slug={slug} onCerrar={onCerrar} />
          </td>
        </tr>
      )}
    </>
  );
}
