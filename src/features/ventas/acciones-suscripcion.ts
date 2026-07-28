"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { obtenerUsuarioActual, esAdmin } from "@/lib/auth";
import { parsearMontoFormulario } from "@/domain/dinero";

export type EstadoAccion = { error?: string; ok?: string } | null;

async function guard() {
  const usuario = await obtenerUsuarioActual();
  if (!esAdmin(usuario)) return null;
  return usuario;
}

function refrescar() {
  revalidatePath("/inventario");
  revalidatePath("/vencimientos");
  revalidatePath("/dashboard");
  revalidatePath("/clientes");
}

const esquemaRenovar = z.object({
  suscripcion_id: z.string().uuid(),
  inicio: z.string().min(1, "Indica la fecha de inicio."),
  meses: z.coerce.number().int().min(1).max(12).default(1),
  monto: z.string().trim().optional().or(z.literal("")),
  moneda: z.enum(["ves", "usd"]).default("ves"),
  tardia: z.string().optional(),
  vendedor_id: z.string().uuid().nullable().optional(),
  actualizar_vendedor: z.string().optional(),
});

/**
 * Renueva Y cobra en una sola operación.
 *
 * Antes eran dos pasos en dos pantallas (renovar aquí, cobrar en `/cobros`), lo
 * que permitía registrar el mismo ingreso dos veces o dejar renovaciones sin
 * cobro por olvido. Ahora la base lo hace en una transacción: o quedan las dos
 * cosas, o ninguna.
 *
 * El monto es opcional a propósito: hay renovaciones legítimas sin ingreso
 * todavía (el cliente paga después). Esas quedan listadas en «Por cobrar».
 *
 * La "renovación tardía" existe porque el cliente pudo pagar días después: en
 * ese caso el período nuevo arranca en la fecha real del pago.
 */
export async function renovarAction(
  _prev: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  if (!(await guard())) return { error: "No autorizado." };

  const parsed = esquemaRenovar.safeParse({
    suscripcion_id: formData.get("suscripcion_id"),
    inicio: formData.get("inicio"),
    meses: formData.get("meses") ?? 1,
    monto: formData.get("monto") ?? formData.get("monto_ves") ?? "",
    moneda: formData.get("moneda") ?? "ves",
    tardia: formData.get("tardia") ?? undefined,
    vendedor_id: String(formData.get("vendedor_id") ?? "").trim() || null,
    actualizar_vendedor: formData.get("actualizar_vendedor") ?? undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]!.message };

  let monto: number | null = null;
  if (parsed.data.monto) {
    // El usuario escribe "2.500,00" o "2500.00": ambas formas valen.
    monto = parsearMontoFormulario(parsed.data.monto);
    if (!Number.isFinite(monto) || monto <= 0) {
      return { error: "El monto debe ser un número mayor que cero." };
    }
  }
  const enDolares = parsed.data.moneda === "usd";

  const supabase = await createClient();
  const { error } = await supabase.rpc("renovar_y_cobrar", {
    p_suscripcion_id: parsed.data.suscripcion_id,
    p_inicio: parsed.data.inicio,
    p_meses: parsed.data.meses,
    p_monto_ves: enDolares ? undefined : monto ?? undefined,
    p_monto_usd: enDolares ? monto ?? undefined : undefined,
    p_tardia: parsed.data.tardia === "on",
    p_vendedor_id: parsed.data.vendedor_id,
    p_actualizar_vendedor: parsed.data.actualizar_vendedor === "on",
  });
  if (error) return { error: error.message };

  refrescar();
  revalidatePath("/caja");
  revalidatePath("/cobros");
  return {
    ok: monto ? "Renovación y cobro registrados." : "Renovación registrada (sin cobro).",
  };
}

export async function cambiarEstadoAction(
  _prev: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  if (!(await guard())) return { error: "No autorizado." };

  const id = String(formData.get("suscripcion_id") ?? "");
  const estado = String(formData.get("estado") ?? "");
  if (!id || !["activa", "pausada"].includes(estado)) {
    return { error: "Datos inválidos." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("cambiar_estado_suscripcion", {
    p_suscripcion_id: id,
    p_nuevo_estado: estado,
    p_motivo: String(formData.get("motivo") ?? "") || null,
  });
  if (error) return { error: error.message };

  refrescar();
  return { ok: estado === "pausada" ? "Servicio pausado." : "Servicio reactivado." };
}

/** Cancela y deja el recurso en saneamiento (paso 1 de 2). */
export async function cancelarAction(
  _prev: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  const usuario = await guard();
  if (!usuario) return { error: "No autorizado." };

  const id = String(formData.get("suscripcion_id") ?? "");
  if (!id) return { error: "Falta la suscripción." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("cancelar_y_liberar", {
    p_suscripcion_id: id,
    p_motivo: String(formData.get("motivo") ?? "no_renovacion"),
  });
  if (error) return { error: error.message };

  await supabase.from("eventos_auditoria").insert({
    actor_id: usuario.id,
    accion: "cancelar_y_liberar",
    entidad: "suscripciones",
    entidad_id: id,
    resultado: "ok",
  });

  refrescar();
  return { ok: "Servicio cancelado. Falta confirmar el retiro en la plataforma." };
}

/** Confirma la limpieza remota: el perfil vuelve al stock (paso 2 de 2). */
export async function confirmarLimpiezaAction(
  _prev: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  const usuario = await guard();
  if (!usuario) return { error: "No autorizado." };

  const id = String(formData.get("operacion_id") ?? "");
  if (!id) return { error: "Falta la operación." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("confirmar_limpieza", {
    p_operacion_id: id,
    p_evidencia: String(formData.get("evidencia") ?? "") || null,
  });
  if (error) return { error: error.message };

  await supabase.from("eventos_auditoria").insert({
    actor_id: usuario.id,
    accion: "confirmar_limpieza",
    entidad: "operaciones_remotas",
    entidad_id: id,
    resultado: "ok",
  });

  refrescar();
  return { ok: "Retiro confirmado. El cupo vuelve a estar disponible." };
}

export async function recordatorioAction(
  _prev: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  if (!(await guard())) return { error: "No autorizado." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("fijar_recordatorio", {
    p_suscripcion_id: String(formData.get("suscripcion_id") ?? ""),
    p_fecha: String(formData.get("recontactar_el") ?? "") || null,
    p_nota: String(formData.get("nota") ?? "") || null,
  });
  if (error) return { error: error.message };

  refrescar();
  return { ok: "Recordatorio guardado." };
}
