"use client";

import { useState } from "react";
import type { DatosOperaciones, SuscripcionOperativa } from "./obtener-operaciones";
import { BotonCopiarWhatsapp } from "./boton-copiar-whatsapp";
import { ModalRenovacion } from "./modal-renovacion";
import { ModalGestionSuscripcion } from "./modal-gestion-suscripcion";
import { BotonLimpieza } from "@/features/ventas/boton-limpieza";

type TabTipo = "urgente" | "proximos" | "pausados" | "todos" | "limpieza";

export function CentroOperaciones({ datos }: { datos: DatosOperaciones }) {
  const [busqueda, setBusqueda] = useState("");
  const [tab, setTab] = useState<TabTipo>("urgente");
  const [renovandoItem, setRenovandoItem] = useState<SuscripcionOperativa | null>(null);
  const [gestionandoItem, setGestionandoItem] = useState<SuscripcionOperativa | null>(null);

  const urgenteItems = [...datos.vencidos, ...datos.hoy];
  const totalLimpiezas = datos.limpiezas.length;

  // Filtrado dinámico por búsqueda
  const q = busqueda.toLowerCase().trim();
  const filtrar = (items: SuscripcionOperativa[]) => {
    if (!q) return items;
    return items.filter(
      (item) =>
        item.clienteNombre.toLowerCase().includes(q) ||
        (item.clienteWhatsapp && item.clienteWhatsapp.includes(q)) ||
        (item.vendedorNombre && item.vendedorNombre.toLowerCase().includes(q)) ||
        item.plataformaNombre.toLowerCase().includes(q) ||
        item.productoNombre.toLowerCase().includes(q) ||
        (item.perfilNombre && item.perfilNombre.toLowerCase().includes(q)),
    );
  };

  const itemsTab =
    tab === "urgente"
      ? filtrar(urgenteItems)
      : tab === "proximos"
        ? filtrar(datos.proximos)
        : tab === "pausados"
          ? filtrar(datos.pausados)
        : tab === "todos"
          ? filtrar(datos.todas)
          : [];

  return (
    <div className="space-y-6">
      {/* Buscador Universal e Indicadores Rápidos */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="🔍 Buscar cliente, teléfono, revendedor, plataforma..."
            className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm shadow-sm transition focus:border-neutral-900 focus:outline-none dark:border-neutral-800 dark:bg-neutral-900 dark:focus:border-white"
          />
          {busqueda && (
            <button
              type="button"
              onClick={() => setBusqueda("")}
              className="absolute right-3 top-3 text-xs text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Pestañas / Filtros Rápidos */}
      <div className="flex flex-wrap items-center gap-2 border-b border-neutral-200 pb-3 dark:border-neutral-800">
        <button
          type="button"
          onClick={() => setTab("urgente")}
          className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium transition ${
            tab === "urgente"
              ? "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200"
              : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-900"
          }`}
        >
          <span>🔴 Atención Urgente</span>
          <span className="rounded-full bg-red-200 px-2 py-0.5 text-[11px] font-semibold dark:bg-red-900">
            {urgenteItems.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setTab("proximos")}
          className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium transition ${
            tab === "proximos"
              ? "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200"
              : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-900"
          }`}
        >
          <span>🟡 Próximos 5 Días</span>
          <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[11px] font-semibold dark:bg-amber-900">
            {datos.proximos.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setTab("todos")}
          className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium transition ${
            tab === "todos"
              ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
              : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-900"
          }`}
        >
          <span>👥 Todos ({datos.todas.length})</span>
        </button>

        {datos.pausados.length > 0 && (
          <button
            type="button"
            onClick={() => setTab("pausados")}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium transition ${
              tab === "pausados"
                ? "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200"
                : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-900"
            }`}
          >
            <span>⏸️ En pausa</span>
            <span className="rounded-full bg-sky-200 px-2 py-0.5 text-[11px] font-semibold dark:bg-sky-900">
              {datos.pausados.length}
            </span>
          </button>
        )}

        {totalLimpiezas > 0 && (
          <button
            type="button"
            onClick={() => setTab("limpieza")}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium transition ${
              tab === "limpieza"
                ? "bg-amber-500 text-white"
                : "bg-amber-50 text-amber-800 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300"
            }`}
          >
            <span>🔐 Retiros pendientes</span>
            <span className="rounded-full bg-amber-600 px-2 py-0.5 text-[11px] font-semibold text-white">
              {totalLimpiezas}
            </span>
          </button>
        )}
      </div>

      {/* Lista de suscripciones / tareas */}
      {tab === "limpieza" ? (
        <div className="space-y-3">
          <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-100">
            <p className="font-semibold">¿Qué significa “retiro pendiente”?</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs leading-relaxed">
              <li>El servicio ya está cancelado en GL, pero el cupo sigue bloqueado por seguridad.</li>
              <li>Entra a la plataforma y retira el perfil, dispositivo o correo del cliente.</li>
              <li>Pulsa <strong>Confirmar retiro</strong>; entonces el cupo vuelve al inventario disponible.</li>
            </ol>
          </div>
          {datos.limpiezas.map((o) => (
            <div
              key={o.id}
              className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50/60 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-amber-900 dark:bg-amber-950/20"
            >
              <div>
                <span className="font-semibold text-neutral-900 dark:text-white">
                  {o.plataformaNombre}
                </span>{" "}
                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                  · {o.cuentaAlias} · {o.unidadNombre}
                </span>
              </div>
              <BotonLimpieza operacionId={o.id} />
            </div>
          ))}
        </div>
      ) : itemsTab.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
          {busqueda ? `No hay resultados para "${busqueda}".` : "No hay clientes en este grupo."}
        </div>
      ) : (
        <div className="space-y-3">
          {itemsTab.map((item) => (
            <div
              key={item.id}
              className="group flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm transition hover:border-neutral-300 sm:flex-row sm:items-center sm:justify-between dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700"
            >
              {/* Info principal */}
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-neutral-900 dark:text-white">
                    {item.clienteNombre}
                  </span>

                  {item.clienteWhatsapp && (
                    <span className="font-mono text-xs text-neutral-500 dark:text-neutral-400">
                      📞 {item.clienteWhatsapp}
                    </span>
                  )}

                  {item.vendedorNombre && (
                    <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[11px] text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                      Revendedor: {item.vendedorNombre}
                    </span>
                  )}

                  {item.estado === "pausada" ? (
                    <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-medium text-sky-800 dark:bg-sky-950 dark:text-sky-300">
                      En pausa · cupo reservado
                    </span>
                  ) : item.badge ? (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        item.badge.color === "rojo"
                          ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                          : item.badge.color === "amarillo"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                            : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                      }`}
                    >
                      {item.badge.etiqueta}
                    </span>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                  <span className="font-medium text-neutral-700 dark:text-neutral-300">
                    {item.plataformaNombre}
                  </span>
                  <span>·</span>
                  <span>{item.productoNombre}</span>
                  {item.perfilNombre && (
                    <>
                      <span>·</span>
                      <span className="text-neutral-800 dark:text-neutral-200">
                        {item.perfilNombre}
                      </span>
                    </>
                  )}
                  {item.renovacion && (
                    <>
                      <span>·</span>
                      <span>Vence {item.renovacion}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Botones de acción rápida */}
              <div className="flex items-center gap-2 pt-2 sm:pt-0">
                <button
                  type="button"
                  onClick={() => setRenovandoItem(item)}
                  className="rounded-xl bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
                >
                  {item.estado === "pausada" ? "💳 Reactivar y renovar" : "💳 Renovar y Cobrar"}
                </button>

                <BotonCopiarWhatsapp suscripcionId={item.id} />

                <button
                  type="button"
                  onClick={() => setGestionandoItem(item)}
                  className="rounded-xl border border-neutral-200 bg-neutral-50 px-2.5 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
                  title="Gestionar estado, pausar, cancelar o ir al inventario"
                >
                  ⚙️ Gestionar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Renovación */}
      {renovandoItem && (
        <ModalRenovacion
          suscripcionId={renovandoItem.id}
          clienteNombre={renovandoItem.clienteNombre}
          plataformaNombre={renovandoItem.plataformaNombre}
          productoNombre={renovandoItem.productoNombre}
          tipoCorreoTarifaSpotify={renovandoItem.tipoCorreoTarifaSpotify}
          renovacionActual={renovandoItem.renovacion}
          bcv={datos.bcv}
          onCerrar={() => setRenovandoItem(null)}
        />
      )}

      {/* Modal de Gestión (Pausar/Cancelar/Inventario) */}
      {gestionandoItem && (
        <ModalGestionSuscripcion
          item={gestionandoItem}
          bcv={datos.bcv}
          onCerrar={() => setGestionandoItem(null)}
        />
      )}
    </div>
  );
}
