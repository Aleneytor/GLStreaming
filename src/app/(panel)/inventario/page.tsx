import { redirect } from "next/navigation";
import Link from "next/link";
import { obtenerUsuarioActual, esAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { uno } from "@/lib/supabase/util";

export const dynamic = "force-dynamic";

type Unidad = {
  id: string;
  numero_slot: number;
  nombre_visible: string | null;
  estado_operativo: string;
  estado_preparacion: string;
};

export default async function InventarioPage() {
  const usuario = await obtenerUsuarioActual();
  // El inventario es solo del administrador (el revendedor no ve stock, DEC-97).
  if (!esAdmin(usuario)) redirect("/dashboard");

  const supabase = await createClient();

  const { data: cuentas } = await supabase
    .from("cuentas")
    .select(
      `id, alias, capacidad, capacidad_vendible_habilitada, estado, created_at,
       productos_plataforma ( nombre, codigo, plataformas ( nombre ) ),
       unidades_inventario ( id, numero_slot, nombre_visible, estado_operativo, estado_preparacion )`,
    )
    .order("created_at", { ascending: false });

  const total = cuentas?.length ?? 0;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Inventario</h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            {total} {total === 1 ? "cuenta registrada" : "cuentas registradas"}
          </p>
        </div>
        <Link
          href="/inventario/nueva"
          className="shrink-0 rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition active:scale-[0.98] dark:bg-white dark:text-neutral-900"
        >
          + Nueva
        </Link>
      </div>

      {total === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
          Todavía no hay cuentas. Usa <strong>+ Nueva</strong> para cargar la primera.
        </p>
      ) : (
        <ul className="space-y-4">
          {cuentas?.map((c) => {
            const producto = uno(c.productos_plataforma);
            const plataforma = uno(producto?.plataformas);
            const unidades = ((c.unidades_inventario ?? []) as Unidad[]).sort(
              (a, b) => a.numero_slot - b.numero_slot,
            );

            return (
              <li
                key={c.id}
                className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800"
              >
                {/* Fila padre: la cuenta */}
                <div className="flex items-start justify-between gap-3 border-b border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900">
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {c.alias ?? producto?.nombre ?? "Cuenta"}
                    </p>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      {plataforma?.nombre} · {producto?.nombre}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm tabular-nums">
                      {c.capacidad_vendible_habilitada ?? c.capacidad}/{c.capacidad}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      vendible/física
                    </p>
                  </div>
                </div>

                {/* Filas hijas: las unidades */}
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
      )}
    </div>
  );
}
