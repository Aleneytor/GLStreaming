import { redirect } from "next/navigation";
import { obtenerUsuarioActual, esAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { uno } from "@/lib/supabase/util";
import { FormImportacion, type OpcionProducto } from "@/features/migracion/form-importacion";
import { obtenerTasasVigentes } from "@/features/tasas/actions";
import { confirmadaAt, evaluarFrescura } from "@/domain/tasas";

export const dynamic = "force-dynamic";

export default async function MigracionPage() {
  const usuario = await obtenerUsuarioActual();
  if (!esAdmin(usuario)) redirect("/dashboard");

  const supabase = await createClient();

  // Productos que se cargan por perfil (alcance "unidad"): tanto los extras
  // (capacidad 1, cada uno con su correo) como los perfiles de una cuenta madre.
  const [{ data: productos }, { data: vendedores }, { bcv, paralela }] = await Promise.all([
    supabase
      .from("productos_plataforma")
      .select(
        `id, codigo, nombre, regla_capacidad, capacidad_fija, capacidad_min,
         plataformas ( nombre ),
         producto_modalidades ( modalidades ( id, nombre, alcance_asignacion ) )`,
      )
      .eq("estado_comercial", "abierto")
      .order("nombre"),
    supabase
      .from("vendedores")
      .select("nombre, alias, tipo, cobra_en_paralela")
      .order("nombre"),
    obtenerTasasVigentes(),
  ]);

  const bcvUsable =
    bcv && evaluarFrescura(confirmadaAt(bcv)).nivel !== "inservible" ? bcv.bs_por_usd : null;
  const paralelaUsable =
    paralela && evaluarFrescura(confirmadaAt(paralela)).nivel !== "inservible"
      ? paralela.bs_por_usd
      : null;

  const opciones: OpcionProducto[] = (productos ?? [])
    .map((p) => {
      const plataforma = uno(p.plataformas);
      const modalidades = (p.producto_modalidades ?? [])
        .map((pm) => uno(pm.modalidades))
        .filter((m): m is NonNullable<typeof m> => Boolean(m))
        // Se importan las dos formas: por perfil (unidad) y cuenta completa.
        .filter((m) => m.alcance_asignacion === "unidad" || m.alcance_asignacion === "cuenta")
        // Perfil individual primero (es lo más común al migrar).
        .sort((a, b) => (a.alcance_asignacion === "unidad" ? -1 : 1))
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
    <div className="mx-auto max-w-6xl space-y-5 pb-24">
      <header className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs sm:p-7 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-700 dark:text-blue-400">
            Carga inicial desde Excel
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white sm:text-3xl">Importar cartera</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500 dark:text-neutral-400">
            Configura el destino, pega las filas y revisa exactamente qué va a guardarse.
            Una fila con error no detiene las demás.
          </p>
          <div className="mt-5 flex flex-wrap gap-2 text-xs">
            {[
              "1 · Configurar",
              "2 · Pegar Excel",
              "3 · Revisar",
              "4 · Importar",
            ].map((paso, i) => (
              <span
                key={paso}
                className={`rounded-full px-3 py-1.5 ${
                  i === 0
                    ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-950"
                    : "bg-white/80 text-neutral-600 ring-1 ring-neutral-200 dark:bg-neutral-900/80 dark:text-neutral-300 dark:ring-neutral-800"
                }`}
              >
                {paso}
              </span>
            ))}
          </div>
        </div>
      </header>

      {opciones.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-neutral-300 p-10 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
          No hay productos con perfiles configurados todavía.
        </p>
      ) : (
        <FormImportacion
          productos={opciones}
          vendedoresExistentes={(vendedores ?? []).map((v) => ({
            nombre: v.nombre,
            alias: v.alias,
            tipo: v.tipo as "revendedor" | "intermediario",
            cobraEnParalela: v.cobra_en_paralela,
          }))}
          bcv={bcvUsable}
          paralela={paralelaUsable}
        />
      )}
    </div>
  );
}
