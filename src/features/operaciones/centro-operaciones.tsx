"use client";

import Link from "next/link";
import { useState } from "react";
import type { DatosOperaciones, SuscripcionOperativa } from "./obtener-operaciones";
import { BotonCopiarWhatsapp } from "./boton-copiar-whatsapp";
import { ModalRenovacion } from "./modal-renovacion";
import { ModalGestionSuscripcion } from "./modal-gestion-suscripcion";
import { BotonLimpieza } from "@/features/ventas/boton-limpieza";

type TabTipo = "urgente" | "proximos" | "pausados" | "todos" | "limpieza";
type GrupoOperaciones = {
  clave: string;
  clienteNombre: string;
  clienteWhatsapp: string | null;
  items: SuscripcionOperativa[];
};

function normalizarTelefono(valor: string | null): string {
  return (valor ?? "").replace(/[^\d+]/g, "");
}

function claveGrupoCliente(item: SuscripcionOperativa): string {
  if (item.clienteId) return `id:${item.clienteId}`;
  const nombre = item.clienteNombre.trim().toLowerCase();
  const telefono = normalizarTelefono(item.clienteWhatsapp);
  return telefono ? `nombre-telefono:${nombre}::${telefono}` : `nombre:${nombre}`;
}

function agruparOperaciones(items: SuscripcionOperativa[]): GrupoOperaciones[] {
  const grupos = new Map<string, GrupoOperaciones>();

  for (const item of items) {
    const clave = claveGrupoCliente(item);
    const grupo = grupos.get(clave);
    if (grupo) {
      grupo.items.push(item);
      continue;
    }
    grupos.set(clave, {
      clave,
      clienteNombre: item.clienteNombre,
      clienteWhatsapp: item.clienteWhatsapp,
      items: [item],
    });
  }

  return [...grupos.values()]
    .map((grupo) => ({
      ...grupo,
      items: [...grupo.items].sort((a, b) => (a.dias ?? 9999) - (b.dias ?? 9999)),
    }))
    .sort((a, b) => (a.items[0]?.dias ?? 9999) - (b.items[0]?.dias ?? 9999));
}

// Color reservado al SIGNIFICADO (urgencia), no a decorar: rojo=urgente,
// ámbar=pronto, esmeralda=sano, neutro=pausa. Vive en la franja/número, sobre
// tarjeta neutra, para no saturar.
const HUE: Record<string, { stripe: string; num: string; ring: string; dot: string }> = {
  red: {
    stripe: "border-l-red-500",
    num: "text-red-700 dark:text-red-400",
    ring: "ring-red-500/30",
    dot: "bg-red-500",
  },
  amber: {
    stripe: "border-l-amber-500",
    num: "text-amber-700 dark:text-amber-400",
    ring: "ring-amber-500/30",
    dot: "bg-amber-500",
  },
  neutral: {
    stripe: "border-l-neutral-400 dark:border-l-neutral-500",
    num: "text-neutral-900 dark:text-white",
    ring: "ring-neutral-400/40",
    dot: "bg-neutral-400",
  },
  emerald: {
    stripe: "border-l-emerald-500",
    num: "text-neutral-900 dark:text-white",
    ring: "ring-emerald-500/30",
    dot: "bg-emerald-500",
  },
};

