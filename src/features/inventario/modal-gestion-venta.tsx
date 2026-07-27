"use client";

import { useActionState, useState } from "react";
import { cancelarVentaConLimpiezaAction, editarVentaDirectaAction } from "./actions";
import { renovarAction } from "@/features/ventas/acciones-suscripcion";

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
  slug,
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
  slug: string;
  onCerrar: () => void;
}) {
  const [modo, setModo] = useState<"ver" | "renovar" | "eliminar">("ver");
  const [estadoEdicion, actionEditar, pendienteEditar] = useActionState(editarVentaDirectaAction, null);
  const [estadoRenovar, actionRenovar, pendienteRenovar] = useActionState(renovarAction, null);

  const hoyFormato = new Date().toISOString().slice(0, 10);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl border border-neutral-200 bg-white p-6 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900">
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
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700"
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
                  <option value="ves">Bs (Bolívares a BCV)</option>
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
          <form action={cancelarVentaConLimpiezaAction} className="space-y-4">
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
                onClick={onCerrar}
                className="rounded-lg bg-red-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700"
              >
                Sí, Eliminar Venta y Liberar Cupo
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
