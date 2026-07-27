"use client";

import { useActionState, useState, useEffect, useRef } from "react";
import { cancelarVentaConLimpiezaAction, editarVentaDirectaAction } from "./actions";
import { renovarAction } from "@/features/ventas/acciones-suscripcion";
import type { VendedorOp } from "./modal-venta-rapida";

export function ModalGestionVenta({
  suscripcionId,
  unidadId,
  clienteId,
  clienteNombre,
  clienteCelular,
  nombrePerfil,
  pinPerfil,
  vence,
  precioUsd,
  vendedorActualId,
  vendedorActualTipo,
  vendedorActualCobraEnParalela,
  slug,
  vendedores = [],
  onCerrar,
}: {
  suscripcionId: string;
  unidadId: string | null;
  clienteId: string | null;
  clienteNombre: string;
  clienteCelular: string | null;
  nombrePerfil: string;
  pinPerfil: string | null;
  vence: string | null;
  precioUsd: number | null;
  vendedorActualId: string | null;
  vendedorActualTipo: "revendedor" | "intermediario" | null;
  vendedorActualCobraEnParalela: boolean;
  slug: string;
  vendedores?: VendedorOp[];
  onCerrar: () => void;
}) {
  const [modo, setModo] = useState<"ver" | "renovar" | "eliminar">("ver");
  const [seleccionVendedor, setSeleccionVendedor] = useState(vendedorActualId ?? "");
  const [tipoVendedor, setTipoVendedor] = useState<"revendedor" | "intermediario">(
    vendedorActualTipo ?? "intermediario",
  );
  const [cobraParalela, setCobraParalela] = useState(
    vendedorActualTipo === "revendedor" && vendedorActualCobraEnParalela,
  );
  const [configGuardada, setConfigGuardada] = useState({
    vendedorId: vendedorActualId ?? "",
    tipo: vendedorActualTipo ?? "intermediario",
    cobraParalela: vendedorActualTipo === "revendedor" && vendedorActualCobraEnParalela,
  });
  const [estadoEdicion, actionEditar, pendienteEditar] = useActionState(editarVentaDirectaAction, null);
  const [estadoRenovar, actionRenovar, pendienteRenovar] = useActionState(renovarAction, null);
  const [estadoEliminar, actionEliminar, pendienteEliminar] = useActionState(
    cancelarVentaConLimpiezaAction,
    null,
  );
  const ultimaEdicionAplicada = useRef<typeof estadoEdicion>(null);

  const hoyFormato = new Date().toISOString().slice(0, 10);
  const revendedores = vendedores.filter((v) => v.tipo === "revendedor");
  const intermediarios = vendedores.filter((v) => v.tipo !== "revendedor");
  const vendedorSeleccionado = vendedores.find((v) => v.id === seleccionVendedor);
  const nombreVendedorSeleccionado =
    seleccionVendedor === ""
      ? "Venta directa"
      : seleccionVendedor === "__nuevo__"
        ? "Nuevo vendedor"
        : vendedorSeleccionado?.nombre ?? "Vendedor no disponible";
  const baseSeleccionada =
    seleccionVendedor !== "" && tipoVendedor === "revendedor" && cobraParalela
      ? "Paralela"
      : "BCV";
  const hayCambioVendedor =
    seleccionVendedor !== configGuardada.vendedorId ||
    (seleccionVendedor !== "" &&
      (tipoVendedor !== configGuardada.tipo || cobraParalela !== configGuardada.cobraParalela));

  function cambiarVendedor(valor: string) {
    setSeleccionVendedor(valor);
    const vendedor = vendedores.find((v) => v.id === valor);
    setTipoVendedor(vendedor?.tipo ?? "intermediario");
    setCobraParalela(vendedor?.tipo === "revendedor" ? vendedor.cobraEnParalela : false);
  }

  function cambiarTipo(tipo: "revendedor" | "intermediario") {
    setTipoVendedor(tipo);
    if (tipo === "intermediario") setCobraParalela(false);
  }

  useEffect(() => {
    if (estadoEliminar?.ok) {
      const timer = setTimeout(() => {
        onCerrar();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [estadoEliminar, onCerrar]);

  useEffect(() => {
    if (estadoEdicion?.ok && ultimaEdicionAplicada.current !== estadoEdicion) {
      ultimaEdicionAplicada.current = estadoEdicion;
      setConfigGuardada({
        vendedorId: seleccionVendedor,
        tipo: tipoVendedor,
        cobraParalela,
      });
    }
  }, [estadoEdicion, seleccionVendedor, tipoVendedor, cobraParalela]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-xl border border-neutral-200 bg-white p-4 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900 sm:p-6">
        {/* Cabecera */}
        <div className="mb-4 flex items-center justify-between border-b border-neutral-200 pb-3 dark:border-neutral-800">
          <div>
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
              ⚙️ Gestionar Venta: {clienteNombre}
            </h3>
            <p className="font-mono text-xs text-neutral-500 dark:text-neutral-400">
              {nombrePerfil} {vence ? `· Vence: ${vence}` : ""}
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

        {/* MODO VISTA / EDICIÓN */}
        {modo === "ver" && (
          <form action={actionEditar} className="space-y-4">
            <input type="hidden" name="suscripcion_id" value={suscripcionId} />
            {unidadId && <input type="hidden" name="unidad_id" value={unidadId} />}
            {clienteId && <input type="hidden" name="cliente_id" value={clienteId} />}
            <input type="hidden" name="slug" value={slug} />

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Nombre del Cliente
                </label>
                <input
                  name="cliente_nombre"
                  defaultValue={clienteNombre}
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs text-neutral-900 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  N° Celular / WhatsApp
                </label>
                <input
                  name="cliente_whatsapp"
                  defaultValue={clienteCelular ?? ""}
                  placeholder="+58412..."
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-mono text-neutral-900 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Nombre del Perfil
                </label>
                <input
                  name="nombre_perfil"
                  defaultValue={nombrePerfil}
                  placeholder="Ej. Perfil 1"
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs text-neutral-900 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  PIN (4 dígitos)
                </label>
                <input
                  name="pin_perfil"
                  defaultValue={pinPerfil ?? ""}
                  placeholder="sin PIN"
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-mono text-neutral-900 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Vendido por
              </label>
              <select
                name="vendedor_id"
                value={seleccionVendedor}
                onChange={(e) => cambiarVendedor(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs text-neutral-900 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
              >
                <option value="">Venta directa (sin intermediario)</option>
                {revendedores.length > 0 && (
                  <optgroup label="Revendedores (con portal)">
                    {revendedores.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.nombre} {v.alias ? `(${v.alias})` : ""}
                        {v.cobraEnParalela ? " · paralela" : " · BCV"}
                      </option>
                    ))}
                  </optgroup>
                )}
                {intermediarios.length > 0 && (
                  <optgroup label="Intermediarios (BCV)">
                    {intermediarios.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.nombre} {v.alias ? `(${v.alias})` : ""} · BCV
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
                  placeholder="Escribe el nombre del revendedor (ej. Gabriel Nadales)"
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
                        onChange={() => cambiarTipo("intermediario")}
                        className="mt-0.5"
                      />
                      <span>
                        <strong>Intermediario</strong> — compra para conocidos y siempre
                        se cobra a <strong>BCV</strong>.
                      </span>
                    </label>
                    <label className="flex items-start gap-2">
                      <input
                        type="radio"
                        name="vendedor_tipo"
                        value="revendedor"
                        checked={tipoVendedor === "revendedor"}
                        onChange={() => cambiarTipo("revendedor")}
                        className="mt-0.5"
                      />
                      <span>
                        <strong>Revendedor</strong> — afiliado con acceso al portal.
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
                        Cobra a <strong>tasa paralela</strong>; desmarcado cobra a BCV.
                      </span>
                    </label>
                  )}

                  <p className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-200">
                    Renovaciones: {nombreVendedorSeleccionado} · {tipoVendedor} · {baseSeleccionada}
                  </p>
                </div>
              )}

              {seleccionVendedor === "" && (
                <p className="mt-2 rounded-md bg-blue-50 px-2.5 py-2 text-[11px] font-semibold text-blue-800 dark:bg-blue-950/40 dark:text-blue-200">
                  Venta directa · las renovaciones se cobran a BCV.
                </p>
              )}

              {hayCambioVendedor && (
                <p className="mt-2 text-[11px] font-medium text-amber-700 dark:text-amber-300">
                  Guarda este cambio antes de renovar para que la tasa aplicada coincida.
                </p>
              )}
            </div>

            {estadoEdicion?.error && (
              <p className="rounded-md bg-red-50 p-2 text-xs font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300">
                ⚠️ {estadoEdicion.error}
              </p>
            )}
            {estadoEdicion?.ok && (
              <p className="rounded-md bg-emerald-50 p-2 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                ✅ {estadoEdicion.ok}
              </p>
            )}

            <div className="flex items-center justify-between border-t border-neutral-200 pt-3 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => setModo("eliminar")}
                className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100 dark:bg-red-950/50 dark:text-red-300"
              >
                🗑️ Eliminar Venta
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setModo("renovar")}
                  disabled={hayCambioVendedor}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  🔄 Renovar Servicio
                </button>
                <button
                  type="submit"
                  disabled={pendienteEditar}
                  className="rounded-lg bg-neutral-900 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-50 dark:bg-white dark:text-neutral-900"
                >
                  {pendienteEditar ? "Guardando..." : "Guardar Cambios"}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* MODO RENOVAR */}
        {modo === "renovar" && (
          <form action={actionRenovar} className="space-y-4">
            <input type="hidden" name="suscripcion_id" value={suscripcionId} />
            <input type="hidden" name="inicio" value={hoyFormato} />
            <input type="hidden" name="meses" value="1" />

            <p className="text-xs text-neutral-600 dark:text-neutral-300">
              Registrar renovación de 1 mes para <strong className="text-neutral-900 dark:text-white">{clienteNombre}</strong>.
            </p>

            <div
              className={`rounded-lg border px-3 py-2 text-xs ${
                baseSeleccionada === "Paralela"
                  ? "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
                  : "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200"
              }`}
            >
              <strong>{nombreVendedorSeleccionado}</strong> · {tipoVendedor} · tasa{" "}
              <strong>{baseSeleccionada}</strong>
              <p className="mt-1 text-[11px] font-normal opacity-80">
                La base se hereda automáticamente del vendedor guardado. Si escribes USD,
                se convierte a bolívares con esta tasa.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Monto a Cobrar *
                </label>
                <input
                  name="monto"
                  defaultValue={precioUsd != null ? precioUsd.toFixed(2) : "3.00"}
                  required
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-mono text-neutral-900 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Moneda
                </label>
                <select
                  name="moneda"
                  defaultValue="usd"
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs text-neutral-900 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                >
                  <option value="usd">$ USD (Dólares)</option>
                  <option value="ves">Bs (monto recibido)</option>
                </select>
              </div>
            </div>

            {estadoRenovar?.error && (
              <p className="rounded-md bg-red-50 p-2 text-xs font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300">
                ⚠️ {estadoRenovar.error}
              </p>
            )}

            <div className="flex items-center justify-end gap-2 border-t border-neutral-200 pt-3 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => setModo("ver")}
                className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 dark:border-neutral-700 dark:text-neutral-300"
              >
                Volver
              </button>
              <button
                type="submit"
                disabled={pendienteRenovar}
                className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
              >
                {pendienteRenovar ? "Renovando..." : "Confirmar Renovación"}
              </button>
            </div>
          </form>
        )}

        {/* MODO ELIMINAR VENTA */}
        {modo === "eliminar" && (
          <form action={actionEliminar} className="space-y-4">
            <input type="hidden" name="suscripcion_id" value={suscripcionId} />
            <input type="hidden" name="unidad_id" value={unidadId ?? ""} />
            <input type="hidden" name="cliente_id" value={clienteId ?? ""} />
            <input type="hidden" name="slug" value={slug} />

            <div className="rounded-lg bg-red-50 p-4 dark:bg-red-950/40">
              <h4 className="text-xs font-bold text-red-700 dark:text-red-300">
                ⚠️ ¿Confirmas eliminar esta venta?
              </h4>
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                - La suscripción de <strong>{clienteNombre}</strong> será cancelada.
                <br />
                - El cupo quedará libre en azul (**`Vacío`**) e inmediatamente disponible en pantalla.
                <br />- Si {clienteNombre} no tiene otros servicios activos, su ficha de cliente se borrará automáticamente.
              </p>
            </div>

            {estadoEliminar?.error && (
              <p className="rounded-md bg-red-50 p-2 text-xs font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300">
                ⚠️ {estadoEliminar.error}
              </p>
            )}

            {estadoEliminar?.ok && (
              <p className="rounded-md bg-emerald-50 p-2 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                ✅ {estadoEliminar.ok}
              </p>
            )}

            <div className="flex items-center justify-end gap-2 border-t border-neutral-200 pt-3 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => setModo("ver")}
                className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 dark:border-neutral-700 dark:text-neutral-300"
              >
                Volver
              </button>
              <button
                type="submit"
                disabled={pendienteEliminar}
                className="rounded-lg bg-red-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {pendienteEliminar ? "Eliminando..." : "Sí, Eliminar Venta y Liberar Cupo"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
