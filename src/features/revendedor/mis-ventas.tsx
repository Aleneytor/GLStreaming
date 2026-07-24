import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { badgeVencimiento, diasParaRenovar } from "@/domain/fechas";
import { BotonAcceso } from "@/features/ventas/boton-acceso";

/**
 * Portal del revendedor (Fase 5, DEC-97).
 *
 * Su única ventana es `v_mis_ventas_revendedor`: ve SOLO sus ventas, nunca el
 * stock ni las finanzas. Aquí se le da lo que necesita para atender a sus
 * clientes: buscarlos, saber a quién le vence pronto, escribirle por WhatsApp y
 * copiar el paquete de acceso (correo/contraseña/perfil/PIN), que se entrega
 * verificando la propiedad y descifrando en el servidor.
 */

function hoyCaracas(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Caracas",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

type Venta = {
  suscripcion_id: string;
  estado: string;
  cliente: string;
  plataforma: string;
  producto: string;
  modalidad: string;
  fecha_renovacion: string | null;
  cliente_whatsapp: string | null;
  cliente_whatsapp_original: string | null;
};

export async function MisVentasRevendedor({ q }: { q?: string }) {
  const hoy = hoyCaracas();
  const supabase = await createClient();

  const { data } = await supabase
    .from("v_mis_ventas_revendedor")
    .select(
      "suscripcion_id, estado, cliente, plataforma, producto, modalidad, fecha_renovacion, cliente_whatsapp, cliente_whatsapp_original",
    )
    // El revendedor atiende lo que está vivo; lo cancelado no le estorba.
    .in("estado", ["activa", "pausada"]);

  const busqueda = (q ?? "").trim().toLowerCase();
  const ventas = ((data ?? []) as Venta[])
    .filter(
      (v) =>
        !busqueda ||
        v.cliente?.toLowerCase().includes(busqueda) ||
        v.plataforma?.toLowerCase().includes(busqueda) ||
        v.producto?.toLowerCase().includes(busqueda),
    )
    .map((v) => ({
      ...v,
      dias: v.fecha_renovacion ? diasParaRenovar(v.fecha_renovacion, hoy) : null,
    }))
    .sort((a, b) => (a.dias ?? 9999) - (b.dias ?? 9999));

  if ((data ?? []).length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
        Todavía no tienes ventas registradas. Cuando el administrador registre una
        venta a tu nombre, aparecerá aquí.
      </p>
    );
  }

  const porVencer = ventas.filter((v) => v.dias !== null && v.dias <= 5).length;
  const vencidas = ventas.filter((v) => v.dias !== null && v.dias < 0).length;

  const grupos: { titulo: string; items: typeof ventas }[] = [
    { titulo: "Vencidos", items: ventas.filter((v) => v.dias !== null && v.dias < 0) },
    { titulo: "Vencen hoy", items: ventas.filter((v) => v.dias === 0) },
    {
      titulo: "Próximos 5 días",
      items: ventas.filter((v) => v.dias !== null && v.dias > 0 && v.dias <= 5),
    },
    { titulo: "Más adelante", items: ventas.filter((v) => v.dias !== null && v.dias > 5) },
    { titulo: "Sin fecha", items: ventas.filter((v) => v.dias === null) },
  ];

  return (
    <div className="space-y-6">
      {/* Resumen */}
      <section className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
          <p className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Activos
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{ventas.length}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
          <p className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Por vencer
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-amber-600 dark:text-amber-400">
            {porVencer}
          </p>
        </div>
        <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
          <p className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Vencidos
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-red-600 dark:text-red-400">
            {vencidas}
          </p>
        </div>
      </section>

      {/* Búsqueda (vive en la URL) */}
      <form method="GET" className="flex gap-2">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Buscar por cliente o plataforma…"
          className="min-w-0 flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
        <button
          type="submit"
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-900"
        >
          Buscar
        </button>
        {busqueda && (
          <Link
            href="/dashboard"
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700"
          >
            Limpiar
          </Link>
        )}
      </form>

      {ventas.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
          Nada coincide con «{q}».
        </p>
      ) : (
        grupos
          .filter((g) => g.items.length > 0)
          .map((g) => (
            <section key={g.titulo} className="space-y-3">
              <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                {g.titulo} ({g.items.length})
              </h2>
              {g.items.map((v) => {
                const badge = v.dias === null ? null : badgeVencimiento(v.dias);
                const wa = v.cliente_whatsapp?.replace(/[^\d]/g, "");
                return (
                  <details
                    key={v.suscripcion_id}
                    className="rounded-xl border border-neutral-200 dark:border-neutral-800"
                  >
                    <summary className="cursor-pointer list-none p-4">
                      <span className="flex items-start justify-between gap-3">
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{v.cliente}</span>
                          <span className="block text-sm text-neutral-500 dark:text-neutral-400">
                            {v.plataforma} · {v.producto}
                            {v.estado !== "activa" ? ` · ${v.estado}` : ""}
                          </span>
                        </span>
                        {badge && (
                          <span
                            className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs ${
                              badge.color === "rojo"
                                ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                                : badge.color === "amarillo"
                                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                  : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            }`}
                          >
                            {badge.etiqueta}
                          </span>
                        )}
                      </span>
                    </summary>
                    <div className="space-y-4 border-t border-neutral-200 p-4 dark:border-neutral-800">
                      {wa && (
                        <a
                          href={`https://wa.me/${wa}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 px-3 py-1.5 text-sm text-emerald-700 transition active:scale-[0.98] dark:border-emerald-900 dark:text-emerald-400"
                        >
                          💬 Escribir por WhatsApp
                        </a>
                      )}
                      {/* Mismo paquete que le pasa a su cliente (verifica propiedad). */}
                      <BotonAcceso suscripcionId={v.suscripcion_id} />
                    </div>
                  </details>
                );
              })}
            </section>
          ))
      )}
    </div>
  );
}
