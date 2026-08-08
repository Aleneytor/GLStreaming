import { redirect } from "next/navigation";
import Link from "next/link";
import { obtenerUsuarioActual, esAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { uno } from "@/lib/supabase/util";
import {
  FormCuenta,
  type ProductoOpcion,
  type ProveedorOpcion,
} from "@/features/inventario/form-cuenta";

export const dynamic = "force-dynamic";

export default async function NuevaCuentaPage({
  searchParams,
}: {
  searchParams: Promise<{ plataforma?: string }>;
}) {
  const usuario = await obtenerUsuarioActual();
  if (!esAdmin(usuario)) redirect("/dashboard");

  const { plataforma: slugPlataforma } = await searchParams;
  const supabase = await createClient();

  // Si se entró desde una plataforma, solo se ofrecen sus productos.
  // Los productos con titularidad del cliente (p. ej. YouTube) no se pueden
  // "crear" aquí: su cuenta pertenece al cliente, no al negocio.
  let consultaProductos = supabase
    .from("productos_plataforma")
    .select(
      "id, nombre, codigo, regla_capacidad, capacidad_fija, capacidad_min, capacidad_max, tipo_inventario, tipo_unidad_fisica, titularidad_predeterminada, plataformas!inner(nombre, slug)",
    )
    .eq("activo", true)
    .neq("titularidad_predeterminada", "cliente");

  if (slugPlataforma) {
    consultaProductos = consultaProductos.eq("plataformas.slug", slugPlataforma);
  }

  const [{ data: productos }, { data: proveedores }] = await Promise.all([
    consultaProductos.order("codigo"),
    supabase
      .from("proveedores")
      .select("id, nombre_o_alias, telefono_original, tipo")
      .eq("activo", true),
  ]);

  const opcionesProducto: ProductoOpcion[] = (productos ?? []).map((p) => ({
    id: p.id,
    nombre: p.nombre,
    codigo: p.codigo,
    plataforma: uno(p.plataformas)?.nombre ?? "",
    plataformaSlug: uno(p.plataformas)?.slug ?? "",
    regla_capacidad: p.regla_capacidad,
    capacidad_fija: p.capacidad_fija,
    capacidad_min: p.capacidad_min,
    capacidad_max: p.capacidad_max,
    tipo_inventario: p.tipo_inventario,
    tipo_unidad_fisica: p.tipo_unidad_fisica,
    titularidad_predeterminada: p.titularidad_predeterminada,
  }));

  const opcionesProveedor: ProveedorOpcion[] = (proveedores ?? []).map((p) => ({
    id: p.id,
    etiqueta: p.nombre_o_alias ?? p.telefono_original ?? "(sin nombre)",
  }));

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-12">
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center gap-2">
          <Link
            href={slugPlataforma ? `/inventario/${slugPlataforma}` : "/inventario"}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-xs font-medium text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-900 dark:border-neutral-800 dark:bg-neutral-800/60 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>{opcionesProducto[0]?.plataforma ?? "Inventario"}</span>
          </Link>
          <span className="text-xs text-neutral-400 dark:text-neutral-600">/</span>
          <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Alta de servicio</span>
        </div>

        <div className="mt-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-700 dark:text-blue-400">Alta de cuenta</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white">
            Nueva cuenta
          </h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Registra la cuenta, sus unidades operativas y credenciales cifradas en un solo paso.
          </p>
        </div>
      </div>

      <FormCuenta productos={opcionesProducto} proveedores={opcionesProveedor} />
    </div>
  );
}
