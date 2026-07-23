import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { obtenerUsuarioActual, esAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { uno } from "@/lib/supabase/util";
import { FormEditarCuenta } from "@/features/inventario/form-editar-cuenta";
import type { ProveedorOpcion } from "@/features/inventario/form-cuenta";

export const dynamic = "force-dynamic";

export default async function EditarCuentaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const usuario = await obtenerUsuarioActual();
  if (!esAdmin(usuario)) redirect("/dashboard");

  const { id } = await params;
  const supabase = await createClient();

  const [{ data: cuenta }, { data: proveedores }] = await Promise.all([
    supabase
      .from("cuentas")
      .select(
        `id, alias, notas, estado, capacidad,
         productos_plataforma ( nombre, plataformas ( nombre ) ),
         proveedores ( nombre_o_alias )`,
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("proveedores")
      .select("id, nombre_o_alias, telefono_original")
      .eq("activo", true),
  ]);

  if (!cuenta) notFound();

  const producto = uno(cuenta.productos_plataforma);
  const plataforma = uno(producto?.plataformas);
  const proveedor = uno(cuenta.proveedores);

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
        <h1 className="mt-2 text-xl font-semibold tracking-tight">Editar cuenta</h1>
      </div>

      <FormEditarCuenta
        cuenta={{
          id: cuenta.id,
          alias: cuenta.alias,
          notas: cuenta.notas,
          estado: cuenta.estado,
          capacidad: cuenta.capacidad,
          proveedor: proveedor?.nombre_o_alias ?? null,
          producto: producto?.nombre ?? "",
          plataforma: plataforma?.nombre ?? "",
        }}
        proveedores={opcionesProveedor}
      />
    </div>
  );
}
