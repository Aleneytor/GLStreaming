import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { obtenerUsuarioActual, esAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { uno } from "@/lib/supabase/util";
import { BotonCredenciales } from "@/features/inventario/credenciales";
import { avisoProveedor, diasParaRenovar } from "@/domain/fechas";

export const dynamic = "force-dynamic";

/** Fecha de hoy en la zona horaria del negocio (America/Caracas). */
function hoyCaracas(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Caracas",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

type Unidad = {
  id: string;
  numero_slot: number;
  nombre_visible: string | null;
  estado_operativo: string;
  estado_preparacion: string;
};

/** Cuentas de UNA plataforma, agrupadas por producto (ej. Netflix cuenta vs extra). */
export default async function PlataformaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const usuario = await obtenerUsuarioActual();
  if (!esAdmin(usuario)) redirect("/dashboard");

  const { slug } = await params;
  const supabase = await createClient();

  const { data: plataforma } = await supabase
    .from("plataformas")
    .select("id, nombre, slug")
    .eq("slug", slug)
    .maybeSingle();

  if (!plataforma) notFound();

  const hoy = hoyCaracas();

  const { data: cuentas } = await supabase
    .from("cuentas")
    .select(
      `id, alias, capacidad, capacidad_vendible_habilitada, estado, created_at, notas,
       productos_plataforma!inner ( id, nombre, codigo, plataforma_id ),
       proveedores ( nombre_o_alias ),
       ciclos_proveedor ( id, costo_usdt, proxima_renovacion, dia_ancla_proveedor, estado ),
       unidades_inventario ( id, numero_slot, nombre_visible, estado_operativo, estado_preparacion )`,
    )
    .eq("productos_plataforma.plataforma_id", plataforma.id)
    .order("created_at", { ascending: false });

  // Agrupar por producto para que "Netflix cuenta" y "Netflix extra" salgan separados.
  type CuentaFila = NonNullable<typeof cuentas>[number];
  const porProducto = new Map<string, { nombre: string; cuentas: CuentaFila[] }>();
  for (const c of cuentas ?? []) {
    const prod = uno(c.productos_plataforma);
    if (!prod) continue;
    const grupo = porProducto.get(prod.id) ?? {
      nombre: prod.nombre as string,
      cuentas: [] as CuentaFila[],
    };
    grupo.cuentas.push(c);
    porProducto.set(prod.id, grupo);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link
          href="/inventario"
          className="text-sm text-neutral-500 transition hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
        >
          ← Inventario
        </Link>
        <div className="mt-2 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{plataforma.nombre}</h1>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              {cuentas?.length ?? 0} {cuentas?.length === 1 ? "cuenta" : "cuentas"}
            </p>
          </div>
          <Link
            href={`/inventario/nueva?plataforma=${plataforma.slug}`}
            className="shrink-0 rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition active:scale-[0.98] dark:bg-white dark:text-neutral-900"
          >
            + Nueva
          </Link>
        </div>
      </div>

      {(cuentas?.length ?? 0) === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
          Todavía no hay cuentas de {plataforma.nombre}.
        </p>
      ) : (
        [...porProducto.entries()].map(([productoId, grupo]) => (
          <section key={productoId} className="space-y-3">
            <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              {grupo.nombre}
            </h2>

            <ul className="space-y-4">
              {grupo.cuentas.map((c) => {
                const proveedor = uno(c.proveedores);
                // Solo interesa el ciclo vigente (puede haber históricos).
                const ciclo =
                  (c.ciclos_proveedor ?? []).find((x) => x.estado === "vigente") ?? null;
                const aviso = ciclo?.proxima_renovacion
                  ? avisoProveedor(diasParaRenovar(ciclo.proxima_renovacion, hoy))
                  : null;
                const unidades = ((c.unidades_inventario ?? []) as Unidad[]).sort(
                  (a, b) => a.numero_slot - b.numero_slot,
                );

                return (
                  <li
                    key={c.id}
                    className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800"
                  >
                    <div className="flex items-start justify-between gap-3 border-b border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900">
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {c.alias ?? grupo.nombre}
                          {c.estado !== "activa" && (
                            <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                              {c.estado}
                            </span>
                          )}
                        </p>
                        <p className="text-sm tabular-nums text-neutral-500 dark:text-neutral-400">
                          {c.capacidad_vendible_habilitada ?? c.capacidad}/{c.capacidad}{" "}
                          vendible/física
                        </p>
                      </div>
                      <Link
                        href={`/inventario/cuenta/${c.id}/editar`}
                        className="shrink-0 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm transition active:scale-[0.98] dark:border-neutral-700"
                      >
                        Editar
                      </Link>
                    </div>

                    <div className="space-y-3 border-b border-neutral-200 p-4 dark:border-neutral-800">
                      {ciclo && (
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          <span className="tabular-nums">
                            {Number(ciclo.costo_usdt).toFixed(2)} USDT
                          </span>
                          <span className="text-neutral-400">·</span>
                          <span className="text-neutral-500 dark:text-neutral-400">
                            renueva {ciclo.proxima_renovacion}
                          </span>
                          {aviso && (
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-xs ${
                                aviso.nivel === "vencido"
                                  ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                                  : aviso.nivel === "hoy" || aviso.nivel === "proximo"
                                    ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                    : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              }`}
                            >
                              {aviso.etiqueta}
                            </span>
                          )}
                        </div>
                      )}
                      {(proveedor?.nombre_o_alias || c.notas) && (
                        <dl className="space-y-1 text-sm">
                          {proveedor?.nombre_o_alias && (
                            <div className="flex gap-2">
                              <dt className="text-neutral-500 dark:text-neutral-400">
                                Proveedor:
                              </dt>
                              <dd>{proveedor.nombre_o_alias}</dd>
                            </div>
                          )}
                          {c.notas && (
                            <div className="flex gap-2">
                              <dt className="shrink-0 text-neutral-500 dark:text-neutral-400">
                                Notas:
                              </dt>
                              <dd className="whitespace-pre-wrap">{c.notas}</dd>
                            </div>
                          )}
                        </dl>
                      )}
                      <BotonCredenciales cuentaId={c.id} />
                    </div>

                    {unidades.length > 0 ? (
                      <ul className="divide-y divide-neutral-100 dark:divide-neutral-900">
                        {unidades.map((u) => (
                          <li
                            key={u.id}
                            className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
                          >
                            <span className="flex min-w-0 items-center gap-2">
                              <span className="w-6 shrink-0 tabular-nums text-neutral-400">
                                {u.numero_slot}
                              </span>
                              <span className="truncate">{u.nombre_visible}</span>
                            </span>
                            <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              Disponible
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="px-4 py-3 text-sm text-neutral-500 dark:text-neutral-400">
                        Recurso indivisible (sin unidades hijas).
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
