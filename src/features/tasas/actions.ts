"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { obtenerUsuarioActual, esAdmin } from "@/lib/auth";
import { obtenerBcv, obtenerParalela } from "@/server/tasas/adaptadores";

export type TasaVigente = {
  id: string;
  tipo: "bcv" | "paralela";
  bs_por_usd: number;
  fecha_vigencia: string | null;
  observada_fuente_at: string | null;
  obtenida_at: string;
  /** Última comprobación de que sigue siendo la más reciente de la fuente. */
  revalidada_at: string | null;
  fuente: string | null;
};

/** Última tasa registrada de cada tipo. */
export async function obtenerTasasVigentes(): Promise<{
  bcv: TasaVigente | null;
  paralela: TasaVigente | null;
}> {
  const supabase = await createClient();

  const [bcv, paralela] = await Promise.all([
    supabase
      .from("tasas_cambio")
      .select(
        "id, tipo, bs_por_usd, fecha_vigencia, observada_fuente_at, obtenida_at, revalidada_at, fuente",
      )
      .eq("tipo", "bcv")
      .eq("estado", "vigente")
      .order("obtenida_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("tasas_cambio")
      .select(
        "id, tipo, bs_por_usd, fecha_vigencia, observada_fuente_at, obtenida_at, revalidada_at, fuente",
      )
      .eq("tipo", "paralela")
      .eq("estado", "vigente")
      .order("obtenida_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const mapear = (d: unknown): TasaVigente | null => {
    if (!d) return null;
    const r = d as Record<string, unknown>;
    return {
      id: r.id as string,
      tipo: r.tipo as "bcv" | "paralela",
      bs_por_usd: Number(r.bs_por_usd),
      fecha_vigencia: (r.fecha_vigencia as string) ?? null,
      observada_fuente_at: (r.observada_fuente_at as string) ?? null,
      obtenida_at: r.obtenida_at as string,
      revalidada_at: (r.revalidada_at as string) ?? null,
      fuente: (r.fuente as string) ?? null,
    };
  };

  return { bcv: mapear(bcv.data), paralela: mapear(paralela.data) };
}

export type EstadoRefresco = { error?: string; ok?: string } | null;

/**
 * Consulta las dos fuentes y guarda las observaciones nuevas.
 *
 * Guardado IDEMPOTENTE: si la fuente devuelve la misma observación que ya
 * teníamos (mismo `fuente_registro_id`), no se duplica. Y si una fuente falla o
 * entrega un dato inválido, se conserva la última tasa buena: nunca se inventa.
 */
export async function refrescarTasasAction(
  _prev: EstadoRefresco,
  _formData: FormData,
): Promise<EstadoRefresco> {
  const usuario = await obtenerUsuarioActual();
  if (!esAdmin(usuario)) return { error: "No autorizado." };

  const supabase = await createClient();
  const vigentes = await obtenerTasasVigentes();

  const resultados = await Promise.all([
    obtenerBcv(vigentes.bcv?.bs_por_usd ?? null),
    obtenerParalela(vigentes.paralela?.bs_por_usd ?? null),
  ]);

  const mensajes: string[] = [];
  const errores: string[] = [];

  for (const r of resultados) {
    if (!r.ok) {
      errores.push(r.error);
      continue;
    }
    const o = r.observacion;

    // Idempotencia: la misma observación no se guarda dos veces.
    if (o.fuente_registro_id) {
      const { data: existente } = await supabase
        .from("tasas_cambio")
        .select("id")
        .eq("tipo", o.tipo)
        .eq("fuente_registro_id", o.fuente_registro_id)
        .maybeSingle();

      if (existente) {
        // La fuente no publicó nada nuevo (fin de semana, feriado, BCV aún sin
        // salir). No se duplica la fila, pero sí se deja constancia de que se
        // comprobó: si no, un cobro válido con la tasa del viernes quedaría
        // bloqueado el lunes por "tasa rancia".
        await supabase
          .from("tasas_cambio")
          .update({ revalidada_at: new Date().toISOString() })
          .eq("id", (existente as { id: string }).id);

        mensajes.push(`${o.tipo}: sin cambios`);
        continue;
      }
    }

    const { error } = await supabase.from("tasas_cambio").insert({
      tipo: o.tipo,
      bs_por_usd: o.bs_por_usd,
      fecha_vigencia: o.fecha_vigencia,
      fuente: o.simulada ? "simulada" : o.fuente,
      fuente_registro_id: o.fuente_registro_id,
      observada_fuente_at: o.observada_fuente_at,
      detalle_fuentes: o.detalle_fuentes ?? null,
      revalidada_at: new Date().toISOString(),
      estado: "vigente",
    });

    if (error) errores.push(`${o.tipo}: ${error.message}`);
    else mensajes.push(`${o.tipo}: ${o.bs_por_usd}${o.simulada ? " (simulada)" : ""}`);
  }

  revalidatePath("/tasas");

  if (errores.length > 0) {
    return { error: `${errores.join(" · ")}${mensajes.length ? ` — ${mensajes.join(" · ")}` : ""}` };
  }
  return { ok: mensajes.join(" · ") };
}
