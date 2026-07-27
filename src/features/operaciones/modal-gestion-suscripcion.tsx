"use client";

import Link from "next/link";
import { PanelSuscripcion } from "@/features/ventas/panel-suscripcion";
import type { SuscripcionOperativa } from "./obtener-operaciones";

export function ModalGestionSuscripcion({
  item,
  bcv,
  onCerrar,
}: {
  item: SuscripcionOperativa;
  bcv: number | null;
  onCerrar: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl dark:border-neutral-800 dark:bg-neutral-900">
        {/* Cabecera del modal */}
        <div className="flex items-start justify-between gap-4 border-b border-neutral-200 pb-4 dark:border-neutral-800">
          <div>
            <h3 className="text-lg font-semibold tracking-tight">Gestión de Suscripción</h3>
            <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
              {item.clienteNombre} · {item.plataformaNombre} ({item.productoNombre})
            </p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
          >
            ✕
          </button>
        </div>

        {/* Acceso directo a la cuenta en el inventario */}
        <div className="mt-4 flex items-center justify-between rounded-xl bg-neutral-50 p-3 dark:bg-neutral-800/60">
          <div className="text-xs">
            <span className="font-medium text-neutral-800 dark:text-neutral-200">
              Perfil: {item.perfilNombre ?? "Sin perfil asignado"}
            </span>
            {item.renovacion && (
              <span className="block text-neutral-500 dark:text-neutral-400">
                Vence el {item.renovacion}
              </span>
            )}
          </div>
          <Link
            href={`/inventario/${item.plataformaNombre.toLowerCase().replace(/[^a-z0-9]/g, "-")}`}
            className="inline-flex items-center gap-1 text-xs font-medium text-neutral-900 underline underline-offset-2 hover:text-neutral-600 dark:text-white dark:hover:text-neutral-300"
          >
            Ir a Inventario 📦
          </Link>
        </div>

        {/* Formulario completo de pausa / cancelación / recordatorio */}
        <div className="mt-4 max-h-[60vh] overflow-y-auto pr-1">
          <PanelSuscripcion
            suscripcionId={item.id}
            estado={item.estado}
            proximaRenovacion={item.renovacion}
            recontactarEl={item.recontactar_el}
            nota={item.nota}
            bcv={bcv}
          />
        </div>

        <div className="mt-4 flex justify-end border-t border-neutral-200 pt-3 dark:border-neutral-800">
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-xl px-4 py-2 text-xs font-medium text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
