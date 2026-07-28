"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import {
  eliminarClienteAction,
  guardarClienteAction,
  type EstadoCliente,
} from "./actions";

const campo =
  "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-base outline-none transition focus:border-emerald-600 dark:border-neutral-700 dark:bg-neutral-950";

export type ServicioCliente = {
  suscripcionId: string;
  producto: string;
  plataforma: string;
  plataformaSlug: string | null;
  vence: string | null;
  dias: number | null;
  precioUsd: number | null;
  vendedor: string | null;
};

export type ClienteFila = {
  id: string;
  nombre: string;
  whatsapp_original: string | null;
  notas: string | null;
  servicios: ServicioCliente[];
};

function fechaVisible(fecha: string | null): string {
  if (!fecha) return "Sin fecha";
  const [anio, mes, dia] = fecha.split("-");
  return anio && mes && dia ? `${dia}/${mes}/${anio}` : fecha;
}

function estadoServicio(dias: number | null) {
  if (dias === null) return { texto: "Sin fecha", clase: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300" };
  if (dias < 0) return { texto: `Vencido hace ${Math.abs(dias)} d`, clase: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300" };
  if (dias === 0) return { texto: "Vence hoy", clase: "bg-red-600 text-white" };
  if (dias <= 5) return { texto: `Vence en ${dias} d`, clase: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300" };
  return { texto: `Vence en ${dias} d`, clase: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" };
}

export function EditorCliente({ cliente }: { cliente?: ClienteFila }) {
  const [estado, action, pendiente] = useActionState<EstadoCliente, FormData>(guardarClienteAction, null);
  const [borrado, accionBorrar, borrando] = useActionState<EstadoCliente, FormData>(eliminarClienteAction, null);
  const [abierto, setAbierto] = useState(!cliente);
  const [confirmar, setConfirmar] = useState(false);

  if (cliente && !abierto) {
    const servicioPrioritario = cliente.servicios[0];
    const alerta = servicioPrioritario ? estadoServicio(servicioPrioritario.dias) : null;
    const whatsapp = cliente.whatsapp_original?.replace(/[^0-9]/g, "");

    return (
      <article className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                {cliente.nombre.trim().charAt(0).toUpperCase() || "?"}
              </span>
              <div className="min-w-0">
                <h3 className="truncate font-semibold">{cliente.nombre}</h3>
                <p className="truncate text-xs text-neutral-500">{cliente.whatsapp_original ?? "Sin WhatsApp registrado"}</p>
              </div>
            </div>
            <span className="shrink-0 rounded-full bg-neutral-100 px-2 py-1 text-[11px] font-medium dark:bg-neutral-800">
              {cliente.servicios.length} {cliente.servicios.length === 1 ? "servicio" : "servicios"}
            </span>
          </div>

          {servicioPrioritario ? (
            <div className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-950/60">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold">{servicioPrioritario.plataforma} · {servicioPrioritario.producto}</p>
                  <p className="mt-0.5 text-[11px] text-neutral-500">Renueva {fechaVisible(servicioPrioritario.vence)}</p>
                </div>
                {alerta && <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${alerta.clase}`}>{alerta.texto}</span>}
              </div>
              {cliente.servicios.length > 1 && (
                <p className="mt-2 text-[11px] text-neutral-500">+ {cliente.servicios.length - 1} servicio(s) adicional(es)</p>
              )}
            </div>
          ) : (
            <p className="mt-4 rounded-lg bg-neutral-50 p-3 text-xs text-neutral-500 dark:bg-neutral-950">Sin servicios activos</p>
          )}
        </div>

        <div className="grid grid-cols-2 border-t border-neutral-200 dark:border-neutral-800">
          {whatsapp ? (
            <a
              href={`https://wa.me/${whatsapp}`}
              target="_blank"
              rel="noreferrer"
              className="flex min-h-11 items-center justify-center gap-2 border-r border-neutral-200 text-xs font-semibold text-emerald-700 dark:border-neutral-800 dark:text-emerald-400"
            >
              WhatsApp
            </a>
          ) : (
            <span className="flex min-h-11 items-center justify-center border-r border-neutral-200 text-xs text-neutral-400 dark:border-neutral-800">Sin contacto</span>
          )}
          <button type="button" onClick={() => setAbierto(true)} className="min-h-11 text-xs font-semibold text-neutral-700 dark:text-neutral-200">
            Ver y gestionar
          </button>
        </div>
      </article>
    );
  }

  return (
    <form
      action={action}
      onReset={(evento) => evento.preventDefault()}
      className="space-y-4 rounded-2xl border border-emerald-300 bg-white p-4 shadow-sm dark:border-emerald-900 dark:bg-neutral-900"
    >
      {cliente && <input type="hidden" name="id" value={cliente.id} />}

      {cliente && (
        <div className="flex items-start justify-between gap-3 border-b border-neutral-200 pb-3 dark:border-neutral-800">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Ficha del cliente</p>
            <h3 className="font-semibold">{cliente.nombre}</h3>
          </div>
          <button type="button" onClick={() => setAbierto(false)} className="rounded-lg border px-3 py-2 text-xs">Cerrar</button>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-medium">
          Nombre
          <input name="nombre" required defaultValue={cliente?.nombre ?? ""} className={`${campo} mt-1`} />
        </label>
        <label className="text-sm font-medium">
          WhatsApp
          <input
            name="whatsapp"
            inputMode="tel"
            placeholder="+58…"
            defaultValue={cliente?.whatsapp_original ?? ""}
            className={`${campo} mt-1`}
          />
        </label>
      </div>

      <label className="block text-sm font-medium">
        Notas operativas
        <textarea name="notas" rows={2} defaultValue={cliente?.notas ?? ""} className={`${campo} mt-1 resize-y`} />
      </label>

      {cliente && cliente.servicios.length > 0 && (
        <section className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Servicios activos</h4>
          {cliente.servicios.map((servicio) => {
            const alerta = estadoServicio(servicio.dias);
            return (
              <div key={servicio.suscripcionId} className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{servicio.plataforma}</p>
                    <p className="truncate text-xs text-neutral-500">{servicio.producto}{servicio.vendedor ? ` · ${servicio.vendedor}` : ""}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${alerta.clase}`}>{alerta.texto}</span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                  <span className="font-mono text-neutral-500">{fechaVisible(servicio.vence)}</span>
                  {servicio.plataformaSlug && (
                    <Link
                      href={`/inventario/${servicio.plataformaSlug}?q=${encodeURIComponent(cliente.nombre)}`}
                      className="font-semibold text-blue-600 underline underline-offset-2 dark:text-blue-400"
                    >
                      Abrir en inventario
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="submit"
          disabled={pendiente}
          className="rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {pendiente ? "Guardando…" : cliente ? "Guardar cambios" : "Crear cliente"}
        </button>
        {estado?.error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{estado.error}</p>}
        {estado?.ok && <p className="text-sm text-emerald-600 dark:text-emerald-400">{estado.ok}</p>}
      </div>

      {cliente && (
        <div className="border-t border-neutral-200 pt-3 dark:border-neutral-800">
          {!confirmar ? (
            <button type="button" onClick={() => setConfirmar(true)} className="text-xs text-red-600 underline underline-offset-2 dark:text-red-400">
              Eliminar cliente
            </button>
          ) : (
            <div className="rounded-lg bg-red-50 p-3 dark:bg-red-950/30">
              <p className="text-xs text-red-800 dark:text-red-300">Solo puede eliminarse si ya no tiene servicios asociados.</p>
              <div className="mt-2 flex items-center gap-2">
                <button type="button" onClick={() => setConfirmar(false)} className="text-xs text-neutral-500">Cancelar</button>
                <button
                  type="submit"
                  formAction={accionBorrar}
                  disabled={borrando}
                  className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                >
                  {borrando ? "Eliminando…" : "Confirmar eliminación"}
                </button>
                {borrado?.error && <p role="alert" className="text-xs text-red-600">{borrado.error}</p>}
              </div>
            </div>
          )}
        </div>
      )}
    </form>
  );
}
