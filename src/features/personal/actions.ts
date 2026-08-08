"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { obtenerUsuarioActual, esAdmin } from "@/lib/auth";

export type EstadoPersonal = { error?: string; ok?: string } | null;

const esquemaGastoPersonal = z.object({
  fecha_gasto: z.string().min(1, "Indica la fecha."),
  concepto: z.string().trim().min(1, "Escribe el concepto."),
  descripcion: z.string().trim().max(200).optional().or(z.literal("")),
  nota: z.string().trim().max(500).optional().or(z.literal("")),
  moneda_original: z.enum(["usd", "ves"]),
  monto_original: z.string().trim().min(1, "Indica el monto."),
  tasa_tipo: z.enum(["bcv", "paralela"]),
});

function numero(v: string) {
  return Number(v.trim().replace(",", "."));
}

function parsearFormulario(formData: FormData) {
  const parsed = esquemaGastoPersonal.safeParse({
    fecha_gasto: formData.get("fecha_gasto"),
    concepto: formData.get("concepto"),
    descripcion: formData.get("descripcion") ?? "",
    nota: formData.get("nota") ?? "",
    moneda_original: formData.get("moneda_original"),
    monto_original: formData.get("monto_original"),
    tasa_tipo: formData.get("tasa_tipo"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." } as const;
  }

  const monto = numero(parsed.data.monto_original);
  if (!Number.isFinite(monto) || monto <= 0) {
    return { error: "El monto debe ser mayor que cero." } as const;
  }

  return { data: parsed.data, monto } as const;
}

export async function registrarGastoPersonalAction(
  _prev: EstadoPersonal,
  formData: FormData,
): Promise<EstadoPersonal> {
  const usuario = await obtenerUsuarioActual();
  if (!esAdmin(usuario)) return { error: "No autorizado." };

  const parseado = parsearFormulario(formData);
  if ("error" in parseado) return { error: parseado.error };

  const supabase = await createClient();
  const { error } = await supabase.rpc("registrar_gasto_personal", {
    p_fecha_gasto: parseado.data.fecha_gasto,
    p_concepto: parseado.data.concepto,
    p_descripcion: parseado.data.descripcion || undefined,
    p_nota: parseado.data.nota || undefined,
    p_moneda_original: parseado.data.moneda_original,
    p_monto_original: parseado.monto,
    p_tasa_tipo: parseado.data.tasa_tipo,
  });

  if (error) return { error: error.message };

  revalidatePath("/personal");
  return { ok: "Gasto personal guardado." };
}

export async function editarGastoPersonalAction(
  _prev: EstadoPersonal,
  formData: FormData,
): Promise<EstadoPersonal> {
  const usuario = await obtenerUsuarioActual();
  if (!esAdmin(usuario)) return { error: "No autorizado." };

  const gastoId = String(formData.get("gasto_id") ?? "");
  if (!gastoId) return { error: "Falta el gasto." };

  const parseado = parsearFormulario(formData);
  if ("error" in parseado) return { error: parseado.error };

  const supabase = await createClient();
  const { error } = await supabase.rpc("editar_gasto_personal", {
    p_gasto_id: gastoId,
    p_fecha_gasto: parseado.data.fecha_gasto,
    p_concepto: parseado.data.concepto,
    p_descripcion: parseado.data.descripcion || undefined,
    p_nota: parseado.data.nota || undefined,
    p_moneda_original: parseado.data.moneda_original,
    p_monto_original: parseado.monto,
    p_tasa_tipo: parseado.data.tasa_tipo,
  });
  if (error) return { error: error.message };

  revalidatePath("/personal");
  return { ok: "Gasto personal actualizado." };
}

export async function archivarGastoPersonalAction(
  _prev: EstadoPersonal,
  formData: FormData,
): Promise<EstadoPersonal> {
  const usuario = await obtenerUsuarioActual();
  if (!esAdmin(usuario)) return { error: "No autorizado." };

  const gastoId = String(formData.get("gasto_id") ?? "");
  if (!gastoId) return { error: "Falta el gasto." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("archivar_gasto_personal", {
    p_gasto_id: gastoId,
  });
  if (error) return { error: error.message };

  revalidatePath("/personal");
  return { ok: "Gasto personal archivado." };
}

export async function eliminarGastoPersonalAction(
  _prev: EstadoPersonal,
  formData: FormData,
): Promise<EstadoPersonal> {
  const usuario = await obtenerUsuarioActual();
  if (!esAdmin(usuario)) return { error: "No autorizado." };

  const gastoId = String(formData.get("gasto_id") ?? "");
  if (!gastoId) return { error: "Falta el gasto." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("eliminar_gasto_personal", {
    p_gasto_id: gastoId,
  });
  if (error) return { error: error.message };

  revalidatePath("/personal");
  return { ok: "Gasto personal eliminado." };
}
