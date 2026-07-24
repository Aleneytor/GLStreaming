import { redirect } from "next/navigation";
import { obtenerUsuarioActual, esAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { uno } from "@/lib/supabase/util";
import { FormImportacion, type OpcionProducto } from "@/features/migracion/form-importacion";

export const dynamic = "force-dynamic";

export default async function MigracionPage() {
  const usuario = await obtenerUsuarioActual();
  if (!esAdmin(usuario)) redirect("/dashboard");

  const supabase = await createClient();

  // Productos que se cargan por perfil (alcance "unidad"): tanto los extras
  // (capacidad 1, cada uno con su correo) como los perfiles de una cuenta madre.
  const [{ data: productos }, { data: vendedores }] = await Promise.all([
    supabase
      .from("productos_plataforma")
      .select(
        `id, codigo, nombre, regla_capacidad, capacidad_fija, capacidad_min,
         plataformas ( nombre ),
         producto_modalidades ( modalidades ( id, nombre, alcance_asignacion ) )`,
      )
      .eq("estado_comercial", "abierto")
      .order("nombre"),
    supabase.from("vendedores").select("id, nombre").eq("activo", true).order("nombre"),
  ]);

  const opciones: OpcionProducto[] = (productos ?? [])
    .map((p) => {
      const plataforma = uno(p.plataformas);
      const modalidades = (p.producto_modalidades ?? [])
        .map((pm) => uno(pm.modalidades))
        .filter((m): m is NonNullable<typeof m> => Boolean(m))
        // La importación asigna cada fila a un perfil: solo modalidades de unidad.
        .filter((m) => m.alcance_asignacion === "unidad")
        .map((m) => ({ id: m.id, nombre: m.nombre }));

      const capacidad =
        p.regla_capacidad === "fija" ? (p.capacidad_fija ?? 1) : (p.capacidad_min ?? 1);

      return {
        id: p.id,
        codigo: p.codigo,
        etiqueta: `${plataforma?.nombre ?? ""} · ${p.nombre}`.trim(),
        capacidad,
        modalidades,
      };
    })
    // Sin una modalidad de unidad no se puede importar por perfil.
    .filter((o) => o.modalidades.length > 0)
    // Los más usados primero: Netflix arriba.
    .sort((a, b) => (a.codigo.startsWith("netflix") ? -1 : 0) - (b.codigo.startsWith("netflix") ? -1 : 0));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Importar cartera</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Para migrar tu Excel de golpe. Pega las filas, revisa cómo las entendió
          la app y confirma. Cada fila entra por su cuenta: una fila con error no
          tumba a las demás.
        </p>
      </div>

      {/* Pantalla pequeña: esto es tarea de escritorio (copiar/pegar del Excel). */}
      <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 md:hidden dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
        Esta pantalla está pensada para el computador: copiar y pegar desde el
        Excel es incómodo en el teléfono. Ábrela en la PC cuando puedas.
      </p>

      {opciones.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
          No hay productos con perfiles configurados todavía.
        </p>
      ) : (
        <FormImportacion productos={opciones} vendedores={vendedores ?? []} />
      )}
    </div>
  );
}
