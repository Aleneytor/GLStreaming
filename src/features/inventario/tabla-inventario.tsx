"use client";

import { useState } from "react";
import type { BadgeVencimiento } from "@/domain/fechas";
import { PanelLateralCuenta } from "./panel-lateral-cuenta";
import { moverCuentaAction } from "./actions";

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

/** Botones para reordenar el bloque: ▲ ▼ y llevar al inicio/final. */
function ControlesOrden({ cuentaId, slug }: { cuentaId: string; slug: string }) {
  const btn =
    "rounded px-1 py-0.5 text-xs text-neutral-400 transition hover:bg-neutral-200 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-white";
  return (
    <form action={moverCuentaAction} className="flex items-center gap-0.5">
      <input type="hidden" name="cuenta_id" value={cuentaId} />
      <input type="hidden" name="slug" value={slug} />
      <button type="submit" name="accion" value="inicio" className={btn} title="Al inicio">
        ⤒
      </button>
      <button type="submit" name="accion" value="subir" className={btn} title="Subir">
        ▲
      </button>
      <button type="submit" name="accion" value="bajar" className={btn} title="Bajar">
        ▼
      </button>
      <button type="submit" name="accion" value="final" className={btn} title="Al final">
        ⤓
      </button>
    </form>
  );
}

function Copiable({ texto }: { texto: string | null }) {
  if (!texto) return <span className="text-neutral-300 dark:text-neutral-700">—</span>;
  return (
    <span className="font-mono text-xs text-neutral-700 dark:text-neutral-300" title={texto}>
      {texto}
    </span>
  );
}

export function TablaInventario({ cuentas, slug }: { cuentas: BloqueCuenta[]; slug: string }) {
  const [cuentaEditando, setCuentaEditando] = useState<BloqueCuenta | null>(null);

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-neutral-100 text-xs uppercase tracking-wide text-neutral-500 dark:bg-neutral-950 dark:text-neutral-400">
            <tr>
              <th className="px-4 py-3 font-medium">Cuenta Madre</th>
              <th className="px-4 py-3 font-medium">Contraseña</th>
              <th className="px-4 py-3 font-medium">Cupo / Perfil</th>
              <th className="px-4 py-3 font-medium">Cliente</th>
              <th className="px-4 py-3 font-medium">PIN / Acceso</th>
              <th className="px-4 py-3 text-right font-medium">Ingreso</th>
              <th className="px-4 py-3 font-medium">Vencimiento</th>
              <th className="px-4 py-3 text-right font-medium">Acción</th>
            </tr>
          </thead>
          <tbody>
            {cuentas.map((cta) => (
              <BloqueCuentaFilas
                key={cta.cuentaId}
                cta={cta}
                slug={slug}
                onEditar={() => setCuentaEditando(cta)}
              />
            ))}
          </tbody>
        </table>
      </div>

      {cuentaEditando && (
        <PanelLateralCuenta
          cuenta={cuentaEditando}
          slug={slug}
          onCerrar={() => setCuentaEditando(null)}
        />
      )}
    </div>
  );
}

function BloqueCuentaFilas({
  cta,
  slug,
  onEditar,
}: {
  cta: BloqueCuenta;
  slug: string;
  onEditar: () => void;
}) {
  return (
    <>
      {cta.filas.map((f, i) => (
        <tr
          key={f.clave}
          className={`transition hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 ${
            i === 0
              ? "border-t-2 border-neutral-200 dark:border-neutral-800"
              : "border-t border-neutral-100 dark:border-neutral-900"
          }`}
        >
          {i === 0 && (
            <>
              <td
                rowSpan={cta.filas.length}
                className="border-r border-neutral-200 bg-neutral-50/40 px-4 py-3 align-top dark:border-neutral-800 dark:bg-neutral-950/30"
              >
                <Copiable texto={cta.correo} />
                {cta.cuentaEstado !== "activa" && (
                  <span className="ml-1.5 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                    {cta.cuentaEstado}
                  </span>
                )}
                <div className="mt-1 flex flex-col text-[11px] text-neutral-400">
                  <span>{cta.proveedor ?? "Sin proveedor"}</span>
                  {cta.costo != null && (
                    <span className="font-medium text-neutral-600 dark:text-neutral-300">
                      Costo: ${cta.costo.toFixed(2)} USDT
                    </span>
                  )}
                </div>
              </td>

              <td
                rowSpan={cta.filas.length}
                className="border-r border-neutral-200 bg-neutral-50/40 px-4 py-3 align-top dark:border-neutral-800 dark:bg-neutral-950/30"
              >
                <Copiable texto={cta.contrasena} />
              </td>
            </>
          )}

          <td className="px-4 py-2.5 text-xs text-neutral-600 dark:text-neutral-400 font-medium">
            {f.cupo}
          </td>

          <td className="px-4 py-2.5">
            {f.cliente ? (
              <span className="font-semibold text-neutral-900 dark:text-white">
                {f.cliente}
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                Libre
              </span>
            )}
          </td>

          <td className="px-4 py-2.5">
            {f.clienteLogin ? (
              <div className="text-xs">
                <Copiable texto={f.clienteLogin} />
                <br />
                <Copiable texto={f.clienteClave} />
              </div>
            ) : f.pin ? (
              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                PIN <Copiable texto={f.pin} />
              </span>
            ) : (
              <span className="text-neutral-300 dark:text-neutral-700">—</span>
            )}
          </td>

          <td className="px-4 py-2.5 text-right tabular-nums text-xs font-medium">
            {f.ingreso != null ? (
              `$${f.ingreso.toFixed(2)}`
            ) : (
              <span className="text-neutral-300 dark:text-neutral-700">—</span>
            )}
          </td>

          <td className="px-4 py-2.5">
            {f.vence ? (
              <div className="flex items-center gap-1.5">
                <span className="tabular-nums text-xs text-neutral-600 dark:text-neutral-400">
                  {f.vence}
                </span>
                {f.badge && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
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
              </div>
            ) : (
              <span className="text-neutral-300 dark:text-neutral-700">—</span>
            )}
          </td>

          {i === 0 && (
            <td
              rowSpan={cta.filas.length}
              className="px-4 py-3 align-top text-right"
            >
              <div className="flex items-center justify-end gap-1.5">
                <ControlesOrden cuentaId={cta.cuentaId} slug={slug} />
                <button
                  type="button"
                  onClick={onEditar}
                  className="rounded-lg bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-800 transition hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
                >
                  ⚙️ Editar
                </button>
              </div>
            </td>
          )}
        </tr>
      ))}
    </>
  );
}
