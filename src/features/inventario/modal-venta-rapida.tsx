"use client";

import { useActionState, useState } from "react";
import { venderUnidadRapidaAction } from "./actions";

export type VendedorOp = { id: string; nombre: string; alias: string | null };

export function ModalVentaRapida({
  cuentaId,
  unidadId,
  nombrePerfil,
  slug,
  vendedores = [],
  onCerrar,
}: {
  cuentaId: string;
  unidadId: string | null;
  nombrePerfil: string;
  slug: string;
  vendedores?: VendedorOp[];
  onCerrar: () => void;
}) {
  const [estado, action, pendiente] = useActionState(venderUnidadRapidaAction, null);
  const [seleccionVendedor, setSeleccionVendedor] = useState<string>("");

  const hoyIso = new Date().toISOString().split("T")[0];
  const esNombreGenerico =
    !nombrePerfil ||
    nombrePerfil.toLowerCase().startsWith("perfil ") ||
    nombrePerfil === "Vacío (+ Vender)" ||
    nombrePerfil === "Cuenta Completa";
  const clienteInicial = esNombreGenerico ? "" : nombrePerfil;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-6 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
              ⚡ Registrar Venta Directa / Revendedor
            </h3>
            <p className="font-mono text-xs text-neutral-500 dark:text-neutral-400">
              {nombrePerfil}
            </p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
          >
            ✕
          </button>
        </div>

        <form action={action} className="space-y-4">
          <input type="hidden" name="cuenta_id" value={cuentaId} />
          {unidadId && <input type="hidden" name="unidad_id" value={unidadId} />}
          <input type="hidden" name="slug" value={slug} />

          <div>
            <label className="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Nombre del Cliente *
            </label>
            <input
              name="cliente_nombre"
              required
              defaultValue={clienteInicial}
              placeholder="Ej. Luis Martínez"
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs text-neutral-900 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              WhatsApp / Teléfono (Opcional)
            </label>
            <input
              name="cliente_whatsapp"
              placeholder="+584121234567"
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-mono text-neutral-900 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Fecha de Inicio / Venta *
              </label>
              <input
                type="date"
                name="fecha_inicio"
                required
                defaultValue={hoyIso}
                className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs text-neutral-900 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Precio Comercial ($ USD) *
              </label>
              <input
                name="precio_usd"
                required
                inputMode="decimal"
                placeholder="2.50"
                defaultValue="2.50"
                className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-mono text-neutral-900 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Revendedor / Vendedor
            </label>
            <select
              name="vendedor_id"
              value={seleccionVendedor}
              onChange={(e) => setSeleccionVendedor(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs text-neutral-900 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
            >
              <option value="">Venta Directa (Sin revendedor)</option>
              {vendedores.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.nombre} {v.alias ? `(${v.alias})` : ""}
                </option>
              ))}
              <option value="__nuevo__">+ Registrar nuevo revendedor / intermediario...</option>
            </select>

            {seleccionVendedor === "__nuevo__" && (
              <input
                name="vendedor_nombre_custom"
                required
                placeholder="Escribe el nombre del revendedor (ej. Gabriel Nadales)"
                className="mt-2 w-full rounded-lg border border-emerald-500 bg-white px-3 py-1.5 text-xs text-neutral-900 focus:outline-none dark:bg-neutral-800 dark:text-white"
              />
            )}
            <p className="mt-1 text-[10px] text-neutral-500 dark:text-neutral-400">
              Selecciona o escribe el revendedor/intermediario que realizó la venta.
            </p>
          </div>

          {estado?.error && (
            <p className="rounded-md bg-red-50 p-2 text-xs font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300">
              ⚠️ {estado.error}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onCerrar}
              className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 dark:border-neutral-700 dark:text-neutral-300"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pendiente}
              className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
            >
              {pendiente ? "Procesando..." : "Confirmar Venta"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
