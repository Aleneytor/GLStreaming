import { redirect } from "next/navigation";
import { obtenerUsuarioActual, esAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { uno } from "@/lib/supabase/util";
import { badgeVencimiento, diasParaRenovar } from "@/domain/fechas";
import { PanelSuscripcion } from "@/features/ventas/panel-suscripcion";
import { BotonLimpieza } from "@/features/ventas/boton-limpieza";

export const dynamic = "force-dynamic";

function hoyCaracas(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Caracas",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export default async function VencimientosPage() {
  const usuario = await obtenerUsuarioActual();
  if (!esAdmin(usuario)) redirect("/dashboard");

  const hoy = hoyCaracas();
  const supabase = await createClient();

  const { data: suscripciones } = await supabase
    .from("suscripciones")
    .select(
      `id, estado, recontactar_el, nota_renovacion,
       clientes ( nombre, whatsapp_original ),
       vendedores ( nombre ),
       productos_plataforma ( nombre, plataformas ( nombre ) ),
       periodos_servicio ( inicio, fecha_renovacion ),
       asignaciones_inventario ( unidad_id, fin, unidades_inventario ( nombre_visible ) )`,
    )
    .in("estado", ["activa", "pausada"]);

  // Tareas de saneamiento pendientes: perfiles que NO vuelven al stock hasta
  // confirmar que se limpiaron en la plataforma.
  const { data: limpiezas } = await supabase
    .from("operaciones_remotas")
    .select(
      `id, tipo, iniciada_at,
       cuentas ( alias, productos_plataforma ( nombre, plataformas ( nombre ) ) ),
       unidades_inventario ( nombre_visible, numero_slot )`,
    )
    .eq("estado", "pendiente");

  const filas = (suscripciones ?? [])
    .map((s) => {
      const periodos = s.periodos_servicio ?? [];
      const ultimo = [...periodos].sort((a, b) =>
        a.fecha_renovacion < b.fecha_renovacion ? 1 : -1,
      )[0];
      const dias = ultimo ? diasParaRenovar(ultimo.fecha_renovacion, hoy) : null;
      const asignacion = (s.asignaciones_inventario ?? []).find((a) => a.fin === null);
      return {
        id: s.id,
        estado: s.estado,
        recontactar_el: s.recontactar_el,
        nota: s.nota_renovacion,
        cliente: uno(s.clientes),
        vendedor: uno(s.vendedores)?.nombre ?? null,
        producto: uno(s.productos_plataforma),
        renovacion: ultimo?.fecha_renovacion ?? null,
        dias,
        perfil: uno(asignacion?.unidades_inventario)?.nombre_visible ?? null,
      };
    })
    .filter((f) => f.dias !== null)
    .sort((a, b) => (a.dias ?? 0) - (b.dias ?? 0));

  const vencidos = filas.filter((f) => (f.dias ?? 0) < 0);
  const hoyMismo = filas.filter((f) => f.dias === 0);
  const proximos = filas.filter((f) => (f.dias ?? 0) > 0 && (f.dias ?? 0) <= 5);
  const resto = filas.filter((f) => (f.dias ?? 0) > 5);

  const Grupo = ({
    titulo,
    items,
  }: {
    titulo: string;
    items: typeof filas;
  }) => {
    if (items.length === 0) return null;
    return (
      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          {titulo} ({items.length})
        </h2>
        {items.map((f) => {
          const badge = f.dias === null ? null : badgeVencimiento(f.dias);
          const plataforma = uno(f.producto?.plataformas);
          return (
            <details
              key={f.id}
              className="rounded-xl border border-neutral-200 dark:border-neutral-800"
            >
              <summary className="cursor-pointer list-none p-4">
                <span className="flex items-start justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">
                      {f.cliente?.nombre}
                    </span>
                    <span className="block text-sm text-neutral-500 dark:text-neutral-400">
                      {plataforma?.nombre} · {f.producto?.nombre}
                      {f.perfil ? ` · ${f.perfil}` : ""}
                      {f.vendedor ? ` · vendió ${f.vendedor}` : ""}
                    </span>
                    {f.recontactar_el && (
                      <span className="mt-1 block text-xs text-sky-700 dark:text-sky-400">
                        Recontactar el {f.recontactar_el}
                        {f.nota ? ` — ${f.nota}` : ""}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-right">
                    {badge && (
                      <span
                        className={`block rounded-full px-2.5 py-0.5 text-xs ${
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
                    {f.estado !== "activa" && (
                      <span className="mt-1 block text-xs capitalize text-neutral-500 dark:text-neutral-400">
                        {f.estado}
                      </span>
                    )}
                  </span>
                </span>
              </summary>
              <div className="border-t border-neutral-200 p-4 dark:border-neutral-800">
                <PanelSuscripcion
                  suscripcionId={f.id}
                  estado={f.estado}
                  proximaRenovacion={f.renovacion}
                  recontactarEl={f.recontactar_el}
                  nota={f.nota}
                />
              </div>
            </details>
          );
        })}
      </section>
    );
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Vencimientos</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Vencer no corta ni libera nada: tú decides qué hacer con cada cliente.
        </p>
      </div>

      {(limpiezas?.length ?? 0) > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium uppercase tracking-wide text-amber-700 dark:text-amber-400">
            Pendientes de limpieza ({limpiezas?.length})
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Estos perfiles no vuelven al stock hasta que confirmes que los borraste
            en la plataforma.
          </p>
          {limpiezas?.map((o) => {
            const cuenta = uno(o.cuentas);
            const prod = uno(cuenta?.productos_plataforma);
            const unidad = uno(o.unidades_inventario);
            return (
              <div
                key={o.id}
                className="space-y-2 rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30"
              >
                <p className="text-sm">
                  <strong>{uno(prod?.plataformas)?.nombre}</strong> ·{" "}
                  {cuenta?.alias ?? prod?.nombre}
                  {unidad ? ` · ${unidad.nombre_visible ?? `Perfil ${unidad.numero_slot}`}` : ""}
                </p>
                <BotonLimpieza operacionId={o.id} />
              </div>
            );
          })}
        </section>
      )}

      {filas.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
          No hay suscripciones activas todavía.
        </p>
      ) : (
        <>
          <Grupo titulo="Vencidos" items={vencidos} />
          <Grupo titulo="Renuevan hoy" items={hoyMismo} />
          <Grupo titulo="Próximos 5 días" items={proximos} />
          <Grupo titulo="Más adelante" items={resto} />
        </>
      )}
    </div>
  );
}