export function CentroOperaciones({ datos }: { datos: DatosOperaciones }) {
  const [busqueda, setBusqueda] = useState("");
  const [tab, setTab] = useState<TabTipo>("urgente");
  const [renovandoItem, setRenovandoItem] = useState<SuscripcionOperativa | null>(null);
  const [gestionandoItem, setGestionandoItem] = useState<SuscripcionOperativa | null>(null);

  const urgenteItems = [...datos.vencidos, ...datos.hoy];
  const totalLimpiezas = datos.limpiezas.length;

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
  const gruposTab = agruparOperaciones(itemsTab);

  const tarjetas: {
    tab: TabTipo;
    etiqueta: string;
    valor: number;
    sub: string;
    hue: keyof typeof HUE;
    pulso?: boolean;
  }[] = [
    { tab: "urgente", etiqueta: "Atención urgente", valor: urgenteItems.length, sub: "Vencidos o vencen hoy", hue: "red", pulso: true },
    { tab: "proximos", etiqueta: "Próximos 5 días", valor: datos.proximos.length, sub: "Renovación preventiva", hue: "amber" },
    { tab: "pausados", etiqueta: "En pausa", valor: datos.pausados.length, sub: "Cupo reservado", hue: "neutral" },
    { tab: "todos", etiqueta: "Total activas", valor: datos.todas.length, sub: "Cartera de clientes", hue: "emerald" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tarjetas.map((t) => {
          const hue = HUE[t.hue];
          const activo = tab === t.tab;
          return (
            <button
              key={t.tab}
              type="button"
              onClick={() => setTab(t.tab)}
              aria-pressed={activo}
              className={`flex flex-col justify-between rounded-2xl border border-l-4 border-neutral-200 bg-white p-4 text-left shadow-xs transition active:scale-[0.99] dark:border-neutral-800 dark:bg-neutral-900 ${hue.stripe} ${
                activo ? `ring-2 ${hue.ring}` : "hover:border-neutral-300 dark:hover:border-neutral-700"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  {t.etiqueta}
                </span>
                <span className={`size-2 rounded-full ${hue.dot} ${t.pulso ? "animate-pulse" : ""}`} />
              </div>
              <p className={`mt-2 text-2xl font-bold tabular-nums ${hue.num}`}>{t.valor}</p>
              <p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">{t.sub}</p>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <div className="pointer-events-none absolute left-4 top-3.5 text-neutral-400">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por cliente, teléfono, revendedor, plataforma..."
            className="w-full rounded-xl border border-neutral-200 bg-white py-2.5 pl-10 pr-10 text-sm shadow-xs transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-neutral-800 dark:bg-neutral-900 dark:focus:border-blue-500"
          />
          {busqueda && (
            <button
              type="button"
              onClick={() => setBusqueda("")}
              className="absolute right-3 top-2.5 rounded-md px-1.5 py-0.5 text-xs text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
            >
              Limpiar
            </button>
          )}
        </div>

        {totalLimpiezas > 0 && (
          <button
            type="button"
            onClick={() => setTab("limpieza")}
            className={`flex shrink-0 items-center justify-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-semibold transition ${
              tab === "limpieza"
                ? "border-amber-500 bg-amber-50 text-amber-800 dark:border-amber-600 dark:bg-amber-950/40 dark:text-amber-300"
                : "border-neutral-200 bg-white text-neutral-600 hover:border-amber-300 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:border-amber-800"
            }`}
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            <span>Retiros pendientes</span>
            <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-bold text-white">
              {totalLimpiezas}
            </span>
          </button>
        )}
      </div>

      {tab === "limpieza" ? (
        <div className="space-y-3">
          <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-xs text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
            <p className="font-semibold text-neutral-900 dark:text-white">¿Qué significa “retiro pendiente”?</p>
            <ol className="mt-1.5 list-decimal space-y-1 pl-4 leading-relaxed">
              <li>El servicio ya está cancelado en GL, pero el cupo sigue bloqueado por seguridad.</li>
              <li>Entra a la plataforma externa y retira el perfil, dispositivo o correo del cliente.</li>
              <li>
                Pulsa <strong>Confirmar retiro</strong> para devolver el cupo al inventario
                disponible.
              </li>
            </ol>
          </div>
          {datos.limpiezas.map((o) => (
            <div
              key={o.id}
              className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50/60 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-amber-900/50 dark:bg-amber-950/20"
            >
              <div>
                <span className="font-semibold text-neutral-900 dark:text-white">{o.plataformaNombre}</span>{" "}
                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                  · {o.cuentaAlias} · {o.unidadNombre}
                </span>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                {o.cuentaId && o.plataformaSlug && (
                  <Link
                    href={`/inventario/${o.plataformaSlug}?cuenta=${encodeURIComponent(o.cuentaId)}&retiro=${encodeURIComponent(o.id)}`}
                    className="inline-flex items-center justify-center rounded-xl border border-amber-300 bg-white px-3.5 py-2 text-xs font-semibold text-amber-800 shadow-xs transition hover:bg-amber-50 dark:border-amber-800 dark:bg-neutral-900 dark:text-amber-300 dark:hover:bg-amber-950/40"
                  >
                    Abrir servicio
                  </Link>
                )}
                <BotonLimpieza operacionId={o.id} />
              </div>
            </div>
          ))}
        </div>
      ) : itemsTab.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 p-8 text-center text-xs text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
          {busqueda ? `No hay resultados para "${busqueda}".` : "No hay clientes en este grupo."}
        </div>
      ) : (
        <div className="space-y-3">
          {gruposTab.map((grupo) => (
            <div
              key={grupo.clave}
              className="group rounded-2xl border border-neutral-200 bg-white p-4 shadow-xs transition hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700"
            >
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-neutral-900 dark:text-white">
                    {grupo.clienteNombre}
                  </span>
                  {grupo.clienteWhatsapp && (
                    <span className="font-mono text-xs text-neutral-500 dark:text-neutral-400">
                      📞 {grupo.clienteWhatsapp}
                    </span>
                  )}
                  <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-[11px] font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                    {grupo.items.length} {grupo.items.length === 1 ? "servicio" : "servicios"}
                  </span>
                </div>

                <div className="space-y-2">
                  {grupo.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-950/40"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-neutral-700 dark:text-neutral-200">
                          {item.plataformaNombre}
                        </span>
                        <span className="text-xs text-neutral-500 dark:text-neutral-400">
                          · {item.productoNombre}
                        </span>
                        {item.perfilNombre && (
                          <span className="text-xs text-neutral-800 dark:text-neutral-200">
                            · {item.perfilNombre}
                          </span>
                        )}
                        {item.vendedorNombre && (
                          <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                            Revendedor: {item.vendedorNombre}
                          </span>
                        )}
                        {item.estado === "pausada" ? (
                          <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-[11px] font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                            En pausa · cupo reservado
                          </span>
                        ) : item.badge ? (
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                              item.badge.color === "rojo"
                                ? "bg-red-500/10 text-red-700 dark:bg-red-500/20 dark:text-red-400"
                                : item.badge.color === "amarillo"
                                  ? "bg-amber-500/10 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
                                  : "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                            }`}
                          >
                            {item.badge.etiqueta}
                          </span>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                        {item.renovacion && (
                          <span className="font-medium text-neutral-600 dark:text-neutral-400">
                            Vence {item.renovacion}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setRenovandoItem(item)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-neutral-900 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-neutral-800 active:scale-[0.98] dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                            />
                          </svg>
                          <span>
                            {item.estado === "pausada" ? "Reactivar y renovar" : "Renovar y Cobrar"}
                          </span>
                        </button>

                        <BotonCopiarWhatsapp suscripcionId={item.id} />

                        <button
                          type="button"
                          onClick={() => setGestionandoItem(item)}
                          className="inline-flex items-center gap-1 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-100 active:scale-[0.98] dark:border-neutral-800 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
                          title="Gestionar estado, pausar, cancelar o ir al inventario"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                            />
                          </svg>
                          <span>Gestionar</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {renovandoItem && (
        <ModalRenovacion
          suscripcionId={renovandoItem.id}
          clienteNombre={renovandoItem.clienteNombre}
          plataformaNombre={renovandoItem.plataformaNombre}
          productoNombre={renovandoItem.productoNombre}
          tipoCorreoTarifaSpotify={renovandoItem.tipoCorreoTarifaSpotify}
          renovacionActual={renovandoItem.renovacion}
          bcv={datos.bcv}
          paralela={datos.paralela}
          vendedorActualId={renovandoItem.vendedorId}
          vendedores={datos.vendedores}
          onCerrar={() => setRenovandoItem(null)}
        />
      )}

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
