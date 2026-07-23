import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { obtenerUsuarioActual, esAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { uno } from "@/lib/supabase/util";
import { FormPerfiles, type PerfilEditable } from "@/features/inventario/form-perfiles";

export const dynamic = "force-dynamic";

export default async function PerfilesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const usuario = await obtenerUsuarioActual();
  if (!esAdmin(usuario)) redirect("/dashboard");

  const { id } = await params;
  const supabase = await createClient();

  const { data: cuenta } = await supabase
    .from("cuentas")
    .select(
      `id, alias,
       productos_plataforma ( nombre, plataformas ( nombre, slug ) ),
       unidades_inventario ( id, numero_slot, nombre_visible, secretos_unidad ( pin_cifrado ) )`,
    )
    .eq("id", id)
    .maybeSingle();

  if (!cuenta) notFound();

  const producto = uno(cuenta.productos_plataforma);
  const plataforma = uno(producto?.plataformas);

  const perfiles: PerfilEditable[] = (cuenta.unidades_inventario ?? [])
    .map((u) => {
      const secreto = uno(u.secretos_unidad);
      return {
        id: u.id,
        numero_slot: u.numero_slot,
        nombre_visible: u.nombre_visible,
        // Solo se indica SI existe; el valor nunca se manda al formulario.
        tiene_pin: Boolean(secreto?.pin_cifrado),
      };
    })
    .sort((a, b) => a.numero_slot - b.numero_slot);

  const volverA = plataforma?.slug ? `/inventario/${plataforma.slug}` : "/inventario";

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <Link
          href={volverA}
          className="text-sm text-neutral-500 transition hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
        >
          ← {plataforma?.nombre ?? "Inventario"}
        </Link>
        <h1 className="mt-2 text-xl font-semibold tracking-tight">
          Perfiles de {cuenta.alias ?? producto?.nombre}
        </h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          El nombre y el PIN son dos de los cuatro datos que recibe el cliente.
        </p>
      </div>

      {perfiles.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
          Esta cuenta es un recurso indivisible: no tiene perfiles.
        </p>
      ) : (
        <FormPerfiles cuentaId={cuenta.id} perfiles={perfiles} volverA={volverA} />
      )}
    </div>
  );
}
