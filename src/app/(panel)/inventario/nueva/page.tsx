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

export default async function NuevaCuentaPage() {
  const usuario = await obtenerUsuarioActual();
  if (!esAdmin(usuario)) redirect("/dashboard");

  const supabase = await createClient();

  const [{ data: productos }, { data: proveedores }] = await Promise.all([
    supabase
      .from("productos_plataforma")
      .select(
        "id, nombre, codigo, regla_capacidad, capacidad_fija, capacidad_min, capacidad_max, tipo_inventario, titularidad_predeterminada, plataformas(nombre)",
      )
      .eq("activo", true)
      .order("codigo"),
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
    regla_capacidad: p.regla_capacidad,
    capacidad_fija: p.capacidad_fija,
    capacidad_min: p.capacidad_min,
    capacidad_max: p.capacidad_max,
    tipo_inventario: p.tipo_inventario,
    titularidad_predeterminada: p.titularidad_predeterminada,
  }));

  const opcionesProveedor: ProveedorOpcion[] = (proveedores ?? []).map((p) => ({
    id: p.id,
    etiqueta: p.nombre_o_alias ?? p.telefono_original ?? "(sin nombre)",
  }));

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <Link
          href="/inventario"
          className="text-sm text-neutral-500 transition hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
        >
          ← Inventario
        </Link>
        <h1 className="mt-2 text-xl font-semibold tracking-tight">Nueva cuenta</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          La cuenta, sus unidades y las credenciales se crean en una sola operación.
        </p>
      </div>

      <FormCuenta productos={opcionesProducto} proveedores={opcionesProveedor} />
    </div>
  );
}
