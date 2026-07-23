import { redirect } from "next/navigation";
import { obtenerUsuarioActual, esAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function InventarioPage() {
  const usuario = await obtenerUsuarioActual();
  // El inventario es solo del administrador (el revendedor no ve stock, DEC-97).
  if (!esAdmin(usuario)) redirect("/dashboard");

  const supabase = await createClient();

  // Catálogo de productos con su capacidad configurada (aún sin cuentas reales).
  const { data: productos } = await supabase
    .from("productos_plataforma")
    .select(
      "id, nombre, codigo, capacidad_fija, capacidad_vendible_predeterminada, estado_comercial, tipo_inventario, plataformas(nombre)",
    )
    .order("codigo");

  const { count: totalCuentas } = await supabase
    .from("cuentas")
    .select("*", { count: "exact", head: true });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Inventario</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          {totalCuentas ?? 0} cuentas registradas · {productos?.length ?? 0} productos en
          catálogo
        </p>
      </div>

      {(totalCuentas ?? 0) === 0 && (
        <p className="rounded-xl border border-dashed border-neutral-300 p-4 text-sm text-neutral-600 dark:border-neutral-700 dark:text-neutral-400">
          Aún no hay cuentas cargadas. El asistente de alta manual llega en la siguiente
          entrega; por ahora se muestra el catálogo de productos disponible.
        </p>
      )}

      {/* Catálogo: tarjetas apiladas en móvil, tabla en escritorio */}
      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Catálogo de productos
        </h2>

        {/* Móvil */}
        <ul className="space-y-3 md:hidden">
          {productos?.map((p) => (
            <li
              key={p.id}
              className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{p.nombre}</p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    {/* @ts-expect-error relación anidada de Supabase */}
                    {p.plataformas?.nombre}
                  </p>
                </div>
                {p.estado_comercial !== "abierto" && (
                  <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                    {p.estado_comercial}
                  </span>
                )}
              </div>
              <dl className="mt-3 flex gap-4 text-sm">
                <div>
                  <dt className="text-xs text-neutral-500 dark:text-neutral-400">Capacidad</dt>
                  <dd className="tabular-nums">{p.capacidad_fija ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-neutral-500 dark:text-neutral-400">Vendible</dt>
                  <dd className="tabular-nums">
                    {p.capacidad_vendible_predeterminada ?? "—"}
                  </dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>

        {/* Escritorio */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left dark:border-neutral-800">
                <th className="py-2 pr-3 font-medium">Plataforma</th>
                <th className="py-2 pr-3 font-medium">Producto</th>
                <th className="py-2 pr-3 text-right font-medium">Capacidad</th>
                <th className="py-2 pr-3 text-right font-medium">Vendible</th>
                <th className="py-2 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {productos?.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-neutral-100 dark:border-neutral-900"
                >
                  {/* @ts-expect-error relación anidada de Supabase */}
                  <td className="py-2 pr-3">{p.plataformas?.nombre}</td>
                  <td className="py-2 pr-3">{p.nombre}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">
                    {p.capacidad_fija ?? "—"}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums">
                    {p.capacidad_vendible_predeterminada ?? "—"}
                  </td>
                  <td className="py-2 capitalize">{p.estado_comercial}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
