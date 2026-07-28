"use client";

import { useActionState, useState } from "react";
import { venderUnidadRapidaAction } from "./actions";

export type VendedorOp = {
  id: string;
  nombre: string;
  alias: string | null;
  tipo: "revendedor" | "intermediario";
  cobraEnParalela: boolean;
};

export function ModalVentaRapida({
  cuentaId,
  unidadId,
  nombrePerfil,
  clienteLogin,
  clienteClave,
  slug,
  vendedores = [],
  onCerrar,
}: {
  cuentaId: string;
  unidadId: string | null;
  nombrePerfil: string;
  clienteLogin?: string | null;
  clienteClave?: string | null;
  slug: string;
  vendedores?: VendedorOp[];
  onCerrar: () => void;
}) {
  const [estado, action, pendiente] = useActionState(venderUnidadRapidaAction, null);
  const [seleccionVendedor, setSeleccionVendedor] = useState<string>("");
  // El tipo (revendedor/intermediario) y la base de tasa se guardan en el
  // vendedor: al elegirlo reflejan lo guardado; al confirmar, se persisten.
  const [tipoVendedor, setTipoVendedor] = useState<"revendedor" | "intermediario">(
    "intermediario",
  );
  const [cobraParalela, setCobraParalela] = useState(false);

  const revendedores = vendedores.filter((v) => v.tipo === "revendedor");
  const intermediarios = vendedores.filter((v) => v.tipo !== "revendedor");

  function onCambiarVendedor(valor: string) {
    setSeleccionVendedor(valor);
    const v = vendedores.find((x) => x.id === valor);
    // Existente: hereda su tipo/base. Nuevo: intermediario por defecto (casual).
    setTipoVendedor(v?.tipo ?? "intermediario");
    setCobraParalela(v?.tipo === "revendedor" ? v.cobraEnParalela : false);
  }

  // Un intermediario nunca cobra a paralela (siempre BCV).
  function onCambiarTipo(t: "revendedor" | "intermediario") {
    setTipoVendedor(t);
    if (t === "intermediario") setCobraParalela(false);
  }

  const hoyIso = new Date().toISOString().split("T")[0];
  const esNombreGenerico =
    !nombrePerfil ||
    nombrePerfil.toLowerCase().startsWith("perfil ") ||
    nombrePerfil.toLowerCase().startsWith("miembro ") ||
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

          {(clienteLogin || clienteClave) && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100">
              <strong>Acceso Spotify preparado para este cupo</strong>
              <div className="mt-2 grid gap-1 font-mono text-[11px]">
                <span className="break-all">Correo: {clienteLogin ?? "Sin correo"}</span>
                <span className="break-all">Clave: {clienteClave ?? "Sin clave"}</span>
              </div>
              <p className="mt-2 opacity-75">
                Al confirmar, este acceso quedará enlazado automáticamente al cliente.
              </p>
            </div>
          )}

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
              onChange={(e) => onCambiarVendedor(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs text-neutral-900 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
            >
              <option value="">Venta Directa (yo, sin intermediario)</option>
              {revendedores.length > 0 && (
                <optgroup label="Revendedores (con portal)">
                  {revendedores.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.nombre} {v.alias ? `(${v.alias})` : ""}
                      {v.cobraEnParalela ? " · paralela" : ""}
                    </option>
                  ))}
                </optgroup>
              )}
              {intermediarios.length > 0 && (
                <optgroup label="Intermediarios (BCV)">
                  {intermediarios.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.nombre} {v.alias ? `(${v.alias})` : ""}
                    </option>
                  ))}
                </optgroup>
              )}
              <option value="__nuevo__">+ Registrar nuevo...</option>
            </select>

            {seleccionVendedor === "__nuevo__" && (
              <input
                name="vendedor_nombre_custom"
                required
                placeholder="Nombre (ej. Gabriel Nadales)"
                className="mt-2 w-full rounded-lg border border-emerald-500 bg-white px-3 py-1.5 text-xs text-neutral-900 focus:outline-none dark:bg-neutral-800 dark:text-white"
              />
            )}

            {seleccionVendedor !== "" && (
              <div className="mt-2 space-y-2 rounded-lg bg-neutral-50 px-2.5 py-2 dark:bg-neutral-800/60">
                <div className="flex flex-col gap-1 text-[11px] text-neutral-700 dark:text-neutral-300">
                  <label className="flex items-start gap-2">
                    <input
                      type="radio"
                      name="vendedor_tipo"
                      value="intermediario"
                      checked={tipoVendedor === "intermediario"}
                      onChange={() => onCambiarTipo("intermediario")}
                      className="mt-0.5"
                    />
                    <span>
                      <strong>Intermediario</strong> — compra para conocidos, sin
                      usuario. Siempre a <strong>BCV</strong>.
                    </span>
                  </label>
                  <label className="flex items-start gap-2">
                    <input
                      type="radio"
                      name="vendedor_tipo"
                      value="revendedor"
                      checked={tipoVendedor === "revendedor"}
                      onChange={() => onCambiarTipo("revendedor")}
                      className="mt-0.5"
                    />
                    <span>
                      <strong>Revendedor</strong> — afiliado, tendrá usuario y verá
                      sus clientes en el portal.
                    </span>
                  </label>
                </div>

                {tipoVendedor === "revendedor" && (
                  <label className="flex items-start gap-2 rounded-md bg-amber-50 px-2 py-1.5 text-[11px] text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                    <input
                      type="checkbox"
                      name="vendedor_cobra_paralela"
                      checked={cobraParalela}
                      onChange={(e) => setCobraParalela(e.target.checked)}
                      className="mt-0.5"
                    />
                    <span>
                      Cobra a <strong>tasa paralela</strong> (si no, a BCV). Se
                      aplica a sus ventas y renovaciones.
                    </span>
                  </label>
                )}
              </div>
            )}
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
