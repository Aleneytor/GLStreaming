"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { obtenerUsuarioActual, esAdmin } from "@/lib/auth";

export type EstadoCierre = { error?: string; ok?: string } | null;

const mesValido = (v: unknown) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

export async function calcularCierreAction(
  _prev: EstadoCierre,
  formData: FormData,
): Promise<EstadoCierre> {
  const usuario = await obtenerUsuarioActual();
  if (!esAdmin(usuario)) return { error: "No autorizado." };

  const mes = formData.get("mes");
  if (!mesValido(mes)) return { error: "Mes inválido." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("calcular_cierre_mensual", { p_mes: mes as string });
  if (error) return { error: error.message };

  revalidatePath("/cierre");
  return { ok: "Resumen provisional guardado." };
}

export async function cerrarMesAction(
  _prev: EstadoCierre,
  formData: FormData,
): Promise<EstadoCierre> {
  const usuario = await obtenerUsuarioActual();
  if (!esAdmin(usuario)) return { error: "No autorizado." };

  const mes = formData.get("mes");
  if (!mesValido(mes)) return { error: "Mes inválido." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("cerrar_mes", { p_mes: mes as string });
  if (error) return { error: error.message };

  revalidatePath("/cierre");
  return { ok: "Mes confirmado como definitivo." };
}

export async function reabrirMesAction(
  _prev: EstadoCierre,
  formData: FormData,
): Promise<EstadoCierre> {
  const usuario = await obtenerUsuarioActual();
  if (!esAdmin(usuario)) return { error: "No autorizado." };

  const mes = formData.get("mes");
  const motivo = String(formData.get("motivo") ?? "").trim();
  if (!mesValido(mes)) return { error: "Mes inválido." };
  // La base también lo exige; aquí se avisa antes de ir al servidor.
  if (!motivo) return { error: "Escribe el motivo: queda en la auditoría." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("reabrir_mes", {
    p_mes: mes as string,
    p_motivo: motivo,
  });
  if (error) return { error: error.message };

  revalidatePath("/cierre");
  return { ok: "Versión corregida creada; la anterior se conservó." };
}
