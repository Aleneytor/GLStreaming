import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { obtenerUsuarioActual, esAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { uno } from "@/lib/supabase/util";
import { FormVenta } from "@/features/ventas/form-venta";

export const dynamic = "force-dynamic";

export default async function NuevaVentaPage({
  searchParams,
}: {
  searchParams: Promise<{ cuenta?: string; unidad?: string }>;
}) {
  const usuario = await obtenerUsuarioActual();
  if (!esAdmin(usuario)) redirect("/dashboard");

  const { cuenta: cuentaId, unidad: unidadId } = await searchParams;
  if (!cuentaId) notFound();

  const supabase = await createClient();

  const { data: cuenta } = await supabase
    .from("cuentas")
    .select(
      `id, alias,
       productos_plataforma ( id, nombre, plataformas ( nombre, slug ) )`,
    )
    .eq("id", cuentaId)
    .maybeSingle();

  if (!cuenta) notFound();

  const producto = uno(cuenta.productos_plataforma);
  const plataforma = uno(producto?.plataformas);

  // Solo las modalidades permitidas para este producto, y del alcance correcto:
  // vender un perfil concreto no puede hacerse con la modalidad "cuenta completa".
  const { data: permitidas } = await supabase
    .from("producto_modalidades")
    .select("modalidades ( id, nombre, alcance_asignacion )")
    .eq("producto_plataforma_id", producto?.id ?? "")
    .eq("activa", true);

  const alcanceBuscado = unidadId ? "unidad" : "cuenta";
  const modalidades = (permitidas ?? [])
    .map((p) => uno(p.modalidades))
    .filter((m): m is NonNullable<typeof m> => Boolean(m))
    .filter((m) => m.alcance_asignacion === alcanceBuscado)
    .map((m) => ({ id: m.id, nombre: m.nombre }));

  const { data: clientes } = await supabase
    .from("clientes")
    .select("id, nombre")
    .is("archived_at", null)
    .order("nombre");

  let etiquetaUnidad = "cuenta completa";
  if (unidadId) {
    const { data: u } = await supabase
      .from("unidades_inventario")
      .select("numero_slot, nombre_visible")
      .eq("id", unidadId)
      .maybeSingle();
    etiquetaUnidad = u ? (u.nombre_visible ?? `Perfil ${u.numero_slot}`) : "perfil";
  }

  const volverA = plataforma?.slug ? `/inventario/${plataforma.slug}` : "/inventario";
  const etiqueta = `${plataforma?.nombre} · ${cuenta.alias ?? producto?.nombre} · ${etiquetaUnidad}`;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <Link
          href={volverA}
          className="text-sm text-neutral-500 transition hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
        >
          ← {plataforma?.nombre ?? "Inventario"}
        </Link>
        <h1 className="mt-2 text-xl font-semibold tracking-tight">Nueva venta</h1>
      </div>

      {modalidades.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
          Este producto no tiene modalidades activas para ese alcance.
        </p>
      ) : (
        <FormVenta
          cuentaId={cuenta.id}
          unidadId={unidadId ?? null}
          etiquetaRecurso={etiqueta}
          modalidades={modalidades}
          clientes={clientes ?? []}
          volverA={volverA}
        />
      )}
    </div>
  );
}
