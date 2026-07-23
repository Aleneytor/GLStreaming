import { redirect } from "next/navigation";
import Link from "next/link";
import { obtenerUsuarioActual, esAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Entrada del inventario: una plataforma por fila.
 * Entrar en una muestra solo sus cuentas (Netflix estándar y extra juntas,
 * Disney+ aparte, etc.), en vez de mezclarlo todo en una sola lista.
 */
export default async function InventarioPage() {
  const usuario = await obtenerUsuarioActual();
  if (!esAdmin(usuario)) redirect("/dashboard");

  const supabase = await createClient();

  const [{ data: plataformas }, { data: cuentas }] = await Promise.all([
    supabase.from("plataformas").select("id, nombre, slug").eq("activa", true),
    supabase
      .from("cuentas")
      .select(
        `id, productos_plataforma!inner ( plataforma_id ),
         unidades_inventario ( id ),
         asignaciones_inventario ( fin )`,
      )
      .neq("estado", "archivada"),
  ]);

  // Conteo por plataforma (pocos registros: se agrupa en memoria).
  const resumen = new Map<
    string,
    { cuentas: number; unidades: number; ventas: number }
  >();
  for (const c of cuentas ?? []) {
    const rel = c.productos_plataforma as unknown as { plataforma_id: string };
    const previo = resumen.get(rel.plataforma_id) ?? {
      cuentas: 0,
      unidades: 0,
      ventas: 0,
    };
    resumen.set(rel.plataforma_id, {
      cuentas: previo.cuentas + 1,
      unidades: previo.unidades + (c.unidades_inventario?.length ?? 0),
      // Asignaciones abiertas = clientes activos ahora mismo.
      ventas:
        previo.ventas +
        (c.asignaciones_inventario ?? []).filter((a) => a.fin === null).length,
    });
  }

  // Se ordena por USO, no alfabéticamente: lo que más se vende va arriba.
  // Las plataformas sin actividad quedan al final, ahí sí por nombre.
  const ordenadas = [...(plataformas ?? [])].sort((a, b) => {
    const ra = resumen.get(a.id) ?? { cuentas: 0, unidades: 0, ventas: 0 };
    const rb = resumen.get(b.id) ?? { cuentas: 0, unidades: 0, ventas: 0 };
    if (rb.ventas !== ra.ventas) return rb.ventas - ra.ventas;
    if (rb.cuentas !== ra.cuentas) return rb.cuentas - ra.cuentas;
    return a.nombre.localeCompare(b.nombre, "es");
  });

  const totalCuentas = cuentas?.length ?? 0;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Inventario</h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            {totalCuentas} {totalCuentas === 1 ? "cuenta" : "cuentas"} en total
          </p>
        </div>
        <Link
          href="/inventario/nueva"
          className="shrink-0 rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition active:scale-[0.98] dark:bg-white dark:text-neutral-900"
        >
          + Nueva
        </Link>
      </div>

      <ul className="space-y-2">
        {ordenadas.map((p) => {
          const r = resumen.get(p.id) ?? { cuentas: 0, unidades: 0, ventas: 0 };
          const vacia = r.cuentas === 0;
          const libres = Math.max(r.unidades - r.ventas, 0);
          return (
            <li key={p.id}>
              <Link
                href={`/inventario/${p.slug}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 p-4 transition active:scale-[0.99] hover:border-neutral-400 dark:border-neutral-800 dark:hover:border-neutral-600"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{p.nombre}</span>
                  <span
                    className={`block text-sm ${
                      vacia
                        ? "text-neutral-400 dark:text-neutral-500"
                        : "text-neutral-500 dark:text-neutral-400"
                    }`}
                  >
                    {vacia
                      ? "Sin cuentas todavía"
                      : `${r.ventas} ${r.ventas === 1 ? "vendido" : "vendidos"} · ${libres} ${
                          libres === 1 ? "libre" : "libres"
                        } · ${r.cuentas} ${r.cuentas === 1 ? "cuenta" : "cuentas"}`}
                  </span>
                </span>
                <span aria-hidden className="shrink-0 text-neutral-400">
                  ›
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
