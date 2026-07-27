"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { obtenerUsuarioActual, esAdmin } from "@/lib/auth";

/**
 * Cobros del cliente en bolívares.
 *
 * Toda la regla dura vive en `registrar_cobro_cliente` (migración 0016): es la
 * base de datos la que congela las tasas y rechaza abonos, para que el hecho
 * financiero no dependa de que la UI se comporte bien.
 */

export type EstadoCobro = { error?: string; ok?: string } | null;

const esquemaCobro = z.object({
  periodo_id: z.string().uuid(),
  monto: z.string().trim().min(1, "Indica cuánto recibiste."),
  moneda: z.enum(["ves", "usd"]).default("ves"),
  referencia: z.string().trim().max(120).optional().or(z.literal("")),
  volver_a: z.string().default("/cobros"),
});

export async function cobrarAction(
  _prev: EstadoCobro,
  formData: FormData,
): Promise<EstadoCobro> {
  const usuario = await obtenerUsuarioActual();
  if (!esAdmin(usuario)) return { error: "No autorizado." };

  const parsed = esquemaCobro.safeParse({
    periodo_id: formData.get("periodo_id"),
    // Se acepta el campo nuevo `monto` y el antiguo `monto_ves` por si acaso.
    monto: formData.get("monto") ?? formData.get("monto_ves"),
    moneda: formData.get("moneda") ?? "ves",
    referencia: formData.get("referencia") ?? "",
    volver_a: formData.get("volver_a") ?? "/cobros",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  // Se aceptan "2.500,00" y "2500.00": la gente escribe de las dos formas.
  const monto = Number(parsed.data.monto.replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(monto) || monto <= 0) {
    return { error: "El monto debe ser un número mayor que cero." };
  }
  const enDolares = parsed.data.moneda === "usd";

  const supabase = await createClient();
  const { error } = await supabase.rpc("registrar_cobro_cliente", {
    p_periodo_id: parsed.data.periodo_id,
    p_monto_ves: enDolares ? undefined : monto,
    p_monto_usd: enDolares ? monto : undefined,
    p_referencia: parsed.data.referencia || undefined,
  });

  if (error) return { error: error.message };

  revalidatePath(parsed.data.volver_a);
  revalidatePath("/caja");
  return { ok: "Cobro registrado." };
}

const esquemaReverso = z.object({
  pago_id: z.string().uuid(),
  motivo: z.string().trim().max(200).optional().or(z.literal("")),
  volver_a: z.string().default("/caja"),
});

export async function revertirCobroAction(
  _prev: EstadoCobro,
  formData: FormData,
): Promise<EstadoCobro> {
  const usuario = await obtenerUsuarioActual();
  if (!esAdmin(usuario)) return { error: "No autorizado." };

  const parsed = esquemaReverso.safeParse({
    pago_id: formData.get("pago_id"),
    motivo: formData.get("motivo") ?? "",
    volver_a: formData.get("volver_a") ?? "/caja",
  });
  if (!parsed.success) return { error: "Datos inválidos." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("revertir_cobro_cliente", {
    p_pago_id: parsed.data.pago_id,
    p_motivo: parsed.data.motivo || undefined,
  });

  if (error) return { error: error.message };

  revalidatePath(parsed.data.volver_a);
  revalidatePath("/cobros");
  return { ok: "Reverso registrado." };
}
